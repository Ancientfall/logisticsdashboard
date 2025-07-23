import { VoyageList, VesselManifest } from '../types';

/**
 * Manifest-based voyage classification utility
 * Uses manifest data to determine if voyages are drilling, production, or mixed
 */

export interface VoyageClassificationResult {
  voyageId: string;
  vessel: string;
  classification: 'Drilling' | 'Production' | 'Mixed' | 'Unclassified';
  confidence: 'High' | 'Medium' | 'Low';
  manifestCount: number;
  productionManifests: number;
  drillingManifests: number;
  manifestDetails: Array<{
    offshoreLocation: string;
    manifestDate: Date;
    classification: 'Production' | 'Drilling' | 'Unknown';
  }>;
}

/**
 * Check if dates are within a reasonable time window
 */
const isWithinTimeWindow = (manifestDate: Date, voyageStart: Date, voyageEnd?: Date, bufferHours: number = 24): boolean => {
  const manifestTime = manifestDate.getTime();
  const startTime = voyageStart.getTime() - (bufferHours * 60 * 60 * 1000); // Buffer before voyage
  
  let endTime: number;
  if (voyageEnd) {
    endTime = voyageEnd.getTime() + (bufferHours * 60 * 60 * 1000); // Buffer after voyage
  } else {
    // If no end date, assume 7 days max voyage duration
    endTime = voyageStart.getTime() + (7 * 24 * 60 * 60 * 1000) + (bufferHours * 60 * 60 * 1000);
  }
  
  return manifestTime >= startTime && manifestTime <= endTime;
};

/**
 * Classify a manifest location as drilling, production, or unknown
 */
const classifyManifestLocation = (offshoreLocation: string): 'Production' | 'Drilling' | 'Unknown' => {
  if (!offshoreLocation) return 'Unknown';
  
  const location = offshoreLocation.toLowerCase().trim();
  
  // Production location patterns
  const productionPatterns = [
    'thunder horse prod',
    'mad dog prod', 
    'atlantis',
    'na kika',
    'argos',
    'production',
    'prod'
  ];
  
  // Drilling location patterns  
  const drillingPatterns = [
    'thunder horse drilling',
    'mad dog drilling',
    'drilling',
    'blackhornet',
    'blacklion',
    'stena icemax',
    'ocean blacktip',
    'island venture',
    'deepwater invictus'
  ];
  
  // Check production patterns first (more specific)
  if (productionPatterns.some(pattern => location.includes(pattern))) {
    return 'Production';
  }
  
  // Check drilling patterns
  if (drillingPatterns.some(pattern => location.includes(pattern))) {
    return 'Drilling';
  }
  
  return 'Unknown';
};

/**
 * Classify a single voyage based on its associated manifests
 */
export const classifyVoyageByManifests = (
  voyage: VoyageList, 
  manifests: VesselManifest[]
): VoyageClassificationResult => {
  
  // Find manifests for this voyage (vessel + time window matching)
  const voyageManifests = manifests.filter(manifest => {
    // Vessel name matching (case-insensitive, handle variations)
    const manifestVessel = manifest.transporter.toLowerCase().trim();
    const voyageVessel = voyage.vessel.toLowerCase().trim();
    
    const vesselMatches = manifestVessel === voyageVessel ||
                         manifestVessel.includes(voyageVessel) ||
                         voyageVessel.includes(manifestVessel);
    
    if (!vesselMatches) return false;
    
    // Time window matching
    return isWithinTimeWindow(manifest.manifestDate, voyage.startDate, voyage.endDate);
  });
  
  // Classify each manifest
  const manifestDetails = voyageManifests.map(manifest => ({
    offshoreLocation: manifest.offshoreLocation || '',
    manifestDate: manifest.manifestDate,
    classification: classifyManifestLocation(manifest.offshoreLocation || '')
  }));
  
  // Count classifications
  const productionManifests = manifestDetails.filter(m => m.classification === 'Production').length;
  const drillingManifests = manifestDetails.filter(m => m.classification === 'Drilling').length;
  const unknownManifests = manifestDetails.filter(m => m.classification === 'Unknown').length;
  
  // Determine overall classification
  let classification: 'Drilling' | 'Production' | 'Mixed' | 'Unclassified';
  let confidence: 'High' | 'Medium' | 'Low';
  
  if (voyageManifests.length === 0) {
    classification = 'Unclassified';
    confidence = 'Low';
  } else if (productionManifests > 0 && drillingManifests > 0) {
    classification = 'Mixed';
    confidence = 'High';
  } else if (productionManifests > drillingManifests) {
    classification = 'Production';
    confidence = unknownManifests === 0 ? 'High' : unknownManifests < productionManifests ? 'Medium' : 'Low';
  } else if (drillingManifests > productionManifests) {
    classification = 'Drilling';
    confidence = unknownManifests === 0 ? 'High' : unknownManifests < drillingManifests ? 'Medium' : 'Low';
  } else {
    // All unknown or equal counts
    classification = 'Unclassified';
    confidence = 'Low';
  }
  
  return {
    voyageId: voyage.standardizedVoyageId,
    vessel: voyage.vessel,
    classification,
    confidence,
    manifestCount: voyageManifests.length,
    productionManifests,
    drillingManifests,
    manifestDetails
  };
};

