// Debug script to analyze May 2025 voyage counts to find potential candidates for 22 voyages
const XLSX = require('xlsx');
const path = require('path');

const analyzeMay2025 = () => {
  console.log('🔍 === MAY 2025 VOYAGE COUNT ANALYSIS ===\n');

  try {
    // Read the Voyage List Excel file
    const voyageListPath = path.join(__dirname, 'excel-data', 'excel-files', 'Voyage List.xlsx');
    const workbook = XLSX.readFile(voyageListPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const voyageData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Total voyages in Excel file: ${voyageData.length}`);

    // Get May 2025 voyages
    const may2025Voyages = voyageData.filter(voyage => {
      if (!voyage['Start Date']) return false;
      
      let date;
      if (typeof voyage['Start Date'] === 'number') {
        date = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
      } else {
        date = new Date(voyage['Start Date']);
      }
      
      return date.getFullYear() === 2025 && date.getMonth() === 4; // May 2025
    });

    console.log(`📅 Total May 2025 voyages: ${may2025Voyages.length}`);

    // Count voyages by vessel
    const vesselCounts = {};
    may2025Voyages.forEach(voyage => {
      const vessel = voyage.Vessel || 'Unknown';
      vesselCounts[vessel] = (vesselCounts[vessel] || 0) + 1;
    });

    // Sort by count descending
    const sortedVessels = Object.entries(vesselCounts).sort((a, b) => b[1] - a[1]);

    console.log('\n📊 MAY 2025 VOYAGE COUNTS BY VESSEL:');
    sortedVessels.forEach(([vessel, count]) => {
      const highlight = count === 22 ? ' ⭐ POTENTIAL MATCH!' : '';
      console.log(`${vessel}: ${count} voyages${highlight}`);
    });

    // Check if any vessel has exactly 22 voyages
    const vessel22 = sortedVessels.filter(([, count]) => count === 22);
    
    if (vessel22.length > 0) {
      console.log('\n🎯 VESSELS WITH EXACTLY 22 VOYAGES:');
      vessel22.forEach(([vessel, count]) => {
        console.log(`"${vessel}": ${count} voyages`);
        
        // Show details for this vessel
        const vesselVoyages = may2025Voyages.filter(v => v.Vessel === vessel);
        console.log('  Voyage details:');
        vesselVoyages.forEach((voyage, index) => {
          let date;
          if (typeof voyage['Start Date'] === 'number') {
            date = new Date((voyage['Start Date'] - 25569) * 86400 * 1000);
          } else {
            date = new Date(voyage['Start Date']);
          }
          console.log(`    ${index + 1}. Voyage ${voyage['Voyage Number']} - ${date.toISOString().substring(0, 10)}`);
        });
      });
    } else {
      console.log('\n⚠️ NO VESSELS FOUND WITH EXACTLY 22 VOYAGES IN MAY 2025');
      console.log('Closest matches:');
      sortedVessels.slice(0, 5).forEach(([vessel, count]) => {
        const diff = Math.abs(count - 22);
        console.log(`${vessel}: ${count} voyages (${diff} ${count > 22 ? 'more' : 'fewer'} than expected)`);
      });
    }

    // Check for potential name variations
    console.log('\n🔍 SEARCHING FOR POTENTIAL STENA ICEMAX VARIATIONS:');
    const allVessels = [...new Set(voyageData.map(v => v.Vessel))].filter(Boolean);
    
    const potentialMatches = allVessels.filter(name => {
      const lower = name.toLowerCase();
      return lower.includes('stena') || 
             lower.includes('ice') ||
             lower.includes('max') ||
             lower.includes('icemax');
    });

    if (potentialMatches.length > 0) {
      console.log('Potential name variations found:');
      potentialMatches.forEach(vessel => console.log(`  "${vessel}"`));
    } else {
      console.log('No potential name variations found for Stena IceMAX');
    }

    console.log('\n🔍 === END ANALYSIS ===');

    return {
      totalMay2025: may2025Voyages.length,
      vesselCounts,
      vessel22,
      potentialMatches
    };

  } catch (error) {
    console.error('❌ Error analyzing May 2025 data:', error.message);
    return null;
  }
};

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeMay2025();
}

module.exports = analyzeMay2025;