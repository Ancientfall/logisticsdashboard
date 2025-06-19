// Debug script to analyze all vessel names in the voyage data
const XLSX = require('xlsx');
const path = require('path');

const analyzeVesselNames = () => {
  console.log('🔍 === VESSEL NAME ANALYSIS ===\n');

  try {
    // Read the Voyage List Excel file
    const voyageListPath = path.join(__dirname, 'excel-data', 'excel-files', 'Voyage List.xlsx');
    const workbook = XLSX.readFile(voyageListPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const voyageData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Total voyages in Excel file: ${voyageData.length}`);

    // Get all unique vessel names
    const vesselNames = [...new Set(voyageData.map(voyage => voyage.Vessel))].filter(Boolean);
    console.log(`🚢 Total unique vessels: ${vesselNames.length}`);

    // Look for Stena vessels specifically
    const stenaVessels = vesselNames.filter(name => 
      name && name.toLowerCase().includes('stena')
    );

    console.log(`\n🔍 STENA VESSELS FOUND: ${stenaVessels.length}`);
    stenaVessels.forEach((vessel, index) => {
      console.log(`${index + 1}. "${vessel}"`);
    });

    // Look for IceMAX vessels
    const iceMaxVessels = vesselNames.filter(name => 
      name && name.toLowerCase().includes('icemax')
    );

    console.log(`\n🔍 ICEMAX VESSELS FOUND: ${iceMaxVessels.length}`);
    iceMaxVessels.forEach((vessel, index) => {
      console.log(`${index + 1}. "${vessel}"`);
    });

    // Look for vessels containing both "stena" and "ice"
    const stenaIceVessels = vesselNames.filter(name => 
      name && name.toLowerCase().includes('stena') && name.toLowerCase().includes('ice')
    );

    console.log(`\n🔍 STENA ICE VESSELS FOUND: ${stenaIceVessels.length}`);
    stenaIceVessels.forEach((vessel, index) => {
      console.log(`${index + 1}. "${vessel}"`);
    });

    // Show all vessel names (first 20)
    console.log(`\n📋 ALL VESSEL NAMES (first 20):`);
    vesselNames.slice(0, 20).forEach((vessel, index) => {
      console.log(`${index + 1}. "${vessel}"`);
    });

    if (vesselNames.length > 20) {
      console.log(`... and ${vesselNames.length - 20} more vessels`);
    }

    // Check if there are any vessels with May 2025 voyages
    console.log('\n📅 VESSELS WITH MAY 2025 VOYAGES:');
    const may2025Vessels = {};
    
    voyageData.forEach(voyage => {
      if (!voyage['Start Date']) return;
      
      let date;
      if (typeof voyage['Start Date'] === 'number') {
        date = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
      } else {
        date = new Date(voyage['Start Date']);
      }
      
      if (date.getFullYear() === 2025 && date.getMonth() === 4) { // May 2025
        const vessel = voyage.Vessel || 'Unknown';
        may2025Vessels[vessel] = (may2025Vessels[vessel] || 0) + 1;
      }
    });

    Object.entries(may2025Vessels)
      .sort((a, b) => b[1] - a[1])
      .forEach(([vessel, count]) => {
        console.log(`${vessel}: ${count} voyages`);
      });

    console.log('\n🔍 === END ANALYSIS ===');

    return {
      totalVessels: vesselNames.length,
      stenaVessels,
      iceMaxVessels,
      stenaIceVessels,
      may2025Vessels
    };

  } catch (error) {
    console.error('❌ Error analyzing vessel names:', error.message);
    if (error.code === 'ENOENT') {
      console.log('📁 Make sure the Excel file exists at: excel-data/excel-files/Voyage List.xlsx');
    }
    return null;
  }
};

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeVesselNames();
}

module.exports = analyzeVesselNames;