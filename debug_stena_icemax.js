// Debug script for Stena IceMAX voyages in May 2025
// This script will help identify discrepancies in voyage count

const analyzeStenaIceMAXVoyages = (voyageList) => {
  console.log('🔍 === STENA ICEMAX VOYAGE ANALYSIS ===');
  
  // Filter for Stena IceMAX voyages
  const stenaVoyages = voyageList.filter(voyage => 
    voyage.vessel && voyage.vessel.toLowerCase().includes('stena') && 
    voyage.vessel.toLowerCase().includes('icemax')
  );
  
  console.log(`Total Stena IceMAX voyages found: ${stenaVoyages.length}`);
  
  // Filter for May 2025 specifically
  const may2025Voyages = stenaVoyages.filter(voyage => {
    if (!voyage.voyageDate) return false;
    const date = new Date(voyage.voyageDate);
    return date.getFullYear() === 2025 && date.getMonth() === 4; // May is month 4 (0-based)
  });
  
  console.log(`Stena IceMAX voyages in May 2025: ${may2025Voyages.length}`);
  
  // Also check using the month name filter logic from the dashboard
  const monthLabelFilter = may2025Voyages.filter(voyage => {
    if (!voyage.voyageDate) return false;
    const itemDate = new Date(voyage.voyageDate);
    const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
    return monthLabel === 'May 2025';
  });
  
  console.log(`Using month label filter: ${monthLabelFilter.length}`);
  
  // Group by voyage numbers to check for duplicates
  const voyageNumbers = may2025Voyages.map(v => v.voyageNumber);
  const uniqueVoyageNumbers = new Set(voyageNumbers);
  
  console.log(`Unique voyage numbers: ${uniqueVoyageNumbers.size}`);
  console.log(`Total voyage records: ${may2025Voyages.length}`);
  
  if (uniqueVoyageNumbers.size !== may2025Voyages.length) {
    console.log('⚠️ Potential duplicates found!');
  }
  
  // Show detailed breakdown
  console.log('\n📋 VOYAGE DETAILS:');
  may2025Voyages.forEach((voyage, index) => {
    console.log(`${index + 1}. Voyage ${voyage.voyageNumber} - ${voyage.voyageDate?.toISOString().substring(0, 10)} - ${voyage.locations}`);
  });
  
  // Check date parsing issues
  console.log('\n📅 DATE ANALYSIS:');
  const dateIssues = may2025Voyages.filter(voyage => !voyage.voyageDate);
  console.log(`Voyages with missing dates: ${dateIssues.length}`);
  
  // Check if there are voyages with different date fields
  console.log('\n🔍 DATE FIELD ANALYSIS:');
  if (may2025Voyages.length > 0) {
    const sample = may2025Voyages[0];
    console.log('Sample voyage date fields:', {
      voyageDate: sample.voyageDate,
      startDate: sample.startDate,
      endDate: sample.endDate,
      month: sample.month,
      year: sample.year
    });
  }
  
  console.log('🔍 === END ANALYSIS ===\n');
  
  return {
    totalStenaVoyages: stenaVoyages.length,
    may2025Count: may2025Voyages.length,
    monthLabelFilterCount: monthLabelFilter.length,
    uniqueVoyageNumbers: uniqueVoyageNumbers.size,
    voyageDetails: may2025Voyages
  };
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.debugStenaIceMAX = analyzeStenaIceMAXVoyages;
  console.log('🛠️ Debug function added to window: window.debugStenaIceMAX(voyageList)');
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyzeStenaIceMAXVoyages;
}