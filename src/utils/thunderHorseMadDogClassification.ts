import { VoyageList, VesselManifest } from '../types';

/**
 * Simple Thunder Horse & Mad Dog voyage classification
 * Uses manifests to separate drilling from production for these two locations only
 */

interface ThunderHorseMadDogClassification {
  thunderHorse: {
    drilling: number;
    production: number;
    total: number;
  };
  madDog: {
    drilling: number;
    production: number;
    total: number;
  };
  debug: {
    thunderHorseManifests: Array<{
      vessel: string;
      location: string;
      date: Date;
      classification: 'Drilling' | 'Production' | 'Unknown';
    }>;
    madDogManifests: Array<{
      vessel: string;
      location: string;
      date: Date;
      classification: 'Drilling' | 'Production' | 'Unknown';
    }>;
  };
}

/**
 * Classify manifest as drilling or production based on location name
 */
const classifyManifestByLocation = (offshoreLocation: string): 'Drilling' | 'Production' | 'Unknown' => {
  if (!offshoreLocation) return 'Unknown';
  
  const location = offshoreLocation.toLowerCase().trim();
  
  // Thunder Horse & Mad Dog production patterns
  if (location.includes('thunder horse prod') || 
      location.includes('mad dog prod') ||
      location.includes('production')) {
    return 'Production';
  }
  
  // Thunder Horse & Mad Dog drilling patterns  
  if (location.includes('thunder horse drilling') || 
      location.includes('mad dog drilling') ||
      location.includes('drilling')) {
    return 'Drilling';
  }
  
  return 'Unknown';
};

/**
 * Check if voyage visits Thunder Horse or Mad Dog
 */
const getVoyageLocationInfo = (voyage: VoyageList) => {
  const locations = voyage.locations?.toLowerCase() || '';
  const locationList = voyage.locationList?.map(l => l.toLowerCase()) || [];
  
  const visitsThunderHorse = locations.includes('thunder horse') || 
                            locationList.some(l => l.includes('thunder horse'));
  const visitsMadDog = locations.includes('mad dog') || 
                      locationList.some(l => l.includes('mad dog'));
  
  return { visitsThunderHorse, visitsMadDog };
};

/**
 * Find manifests that match voyage by vessel and time window
 */
const findMatchingManifests = (voyage: VoyageList, manifests: VesselManifest[]): VesselManifest[] => {
  return manifests.filter(manifest => {
    // Vessel matching
    const manifestVessel = manifest.transporter?.toLowerCase().trim() || '';
    const voyageVessel = voyage.vessel?.toLowerCase().trim() || '';
    
    if (manifestVessel !== voyageVessel) return false;
    
    // Time window matching (within 2 days of voyage start)
    const voyageStart = voyage.startDate;
    const manifestDate = manifest.manifestDate;
    
    if (!voyageStart || !manifestDate) return false;
    
    const timeDiff = Math.abs(manifestDate.getTime() - voyageStart.getTime());
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    
    return timeDiff <= twoDaysInMs;
  });
};

/**
 * Classify Thunder Horse and Mad Dog voyages using manifest data
 */
