// utils/manifestVoyageIntegration.ts
// Integration utilities for matching vessel manifests to voyage segments

import { VesselManifest, VoyageSegment, VoyageList } from '../types';
import { createVoyageSegments } from './voyageProcessing';

// Location name variations mapping
const LOCATION_VARIATIONS: Record<string, string[]> = {
  'Thunder Horse': ['Thunder Horse', 'Thunder Horse PDQ', 'Thunder Horse Prod', 'TH', 'THPDQ'],
  'Thunder Horse Drilling': ['Thunder Horse Drilling', 'TH Drilling', 'THD'],
  'Mad Dog': ['Mad Dog', 'Mad Dog Prod', 'MD', 'MD Prod'],
  'Mad Dog Drilling': ['Mad Dog Drilling', 'MD Drilling', 'MDD'],
  'Atlantis': ['Atlantis', 'Atlantis PQ', 'ATL'],
  'Na Kika': ['Na Kika', 'NK'],
  'Argos': ['Argos', 'ARGOS'],
  'Fourchon': ['Fourchon', 'Port Fourchon', 'PF']
};

// Standardize location namesnp for matching
export function standardizeLocationName(location: string | null): string {
  if (!location) return '';
  
  const trimmed = location.trim();
  
  // Check each canonical location
  for (const [canonical, variations] of Object.entries(LOCATION_VARIATIONS)) {
    if (variations.some(v => trimmed.toLowerCase().includes(v.toLowerCase()))) {
      return canonical;
    }
  }
  
  return trimmed;
}

// Match types for confidence scoring
export type MatchType = 'exact' | 'fuzzy' | 'temporal' | 'voyageOnly' | 'none';

// Match result interface
export interface ManifestSegmentMatch {
  manifestId: string;
  segment: VoyageSegment | null;
  confidence: number;
  matchType: MatchType;
  matchDetails: {
    locationMatch: boolean;
    temporalMatch: boolean;
    voyageIdMatch: boolean;
    suggestedLocation?: string;
  };
}

// Calculate time difference in hours
function getHoursDifference(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
}

// Match manifest to voyage segment
export function matchManifestToSegment(
  manifest: VesselManifest,
  voyageSegments: VoyageSegment[]
): ManifestSegmentMatch {
  const result: ManifestSegmentMatch = {
    manifestId: manifest.manifestNumber,
    segment: null,
    confidence: 0,
    matchType: 'none',
    matchDetails: {
      locationMatch: false,
      temporalMatch: false,
      voyageIdMatch: false
    }
  };

  // Filter segments by voyage ID if available
  const relevantSegments = manifest.voyageId 
    ? voyageSegments.filter(s => 
        s.uniqueVoyageId === manifest.voyageId || 
        s.standardizedVoyageId === manifest.voyageId
      )
    : voyageSegments;

  if (relevantSegments.length === 0) {
    return result;
  }

  result.matchDetails.voyageIdMatch = relevantSegments.length > 0;

  // Standardize manifest location
  const manifestLocation = standardizeLocationName(manifest.offshoreLocation);
  
  // Score each segment
  const scoredSegments = relevantSegments.map(segment => {
    let score = 0;
    let locationMatch = false;
    let temporalMatch = false;

    // Location matching (highest priority)
    const segmentDestination = standardizeLocationName(segment.destination);
    const segmentOrigin = standardizeLocationName(segment.origin);
    
    if (manifestLocation === segmentDestination) {
      score += 50;
      locationMatch = true;
    } else if (manifestLocation === segmentOrigin) {
      score += 30;
      locationMatch = true;
    } else if (segmentDestination.includes(manifestLocation) || manifestLocation.includes(segmentDestination)) {
      score += 20;
      locationMatch = true;
    }

    // Temporal matching (if manifest has date)
    if (manifest.manifestDate && segment.segmentDate) {
      const hoursDiff = getHoursDifference(
        new Date(manifest.manifestDate),
        new Date(segment.segmentDate)
      );
      
      if (hoursDiff < 24) {
        score += 30;
        temporalMatch = true;
      } else if (hoursDiff < 48) {
        score += 20;
        temporalMatch = true;
      } else if (hoursDiff < 72) {
        score += 10;
        temporalMatch = true;
      }
    }

    // Segment type bonus
    if (segment.segmentType === 'Outbound' && segment.originIsFourchon) {
      score += 10;
    }

    // Department matching bonus
    if (manifest.finalDepartment && segment.finalDepartment === manifest.finalDepartment) {
      score += 15;
    }

    return {
      segment,
      score,
      locationMatch,
      temporalMatch
    };
  });

  // Find best match
  const bestMatch = scoredSegments.reduce((best, current) => 
    current.score > best.score ? current : best
  );

  if (bestMatch.score > 0) {
    result.segment = bestMatch.segment;
    result.confidence = Math.min(bestMatch.score, 100);
    result.matchDetails.locationMatch = bestMatch.locationMatch;
    result.matchDetails.temporalMatch = bestMatch.temporalMatch;
    
    // Determine match type
    if (bestMatch.locationMatch && bestMatch.temporalMatch) {
      result.matchType = 'exact';
    } else if (bestMatch.locationMatch) {
      result.matchType = 'fuzzy';
    } else if (bestMatch.temporalMatch) {
      result.matchType = 'temporal';
    } else {
      result.matchType = 'voyageOnly';
    }

    // Add suggested location if no location match
    if (!bestMatch.locationMatch && bestMatch.segment) {
      result.matchDetails.suggestedLocation = bestMatch.segment.destination;
    }
  }

  return result;
}

