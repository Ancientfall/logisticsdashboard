// Debug script to analyze Stena IceMAX voyage data from Excel files
const XLSX = require('xlsx');
const path = require('path');

const analyzeVoyageData = () => {
  console.log('🔍 === STENA ICEMAX VOYAGE ANALYSIS ===\n');

  try {
    // Read the Voyage List Excel file
    const voyageListPath = path.join(__dirname, 'excel-data', 'excel-files', 'Voyage List.xlsx');
    const workbook = XLSX.readFile(voyageListPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const voyageData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Total voyages in Excel file: ${voyageData.length}`);

    // Filter for Stena IceMAX
    const stenaVoyages = voyageData.filter(voyage => 
      voyage.Vessel && voyage.Vessel.toLowerCase().includes('stena') && 
      voyage.Vessel.toLowerCase().includes('icemax')
    );

    console.log(`🚢 Total Stena IceMAX voyages: ${stenaVoyages.length}`);

    // Analyze by month/year
    const may2025Voyages = stenaVoyages.filter(voyage => {
      if (!voyage['Start Date']) return false;
      
      // Handle different date formats
      let date;
      if (typeof voyage['Start Date'] === 'number') {
        // Excel serial date
        date = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
      } else {
        date = new Date(voyage['Start Date']);
      }
      
      return date.getFullYear() === 2025 && date.getMonth() === 4; // May is month 4 (0-based)
    });

    console.log(`📅 Stena IceMAX voyages in May 2025: ${may2025Voyages.length}`);

    // Show detailed breakdown
    console.log('\n📋 MAY 2025 VOYAGE DETAILS:');
    may2025Voyages.forEach((voyage, index) => {
      let startDate;
      if (typeof voyage['Start Date'] === 'number') {
        startDate = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
      } else {
        startDate = new Date(voyage['Start Date']);
      }
      
      console.log(`${index + 1}. Voyage ${voyage['Voyage Number']} - ${startDate.toISOString().substring(0, 10)} - ${voyage.Locations}`);
    });

    // Check for duplicates
    const voyageNumbers = may2025Voyages.map(v => v['Voyage Number']);
    const uniqueVoyageNumbers = new Set(voyageNumbers);
    
    console.log(`\n🔢 Unique voyage numbers in May 2025: ${uniqueVoyageNumbers.size}`);
    if (uniqueVoyageNumbers.size !== may2025Voyages.length) {
      console.log('⚠️ Potential duplicates found!');
      const duplicates = voyageNumbers.filter((num, index) => voyageNumbers.indexOf(num) !== index);
      console.log('Duplicate voyage numbers:', [...new Set(duplicates)]);
    }

    // Month distribution for Stena IceMAX
    console.log('\n📊 STENA ICEMAX MONTH DISTRIBUTION:');
    const monthDistribution = {};
    stenaVoyages.forEach(voyage => {
      if (!voyage['Start Date']) return;
      
      let date;
      if (typeof voyage['Start Date'] === 'number') {
        date = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
      } else {
        date = new Date(voyage['Start Date']);
      }
      
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      monthDistribution[monthYear] = (monthDistribution[monthYear] || 0) + 1;
    });

    Object.entries(monthDistribution)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, count]) => {
        console.log(`${month}: ${count} voyages`);
      });

    // Check data quality
    console.log('\n🔍 DATA QUALITY CHECK:');
    const missingDates = stenaVoyages.filter(v => !v['Start Date']).length;
    const missingVoyageNumbers = stenaVoyages.filter(v => !v['Voyage Number']).length;
    const missingLocations = stenaVoyages.filter(v => !v.Locations).length;

    console.log(`Missing start dates: ${missingDates}`);
    console.log(`Missing voyage numbers: ${missingVoyageNumbers}`);
    console.log(`Missing locations: ${missingLocations}`);

    console.log('\n🔍 === END ANALYSIS ===');

    return {
      totalVoyages: voyageData.length,
      stenaVoyages: stenaVoyages.length,
      may2025Voyages: may2025Voyages.length,
      uniqueMay2025: uniqueVoyageNumbers.size,
      monthDistribution,
      voyageDetails: may2025Voyages
    };

  } catch (error) {
    console.error('❌ Error analyzing voyage data:', error.message);
    if (error.code === 'ENOENT') {
      console.log('📁 Make sure the Excel file exists at: excel-data/excel-files/Voyage List.xlsx');
    }
    return null;
  }
};

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeVoyageData();
}

module.exports = analyzeVoyageData;