/**
 * Classify all voyages based on manifests
 */
export const classifyAllVoyagesByManifests = (
  voyages: VoyageList[], 
  manifests: VesselManifest[]
): VoyageClassificationResult[] => {
  
  const results = voyages.map(voyage => classifyVoyageByManifests(voyage, manifests));
  
  // Log summary statistics
  const stats = {
    total: results.length,
    drilling: results.filter(r => r.classification === 'Drilling').length,
    production: results.filter(r => r.classification === 'Production').length,
    mixed: results.filter(r => r.classification === 'Mixed').length,
    unclassified: results.filter(r => r.classification === 'Unclassified').length,
    highConfidence: results.filter(r => r.confidence === 'High').length,
    withManifests: results.filter(r => r.manifestCount > 0).length
  };
  
  console.log('🎯 MANIFEST-BASED VOYAGE CLASSIFICATION RESULTS:', {
    totalVoyages: stats.total,
    drilling: `${stats.drilling} (${(stats.drilling/stats.total*100).toFixed(1)}%)`,
    production: `${stats.production} (${(stats.production/stats.total*100).toFixed(1)}%)`,
    mixed: `${stats.mixed} (${(stats.mixed/stats.total*100).toFixed(1)}%)`,
    unclassified: `${stats.unclassified} (${(stats.unclassified/stats.total*100).toFixed(1)}%)`,
    highConfidence: `${stats.highConfidence} (${(stats.highConfidence/stats.total*100).toFixed(1)}%)`,
    voyagesWithManifests: `${stats.withManifests} (${(stats.withManifests/stats.total*100).toFixed(1)}%)`
  });
  
  return results;
};

/**
 * Get drilling voyages only using manifest-based classification
 */
export const getDrillingVoyagesByManifests = (
  voyages: VoyageList[], 
  manifests: VesselManifest[],
  includeHighConfidenceOnly: boolean = false
): VoyageList[] => {
  
  const classifications = classifyAllVoyagesByManifests(voyages, manifests);
  
  const drillingClassifications = classifications.filter(result => 
    result.classification === 'Drilling' &&
    (!includeHighConfidenceOnly || result.confidence === 'High')
  );
  
  const drillingVoyageIds = new Set(drillingClassifications.map(r => r.voyageId));
  
  return voyages.filter(voyage => drillingVoyageIds.has(voyage.standardizedVoyageId));
};

/**
 * Get production voyages only using manifest-based classification
 */
export const getProductionVoyagesByManifests = (
  voyages: VoyageList[], 
  manifests: VesselManifest[],
  includeHighConfidenceOnly: boolean = false
): VoyageList[] => {
  
  const classifications = classifyAllVoyagesByManifests(voyages, manifests);
  
  const productionClassifications = classifications.filter(result => 
    result.classification === 'Production' &&
    (!includeHighConfidenceOnly || result.confidence === 'High')
  );
  
  const productionVoyageIds = new Set(productionClassifications.map(r => r.voyageId));
  
  return voyages.filter(voyage => productionVoyageIds.has(voyage.standardizedVoyageId));
};

/**
 * Filter voyages by location and activity type using manifest classification
 */
export const filterVoyagesByLocationAndActivity = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  locationFilter: string,
  activityType: 'Drilling' | 'Production'
): VoyageList[] => {
  
  // First filter by location (Thunder Horse or Mad Dog)
  const locationFilteredVoyages = voyages.filter(voyage => {
    if (locationFilter === 'All Locations') return true;
    
    // Handle specific location filters
    if (locationFilter.includes('Thunder Horse')) {
      return voyage.locationList.some(loc => 
        loc.toLowerCase().includes('thunder horse')
      );
    } else if (locationFilter.includes('Mad Dog')) {
      return voyage.locationList.some(loc => 
        loc.toLowerCase().includes('mad dog')
      );
    }
    
    // Generic location matching
    return voyage.locationList.some(loc => 
      loc.toLowerCase().includes(locationFilter.toLowerCase())
    );
  });
  
  // Then filter by activity type using manifest classification
  if (activityType === 'Drilling') {
    return getDrillingVoyagesByManifests(locationFilteredVoyages, manifests);
  } else {
    return getProductionVoyagesByManifests(locationFilteredVoyages, manifests);
  }
};