// Batch match manifests to voyage segments
export function matchManifestsToVoyage(
  manifests: VesselManifest[],
  voyage: VoyageList
): Map<string, ManifestSegmentMatch> {
  const segments = createVoyageSegments(voyage);
  const matches = new Map<string, ManifestSegmentMatch>();

  for (const manifest of manifests) {
    const match = matchManifestToSegment(manifest, segments);
    matches.set(manifest.manifestNumber, match);
  }

  return matches;
}

// Enhanced manifest with segment data
export interface EnhancedManifest extends VesselManifest {
  voyageSegmentId?: string;
  segmentDestination?: string;
  segmentDepartment?: string;
  manifestTimeOffset?: number;
  matchConfidence?: number;
  matchType?: MatchType;
  suggestedLocation?: string;
  validatedDepartment?: string;
}

// Enhance manifest with voyage segment data
export function enhanceManifestWithSegmentData(
  manifest: VesselManifest,
  segments: VoyageSegment[]
): EnhancedManifest {
  const match = matchManifestToSegment(manifest, segments);
  const enhanced: EnhancedManifest = { ...manifest };

  if (match.segment) {
    enhanced.voyageSegmentId = `${match.segment.uniqueVoyageId}_${match.segment.segmentNumber}`;
    enhanced.segmentDestination = match.segment.destination;
    enhanced.segmentDepartment = match.segment.finalDepartment;
    enhanced.matchConfidence = match.confidence;
    enhanced.matchType = match.matchType;
    
    // Calculate time offset from voyage start
    if (manifest.manifestDate && match.segment.voyageStartDate) {
      const manifestTime = new Date(manifest.manifestDate).getTime();
      const voyageStartTime = new Date(match.segment.voyageStartDate).getTime();
      enhanced.manifestTimeOffset = (manifestTime - voyageStartTime) / (1000 * 60 * 60); // hours
    }

    // Validate/suggest department
    if (match.segment.finalDepartment && match.segment.finalDepartment !== 'Other') {
      enhanced.validatedDepartment = match.segment.finalDepartment;
    }

    // Add suggested location if needed
    if (match.matchDetails.suggestedLocation) {
      enhanced.suggestedLocation = match.matchDetails.suggestedLocation;
    }
  }

  return enhanced;
}

// Validation result interface
export interface ManifestValidation {
  manifestId: string;
  validations: {
    hasMatchingVoyage: boolean;
    departmentConsistency: boolean;
    locationInVoyageRoute: boolean;
    costCodeValid: boolean;
    temporalAlignment: boolean;
  };
  suggestions: {
    likelyDepartment?: string;
    suggestedLocation?: string;
    alternativeCostCode?: string;
    confidence: number;
  };
  issues: string[];
}