export const classifyThunderHorseAndMadDogVoyages = (
  voyages: VoyageList[],
  manifests: VesselManifest[]
): ThunderHorseMadDogClassification => {
  
  const results = {
    thunderHorse: { drilling: 0, production: 0, total: 0 },
    madDog: { drilling: 0, production: 0, total: 0 },
    debug: { thunderHorseManifests: [], madDogManifests: [] }
  } as ThunderHorseMadDogClassification;
  
  // Process each voyage
  voyages.forEach(voyage => {
    const { visitsThunderHorse, visitsMadDog } = getVoyageLocationInfo(voyage);
    
    // Only process Thunder Horse and Mad Dog voyages
    if (!visitsThunderHorse && !visitsMadDog) return;
    
    // Find matching manifests for this voyage
    const matchingManifests = findMatchingManifests(voyage, manifests);
    
    // Process Thunder Horse voyages
    if (visitsThunderHorse) {
      results.thunderHorse.total++;
      
      // Look for Thunder Horse specific manifests
      const thunderHorseManifests = matchingManifests.filter(m =>
        m.offshoreLocation?.toLowerCase().includes('thunder horse')
      );
      
      if (thunderHorseManifests.length > 0) {
        // Classify based on manifest locations
        const productionManifests = thunderHorseManifests.filter(m =>
          classifyManifestByLocation(m.offshoreLocation || '') === 'Production'
        );
        const drillingManifests = thunderHorseManifests.filter(m =>
          classifyManifestByLocation(m.offshoreLocation || '') === 'Drilling'
        );
        
        // Add to debug info
        thunderHorseManifests.forEach(m => {
          results.debug.thunderHorseManifests.push({
            vessel: m.transporter || '',
            location: m.offshoreLocation || '',
            date: m.manifestDate,
            classification: classifyManifestByLocation(m.offshoreLocation || '')
          });
        });
        
        // FIXED: Only count if we have clear drilling or production manifests
        if (drillingManifests.length > 0 && productionManifests.length === 0) {
          // Pure drilling voyage
          results.thunderHorse.drilling++;
        } else if (productionManifests.length > 0 && drillingManifests.length === 0) {
          // Pure production voyage
          results.thunderHorse.production++;
        } else if (drillingManifests.length > 0 && productionManifests.length > 0) {
          // Mixed voyage - classify based on predominant activity
          if (drillingManifests.length > productionManifests.length) {
            results.thunderHorse.drilling++;
          } else {
            results.thunderHorse.production++;
          }
        } else {
          // All manifests are 'Unknown' classification - don't count this voyage
          console.log(`⚠️ THUNDER HORSE VOYAGE EXCLUDED - No clear drilling/production manifests:`, {
            vessel: voyage.vessel,
            thunderHorseManifests: thunderHorseManifests.map(m => ({
              location: m.offshoreLocation,
              classification: classifyManifestByLocation(m.offshoreLocation || '')
            }))
          });
          results.thunderHorse.total--; // Remove from total count since we're not classifying it
        }
      } else {
        // FIXED: No Thunder Horse manifests found - don't count this voyage at all
        console.log(`⚠️ THUNDER HORSE VOYAGE EXCLUDED - No Thunder Horse manifests found:`, {
          vessel: voyage.vessel,
          voyageLocations: voyage.locations,
          availableManifests: matchingManifests.map(m => m.offshoreLocation)
        });
        results.thunderHorse.total--; // Remove from total count since we're not classifying it
      }
    }
    
    // Process Mad Dog voyages (same logic)
    if (visitsMadDog) {
      results.madDog.total++;
      
      const madDogManifests = matchingManifests.filter(m =>
        m.offshoreLocation?.toLowerCase().includes('mad dog')
      );
      
      if (madDogManifests.length > 0) {
        const productionManifests = madDogManifests.filter(m =>
          classifyManifestByLocation(m.offshoreLocation || '') === 'Production'
        );
        const drillingManifests = madDogManifests.filter(m =>
          classifyManifestByLocation(m.offshoreLocation || '') === 'Drilling'
        );
        
        // Add to debug info
        madDogManifests.forEach(m => {
          results.debug.madDogManifests.push({
            vessel: m.transporter || '',
            location: m.offshoreLocation || '',
            date: m.manifestDate,
            classification: classifyManifestByLocation(m.offshoreLocation || '')
          });
        });
        
        // FIXED: Only count if we have clear drilling or production manifests
        if (drillingManifests.length > 0 && productionManifests.length === 0) {
          // Pure drilling voyage
          results.madDog.drilling++;
        } else if (productionManifests.length > 0 && drillingManifests.length === 0) {
          // Pure production voyage
          results.madDog.production++;
        } else if (drillingManifests.length > 0 && productionManifests.length > 0) {
          // Mixed voyage - classify based on predominant activity
          if (drillingManifests.length > productionManifests.length) {
            results.madDog.drilling++;
          } else {
            results.madDog.production++;
          }
        } else {
          // All manifests are 'Unknown' classification - don't count this voyage
          console.log(`⚠️ MAD DOG VOYAGE EXCLUDED - No clear drilling/production manifests:`, {
            vessel: voyage.vessel,
            madDogManifests: madDogManifests.map(m => ({
              location: m.offshoreLocation,
              classification: classifyManifestByLocation(m.offshoreLocation || '')
            }))
          });
          results.madDog.total--; // Remove from total count since we're not classifying it
        }
      } else {
        // FIXED: No Mad Dog manifests found - don't count this voyage at all
        console.log(`⚠️ MAD DOG VOYAGE EXCLUDED - No Mad Dog manifests found:`, {
          vessel: voyage.vessel,
          voyageLocations: voyage.locations,
          availableManifests: matchingManifests.map(m => m.offshoreLocation)
        });
        results.madDog.total--; // Remove from total count since we're not classifying it
      }
    }
  });
  
  // Log results
  console.log('🎯 THUNDER HORSE & MAD DOG MANIFEST CLASSIFICATION:', {
    thunderHorse: {
      total: results.thunderHorse.total,
      drilling: results.thunderHorse.drilling,
      production: results.thunderHorse.production,
      drillingPercentage: results.thunderHorse.total > 0 ? 
        (results.thunderHorse.drilling / results.thunderHorse.total * 100).toFixed(1) + '%' : '0%'
    },
    madDog: {
      total: results.madDog.total,
      drilling: results.madDog.drilling,
      production: results.madDog.production,
      drillingPercentage: results.madDog.total > 0 ? 
        (results.madDog.drilling / results.madDog.total * 100).toFixed(1) + '%' : '0%'
    },
    manifestsFound: {
      thunderHorse: results.debug.thunderHorseManifests.length,
      madDog: results.debug.madDogManifests.length
    }
  });
  
  return results;
};

/**
 * Get drilling-only voyage count for Thunder Horse
 */
export const getThunderHorseDrillingVoyages = (
  voyages: VoyageList[],
  manifests: VesselManifest[]
): number => {
  const classification = classifyThunderHorseAndMadDogVoyages(voyages, manifests);
  return classification.thunderHorse.drilling;
};

/**
 * Get drilling-only voyage count for Mad Dog
 */
export const getMadDogDrillingVoyages = (
  voyages: VoyageList[],
  manifests: VesselManifest[]
): number => {
  const classification = classifyThunderHorseAndMadDogVoyages(voyages, manifests);
  return classification.madDog.drilling;
};