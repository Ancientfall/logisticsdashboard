/**
 * Debug script to investigate Deepwater Invictus tonnage discrepancy
 * Dashboard shows 697 tons but Kabal shows 1,430 tons for June 2025
 */

const XLSX = require('xlsx');
const path = require('path');

console.log('🔍 DEEPWATER INVICTUS TONNAGE INVESTIGATION');
console.log('Dashboard: 697 tons | Kabal: 1,430 tons | Difference: 733 tons');
console.log('='.repeat(80));

// Load the Excel files
const manifestPath = path.join(__dirname, 'excel-data/excel-files/Vessel Manifests.xlsx');
const costAllocationPath = path.join(__dirname, 'excel-data/excel-files/Cost Allocation.xlsx');

try {
  // Load Vessel Manifests
  console.log('📋 Loading Vessel Manifests...');
  const manifestWorkbook = XLSX.readFile(manifestPath);
  const manifestSheet = manifestWorkbook.Sheets[manifestWorkbook.SheetNames[0]];
  const manifestData = XLSX.utils.sheet_to_json(manifestSheet);
  
  // Load Cost Allocation
  console.log('💰 Loading Cost Allocation...');
  const costWorkbook = XLSX.readFile(costAllocationPath);
  const costSheet = costWorkbook.Sheets[costWorkbook.SheetNames[0]];
  const costAllocationData = XLSX.utils.sheet_to_json(costSheet);

  // First, let's check what columns are available and what destinations exist
  console.log('\n🔍 DATA EXPLORATION:');
  console.log('-'.repeat(80));
  console.log('Available columns:', Object.keys(manifestData[0] || {}));
  
  // Check for different destination/location column names
  const possibleLocationColumns = ['Destination', 'Offshore Location', 'Location', 'To', 'destination'];
  const locationColumn = possibleLocationColumns.find(col => manifestData[0] && manifestData[0][col] !== undefined);
  console.log('Using location column:', locationColumn);
  
  // Find all destinations containing 'deepwater'
  const deepwaterDestinations = [...new Set(manifestData
    .map(m => m[locationColumn] || '')
    .filter(dest => dest.toLowerCase().includes('deepwater'))
  )];
  console.log('Deepwater destinations found:', deepwaterDestinations);
  
  // Helper function to parse Excel serial dates
  function parseExcelDate(serial) {
    if (!serial || serial === 0 || typeof serial === 'string') {
      // Try to parse as regular date string first
      const dateStr = serial || '';
      if (dateStr.includes('/') || dateStr.includes('-')) {
        return new Date(dateStr);
      }
      return null;
    }
    // Excel serial date conversion
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
  
  // Filter for Deepwater Invictus in June 2025
  const deepwaterManifests = manifestData.filter(manifest => {
    const location = manifest[locationColumn] || '';
    const manifestDate = parseExcelDate(manifest['Manifest Date']);
    const isJune2025 = manifestDate && manifestDate.getMonth() === 5 && manifestDate.getFullYear() === 2025; // June is month 5
    
    return location.toLowerCase().includes('deepwater') && 
           location.toLowerCase().includes('invictus') && 
           isJune2025;
  });

  console.log(`\n📊 DEEPWATER INVICTUS MANIFEST ENTRIES (June 2025): ${deepwaterManifests.length} entries`);
  console.log('-'.repeat(80));

  let totalRawTonnage = 0;
  let totalDeckTons = 0;
  let totalRTTons = 0;
  const costCodes = new Set();

  // Check for different tonnage column names
  const possibleDeckColumns = ['deck tons (metric)', 'Deck Tons', 'deckTons'];
  const possibleRTColumns = ['RT Tons', 'rt tons', 'rtTons'];
  const deckColumn = possibleDeckColumns.find(col => manifestData[0] && manifestData[0][col] !== undefined);
  const rtColumn = possibleRTColumns.find(col => manifestData[0] && manifestData[0][col] !== undefined);
  
  console.log('Using deck tons column:', deckColumn);
  console.log('Using RT tons column:', rtColumn);
  
  deepwaterManifests.forEach((manifest, index) => {
    const deckTons = parseFloat(manifest[deckColumn]) || 0;
    const rtTons = parseFloat(manifest[rtColumn]) || 0;
    const totalTons = deckTons + rtTons;
    const costCode = manifest['Cost Code'] || 'NO COST CODE';
    
    totalRawTonnage += totalTons;
    totalDeckTons += deckTons;
    totalRTTons += rtTons;
    costCodes.add(costCode);
    
    console.log(`${index + 1}. Manifest: ${manifest['Manifest Number']} | Date: ${manifest['Manifest Date']} | Cost Code: ${costCode}`);
    console.log(`   Deck: ${deckTons.toFixed(1)}t | RT: ${rtTons.toFixed(1)}t | Total: ${totalTons.toFixed(1)}t`);
    console.log(`   Transporter: ${manifest.Transporter} | From: ${manifest.From} | To: ${manifest[locationColumn]}`);
  });

  console.log('\n📈 RAW TONNAGE SUMMARY:');
  console.log(`Total Deck Tons: ${totalDeckTons.toFixed(1)}`);
  console.log(`Total RT Tons: ${totalRTTons.toFixed(1)}`);
  console.log(`TOTAL RAW TONNAGE: ${totalRawTonnage.toFixed(1)} tons`);
  console.log(`Cost Codes Found: ${Array.from(costCodes).join(', ')}`);

  // Analyze Cost Allocation data for Deepwater Invictus
  console.log('\n💰 COST ALLOCATION ANALYSIS:');
  console.log('-'.repeat(80));

  // Check what location columns exist in cost allocation
  console.log('Cost allocation columns:', Object.keys(costAllocationData[0] || {}));
  
  // Get all drilling LC numbers from cost allocation
  const drillingLCs = new Set();
  const deepwaterCostAllocations = costAllocationData.filter(ca => {
    const location = ca.Location || ca['Rig Location'] || '';
    return location.toLowerCase().includes('deepwater') && location.toLowerCase().includes('invictus');
  });

  console.log(`Deepwater Invictus Cost Allocation Entries: ${deepwaterCostAllocations.length}`);
  
  deepwaterCostAllocations.forEach((ca, index) => {
    const lcNumber = ca['LC Number'] || ca.LC || '';
    const location = ca.Location || ca['Rig Location'] || '';
    const department = ca.Department || '';
    const projectType = ca['Project Type'] || '';
    
    if (lcNumber && department === 'Drilling') {
      drillingLCs.add(lcNumber.toString().trim());
    }
    
    console.log(`${index + 1}. LC: ${lcNumber} | Location: ${location} | Dept: ${department} | Project: ${projectType}`);
  });
  
  // If no Deepwater Invictus cost allocations found, show all drilling LCs
  if (deepwaterCostAllocations.length === 0) {
    console.log('\n⚠️ No specific Deepwater Invictus cost allocations found.');
    console.log('Checking if cost codes 10140 and 10133 are in drilling LCs...');
    
    // Show sample cost allocation entries to understand structure
    console.log('\nSample cost allocation entries:');
    costAllocationData.slice(0, 10).forEach((ca, index) => {
      console.log(`${index + 1}. LC: ${ca['LC Number']} | Dept: ${ca.Department} | Project: ${ca['Project Type']} | Mission: ${ca.Mission}`);
    });
    
    costAllocationData.forEach(ca => {
      const lcNumber = ca['LC Number'] || ca.LC || '';
      const department = ca.Department || '';
      
      if (lcNumber && department === 'Drilling') {
        drillingLCs.add(lcNumber.toString().trim());
      }
    });
    
    // Check if the manifest cost codes exist in the updated cost allocation
    console.log('\n🔍 DETAILED COST CODE ANALYSIS:');
    
    const lc10140 = costAllocationData.find(ca => ca['LC Number'] == '10140' || ca['LC Number'] === 10140);
    const lc10133 = costAllocationData.find(ca => ca['LC Number'] == '10133' || ca['LC Number'] === 10133);
    
    console.log(`LC 10140 exists in cost allocation: ${!!lc10140}`);
    if (lc10140) {
      console.log(`  LC 10140 details:`, {
        'LC Number': lc10140['LC Number'],
        'Project Type': lc10140['Project Type'],
        'Mission': lc10140['Mission'],
        'Description': lc10140['Description'],
        'Rig Reference': lc10140['Rig Reference']
      });
    }
    
    console.log(`LC 10133 exists in cost allocation: ${!!lc10133}`);
    if (lc10133) {
      console.log(`  LC 10133 details:`, {
        'LC Number': lc10133['LC Number'],
        'Project Type': lc10133['Project Type'],
        'Mission': lc10133['Mission'],
        'Description': lc10133['Description'],
        'Rig Reference': lc10133['Rig Reference']
      });
    }
    
    // Check if they would be classified as drilling based on project type
    const drillingProjectTypes = ['Drilling', 'Completions'];
    const would10140BeDrilling = lc10140 && drillingProjectTypes.includes(lc10140['Project Type']);
    const would10133BeDrilling = lc10133 && drillingProjectTypes.includes(lc10133['Project Type']);
    
    console.log(`\n🎯 CLASSIFICATION RESULTS:`);
    console.log(`LC 10140 would be classified as drilling: ${would10140BeDrilling}`);
    console.log(`LC 10133 would be classified as drilling: ${would10133BeDrilling}`);
    
    // If they exist and are drilling, add them to drilling LCs
    if (would10140BeDrilling) drillingLCs.add('10140');
    if (would10133BeDrilling) drillingLCs.add('10133');
    
    // Check if the manifest cost codes are in drilling LCs now
    console.log('\n🔍 FINAL VALIDATION:');
    console.log(`Is 10140 in drilling LCs now? ${drillingLCs.has('10140')}`);
    console.log(`Is 10133 in drilling LCs now? ${drillingLCs.has('10133')}`);
    
    // Show which LCs match the manifest cost codes
    const matchingLCs = Array.from(drillingLCs).filter(lc => 
      lc === '10140' || lc === '10133'
    );
    console.log(`Matching LCs found: ${matchingLCs.join(', ')}`);
  }

  console.log(`\nAuthoritative Drilling LC Numbers: ${Array.from(drillingLCs).join(', ')}`);

  // Check which manifests would be filtered out
  console.log('\n🔍 MANIFEST VALIDATION ANALYSIS:');
  console.log('-'.repeat(80));

  let validatedTonnage = 0;
  let filteredOutTonnage = 0;
  let validatedCount = 0;
  let filteredOutCount = 0;

  deepwaterManifests.forEach((manifest) => {
    const deckTons = parseFloat(manifest[deckColumn]) || 0;
    const rtTons = parseFloat(manifest[rtColumn]) || 0;
    const totalTons = deckTons + rtTons;
    const costCode = (manifest['Cost Code'] || '').toString().trim();
    
    const isValidated = drillingLCs.has(costCode);
    
    if (isValidated) {
      validatedTonnage += totalTons;
      validatedCount++;
      console.log(`✅ VALID: Manifest ${manifest['Manifest Number']} | Cost Code: ${costCode} | Tons: ${totalTons.toFixed(1)}`);
    } else {
      filteredOutTonnage += totalTons;
      filteredOutCount++;
      console.log(`❌ FILTERED OUT: Manifest ${manifest['Manifest Number']} | Cost Code: ${costCode} | Tons: ${totalTons.toFixed(1)}`);
    }
  });
  
  // If no June 2025 data found, check for any Deepwater Invictus data
  if (deepwaterManifests.length === 0) {
    console.log('\n⚠️ No June 2025 Deepwater Invictus data found. Checking for any period...');
    const allDeepwaterManifests = manifestData.filter(manifest => {
      const location = manifest[locationColumn] || '';
      return location.toLowerCase().includes('deepwater') && 
             location.toLowerCase().includes('invictus');
    });
    
    console.log(`Found ${allDeepwaterManifests.length} Deepwater Invictus manifests across all periods`);
    
    if (allDeepwaterManifests.length > 0) {
      // Show date range with proper parsing
      const dates = allDeepwaterManifests
        .map(m => parseExcelDate(m['Manifest Date']))
        .filter(d => d && d.getFullYear() > 1970)  // Filter out invalid dates
        .sort((a, b) => a - b);
      
      if (dates.length > 0) {
        console.log(`Date range: ${dates[0].toDateString()} to ${dates[dates.length - 1].toDateString()}`);
        
        // Group by month/year
        const byPeriod = {};
        allDeepwaterManifests.forEach(manifest => {
          const date = parseExcelDate(manifest['Manifest Date']);
          if (date && date.getFullYear() > 1970) {
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byPeriod[period]) byPeriod[period] = [];
            byPeriod[period].push(manifest);
          }
        });
        
        console.log('\nManifests by period:');
        Object.keys(byPeriod).sort().forEach(period => {
          const manifests = byPeriod[period];
          const totalTons = manifests.reduce((sum, m) => {
            const deckTons = parseFloat(m[deckColumn]) || 0;
            const rtTons = parseFloat(m[rtColumn]) || 0;
            return sum + deckTons + rtTons;
          }, 0);
          console.log(`  ${period}: ${manifests.length} manifests, ${totalTons.toFixed(1)} tons`);
          
          // Show June 2025 details if found
          if (period === '2025-06') {
            console.log('    🎯 JUNE 2025 DETAILS:');
            manifests.forEach((manifest, index) => {
              const deckTons = parseFloat(manifest[deckColumn]) || 0;
              const rtTons = parseFloat(manifest[rtColumn]) || 0;
              const totalTons = deckTons + rtTons;
              console.log(`      ${index + 1}. ${manifest['Manifest Number']} | ${manifest['Cost Code']} | ${totalTons.toFixed(1)} tons`);
            });
          }
        });
      } else {
        console.log('No valid dates found in manifests');
        // Show raw date values for debugging
        console.log('Sample raw dates:', allDeepwaterManifests.slice(0, 5).map(m => m['Manifest Date']));
      }
    }
  }

  console.log('\n📊 FINAL ANALYSIS:');
  console.log('='.repeat(80));
  console.log(`Raw Tonnage (All Manifests): ${totalRawTonnage.toFixed(1)} tons`);
  console.log(`Validated Tonnage (Dashboard): ${validatedTonnage.toFixed(1)} tons`);
  console.log(`Filtered Out Tonnage: ${filteredOutTonnage.toFixed(1)} tons`);
  console.log(`Kabal Expected: 1,430 tons`);
  console.log(`Dashboard Shows: 697 tons`);
  console.log(`Discrepancy: ${(1430 - validatedTonnage).toFixed(1)} tons`);
  console.log();
  console.log(`Validation Rate: ${validatedCount}/${deepwaterManifests.length} manifests (${((validatedCount/deepwaterManifests.length)*100).toFixed(1)}%)`);

  // Check if the filtered out tonnage explains the discrepancy
  if (Math.abs(filteredOutTonnage - (1430 - 697)) < 50) {
    console.log('\n🎯 LIKELY CAUSE IDENTIFIED:');
    console.log('The tonnage discrepancy appears to be caused by LC number filtering.');
    console.log('Some valid Deepwater Invictus manifests are being excluded due to cost code validation.');
  }

} catch (error) {
  console.error('❌ Error analyzing data:', error.message);
}