// Validate manifest against voyage data
export function validateManifestWithVoyage(
  manifest: EnhancedManifest,
  voyage: VoyageList | null
): ManifestValidation {
  const validation: ManifestValidation = {
    manifestId: manifest.manifestNumber,
    validations: {
      hasMatchingVoyage: false,
      departmentConsistency: true,
      locationInVoyageRoute: false,
      costCodeValid: manifest.costCodeMatchFound || false,
      temporalAlignment: true
    },
    suggestions: {
      confidence: 0
    },
    issues: []
  };

  // Check voyage match
  if (!voyage) {
    validation.issues.push('No matching voyage found');
    return validation;
  }

  validation.validations.hasMatchingVoyage = true;

  // Check location in voyage route
  if (voyage.locationList && manifest.offshoreLocation) {
    const standardizedManifestLoc = standardizeLocationName(manifest.offshoreLocation);
    const voyageLocations = voyage.locationList.map(loc => standardizeLocationName(loc));
    
    validation.validations.locationInVoyageRoute = voyageLocations.includes(standardizedManifestLoc);
    
    if (!validation.validations.locationInVoyageRoute) {
      validation.issues.push(`Location "${manifest.offshoreLocation}" not found in voyage route`);
      
      // Suggest closest location
      if (manifest.suggestedLocation) {
        validation.suggestions.suggestedLocation = manifest.suggestedLocation;
        validation.suggestions.confidence = manifest.matchConfidence || 0;
      }
    }
  }

  // Check department consistency
  if (manifest.validatedDepartment && manifest.finalDepartment) {
    validation.validations.departmentConsistency = 
      manifest.validatedDepartment === manifest.finalDepartment;
    
    if (!validation.validations.departmentConsistency) {
      validation.issues.push(
        `Department mismatch: manifest says "${manifest.finalDepartment}", voyage suggests "${manifest.validatedDepartment}"`
      );
      validation.suggestions.likelyDepartment = manifest.validatedDepartment;
    }
  }

  // Check temporal alignment
  if (manifest.manifestTimeOffset !== undefined && voyage.durationHours !== undefined) {
    // Flag if manifest is more than 48 hours outside voyage window
    if (manifest.manifestTimeOffset < -48 || manifest.manifestTimeOffset > voyage.durationHours + 48) {
      validation.validations.temporalAlignment = false;
      validation.issues.push('Manifest date is outside expected voyage timeframe');
    }
  }

  // Overall confidence
  const validationCount = Object.values(validation.validations).filter(v => v).length;
  validation.suggestions.confidence = (validationCount / 5) * 100;

  return validation;
}

// Summary statistics for integration quality
export interface IntegrationStats {
  totalManifests: number;
  matchedManifests: number;
  matchTypes: Record<MatchType, number>;
  averageConfidence: number;
  departmentMismatches: number;
  locationMismatches: number;
  validationIssues: Record<string, number>;
}

// Calculate integration statistics
export function calculateIntegrationStats(
  manifests: EnhancedManifest[],
  validations: ManifestValidation[]
): IntegrationStats {
  const stats: IntegrationStats = {
    totalManifests: manifests.length,
    matchedManifests: 0,
    matchTypes: {
      exact: 0,
      fuzzy: 0,
      temporal: 0,
      voyageOnly: 0,
      none: 0
    },
    averageConfidence: 0,
    departmentMismatches: 0,
    locationMismatches: 0,
    validationIssues: {}
  };

  // Count matches and types
  let totalConfidence = 0;
  for (const manifest of manifests) {
    if (manifest.matchType && manifest.matchType !== 'none') {
      stats.matchedManifests++;
    }
    
    stats.matchTypes[manifest.matchType || 'none']++;
    totalConfidence += manifest.matchConfidence || 0;
  }

  stats.averageConfidence = manifests.length > 0 
    ? totalConfidence / manifests.length 
    : 0;

  // Count validation issues
  for (const validation of validations) {
    if (!validation.validations.departmentConsistency) {
      stats.departmentMismatches++;
    }
    if (!validation.validations.locationInVoyageRoute) {
      stats.locationMismatches++;
    }
    
    // Count issue types
    for (const issue of validation.issues) {
      const issueType = issue.split(':')[0];
      stats.validationIssues[issueType] = (stats.validationIssues[issueType] || 0) + 1;
    }
  }

  return stats;
}