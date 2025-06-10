// Test utility for manifest-voyage integration
// Run this after data is loaded to validate the integration improvements

import { VesselManifest, VoyageList, VoyageSegment } from '../../types';
import { 
  matchManifestToSegment, 
  calculateIntegrationStats,
  validateManifestWithVoyage,
  EnhancedManifest
} from '../manifestVoyageIntegration';
import { createVoyageSegments } from '../voyageProcessing';

interface IntegrationTestResults {
  totalManifests: number;
  totalVoyages: number;
  totalSegments: number;
  matchResults: {
    exact: number;
    fuzzy: number;
    temporal: number;
    voyageOnly: number;
    none: number;
  };
  averageConfidence: number;
  departmentMismatches: number;
  locationMismatches: number;
  topIssues: { issue: string; count: number }[];
  sampleImprovedMatches: {
    manifestNumber: string;
    originalLocation: string;
    suggestedLocation: string;
    originalDepartment: string;
    validatedDepartment: string;
    confidence: number;
  }[];
}

export function runIntegrationTest(
  manifests: VesselManifest[],
  voyages: VoyageList[]
): IntegrationTestResults {
  console.log('🧪 Running manifest-voyage integration test...');
  
  // Create all voyage segments
  const allSegments = voyages.flatMap(voyage => createVoyageSegments(voyage));
  
  // Enhance manifests with segment data
  const enhancedManifests: EnhancedManifest[] = [];
  const validations: any[] = [];
  
  // Group segments by voyage for efficient lookup
  const segmentsByVoyage = new Map<string, VoyageSegment[]>();
  allSegments.forEach(segment => {
    const ids = [segment.uniqueVoyageId, segment.standardizedVoyageId];
    ids.forEach(id => {
      if (!segmentsByVoyage.has(id)) {
        segmentsByVoyage.set(id, []);
      }
      segmentsByVoyage.get(id)!.push(segment);
    });
  });
  
  // Process each manifest
  manifests.forEach(manifest => {
    const relevantSegments = segmentsByVoyage.get(manifest.voyageId) || 
                           segmentsByVoyage.get(manifest.standardizedVoyageId) || 
                           [];
    
    const match = matchManifestToSegment(manifest, relevantSegments);
    const enhanced: EnhancedManifest = {
      ...manifest,
      voyageSegmentId: match.segment ? `${match.segment.uniqueVoyageId}_${match.segment.segmentNumber}` : undefined,
      segmentDestination: match.segment?.destination,
      segmentDepartment: match.segment?.finalDepartment,
      matchConfidence: match.confidence,
      matchType: match.matchType,
      suggestedLocation: match.matchDetails.suggestedLocation,
      validatedDepartment: match.segment?.finalDepartment
    };
    
    enhancedManifests.push(enhanced);
    
    // Validate against voyage
    const voyage = voyages.find(v => 
      v.uniqueVoyageId === manifest.voyageId || 
      v.standardizedVoyageId === manifest.voyageId
    );
    
    if (voyage) {
      const validation = validateManifestWithVoyage(enhanced, voyage);
      validations.push(validation);
    }
  });
  
  // Calculate statistics
  const stats = calculateIntegrationStats(enhancedManifests, validations);
  
  // Find sample improved matches
  const improvedMatches = enhancedManifests
    .filter(m => 
      m.matchConfidence && 
      m.matchConfidence > 50 && 
      m.validatedDepartment && 
      m.validatedDepartment !== m.finalDepartment
    )
    .slice(0, 10)
    .map(m => ({
      manifestNumber: m.manifestNumber,
      originalLocation: m.offshoreLocation,
      suggestedLocation: m.suggestedLocation || m.segmentDestination || '',
      originalDepartment: m.finalDepartment || 'Unknown',
      validatedDepartment: m.validatedDepartment || 'Unknown',
      confidence: m.matchConfidence || 0
    }));
  
  // Count top issues
  const issueCount = new Map<string, number>();
  validations.forEach(v => {
    v.issues.forEach((issue: string) => {
      const key = issue.split(':')[0];
      issueCount.set(key, (issueCount.get(key) || 0) + 1);
    });
  });
  
  const topIssues = Array.from(issueCount.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const results: IntegrationTestResults = {
    totalManifests: manifests.length,
    totalVoyages: voyages.length,
    totalSegments: allSegments.length,
    matchResults: stats.matchTypes,
    averageConfidence: Math.round(stats.averageConfidence),
    departmentMismatches: stats.departmentMismatches,
    locationMismatches: stats.locationMismatches,
    topIssues,
    sampleImprovedMatches: improvedMatches
  };
  
  // Log summary
  console.log('📊 Integration Test Results:');
  console.log(`Total Manifests: ${results.totalManifests}`);
  console.log(`Total Voyages: ${results.totalVoyages}`);
  console.log(`Total Segments: ${results.totalSegments}`);
  console.log('\nMatch Results:');
  console.log(`  Exact: ${results.matchResults.exact}`);
  console.log(`  Fuzzy: ${results.matchResults.fuzzy}`);
  console.log(`  Temporal: ${results.matchResults.temporal}`);
  console.log(`  Voyage Only: ${results.matchResults.voyageOnly}`);
  console.log(`  No Match: ${results.matchResults.none}`);
  console.log(`\nAverage Confidence: ${results.averageConfidence}%`);
  console.log(`Department Mismatches: ${results.departmentMismatches}`);
  console.log(`Location Mismatches: ${results.locationMismatches}`);
  
  if (results.sampleImprovedMatches.length > 0) {
    console.log('\n🎯 Sample Improved Matches:');
    results.sampleImprovedMatches.forEach(match => {
      console.log(`  Manifest ${match.manifestNumber}:`);
      console.log(`    Location: ${match.originalLocation} → ${match.suggestedLocation}`);
      console.log(`    Department: ${match.originalDepartment} → ${match.validatedDepartment}`);
      console.log(`    Confidence: ${match.confidence}%`);
    });
  }
  
  return results;
}

// Helper function to display results in dashboard
export function formatIntegrationTestResults(results: IntegrationTestResults): string {
  const matchRate = ((results.matchResults.exact + results.matchResults.fuzzy) / results.totalManifests * 100).toFixed(1);
  
  return `
## Manifest-Voyage Integration Test Results

### Summary
- **Total Manifests**: ${results.totalManifests.toLocaleString()}
- **Total Voyages**: ${results.totalVoyages.toLocaleString()}
- **Total Segments**: ${results.totalSegments.toLocaleString()}
- **Match Rate**: ${matchRate}% (Exact + Fuzzy matches)
- **Average Confidence**: ${results.averageConfidence}%

### Match Quality
- **Exact Matches**: ${results.matchResults.exact} (${(results.matchResults.exact / results.totalManifests * 100).toFixed(1)}%)
- **Fuzzy Matches**: ${results.matchResults.fuzzy} (${(results.matchResults.fuzzy / results.totalManifests * 100).toFixed(1)}%)
- **Temporal Only**: ${results.matchResults.temporal} (${(results.matchResults.temporal / results.totalManifests * 100).toFixed(1)}%)
- **Voyage Only**: ${results.matchResults.voyageOnly} (${(results.matchResults.voyageOnly / results.totalManifests * 100).toFixed(1)}%)
- **No Match**: ${results.matchResults.none} (${(results.matchResults.none / results.totalManifests * 100).toFixed(1)}%)

### Data Quality Issues
- **Department Mismatches**: ${results.departmentMismatches}
- **Location Mismatches**: ${results.locationMismatches}

### Top Issues
${results.topIssues.map(issue => `- ${issue.issue}: ${issue.count} occurrences`).join('\n')}

### Improvements Found
${results.sampleImprovedMatches.length > 0 ? 
  results.sampleImprovedMatches.slice(0, 5).map(m => 
    `- Manifest ${m.manifestNumber}: ${m.originalDepartment} → ${m.validatedDepartment} (${m.confidence}% confidence)`
  ).join('\n') : 
  'No department improvements found with high confidence'}
`;
}