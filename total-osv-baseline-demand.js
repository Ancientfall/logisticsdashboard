/**
 * TOTAL OSV BASELINE DRILLING DEMAND CALCULATION
 * 
 * Calculate baseline drilling demand using ALL capable OSVs except:
 * - Fantasy Island, Fast Giant, Fast Goliath, Fast Leopard, Fast Server, Tucker Candies
 * 
 * This shows the total drilling demand that conventional OSVs need to handle
 */

const fs = require('fs');
const xlsx = require('xlsx');

console.log('🎯 TOTAL OSV BASELINE DRILLING DEMAND ANALYSIS');
console.log('');

// Load manifest data
const manifestPath = './excel-data/excel-files/Vessel Manifests.xlsx';
const workbook = xlsx.readFile(manifestPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const manifestData = xlsx.utils.sheet_to_json(worksheet);

// Excluded vessels (not capable OSVs for conventional drilling support)
const EXCLUDED_VESSELS = [
  'fantasy island',
  'fast giant',
  'fast goliath', 
  'fast leopard',
  'fast server',
  'tucker candies'
];

// Drilling locations
const BP_DRILLING_LOCATIONS = [
  'Ocean BlackLion',
  'Ocean Blackhornet', 
  'Mad Dog Drilling',
  'ThunderHorse Drilling',
  'Stena IceMAX',
  'Deepwater Invictus'
];

const ANALYSIS_MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

// Helper functions
function excelDateToJSDate(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

function isExcludedVessel(vesselName) {
  if (!vesselName) return true; // Exclude vessels with no name
  const vessel = vesselName.toString().toLowerCase().trim();
  return EXCLUDED_VESSELS.some(excludedName => 
    vessel.includes(excludedName.replace(' ', '')) || 
    vessel === excludedName
  );
}

function normalizeRigLocation(location) {
  if (!location) return 'Unknown';
  const loc = location.toString().toLowerCase().trim();
  
  if (loc.includes('blacklion') || loc.includes('black lion')) return 'Ocean BlackLion';
  if (loc.includes('blackhornet') || loc.includes('black hornet')) return 'Ocean Blackhornet';
  if (loc.includes('mad dog') && loc.includes('drill')) return 'Mad Dog Drilling';
  if (loc.includes('thunder') && loc.includes('drill')) return 'ThunderHorse Drilling';
  if (loc.includes('stena') && loc.includes('ice')) return 'Stena IceMAX';
  if (loc.includes('deepwater') && loc.includes('invictus')) return 'Deepwater Invictus';
  
  return location;
}

// Filter to capable OSV deliveries to drilling locations in 2025
const capableOSVDeliveries = manifestData.filter(manifest => {
  try {
    // Date filter
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const year = manifestDate.getFullYear();
    if (year !== 2025) return false;
    
    // Exclude specific vessels
    const transporter = manifest.Transporter || '';
    if (isExcludedVessel(transporter)) return false;
    
    // Drilling location filter
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    return BP_DRILLING_LOCATIONS.includes(location);
    
  } catch (error) {
    return false;
  }
});

console.log(`📊 Found ${capableOSVDeliveries.length} deliveries by capable OSVs to drilling locations`);

// Show which vessels are included
const vesselCounts = new Map();
capableOSVDeliveries.forEach(manifest => {
  const vessel = manifest.Transporter || '';
  vesselCounts.set(vessel, (vesselCounts.get(vessel) || 0) + 1);
});

console.log('');
console.log('🚢 CAPABLE OSVs INCLUDED IN ANALYSIS:');
Array.from(vesselCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([vessel, count]) => {
    console.log(`  ${vessel}: ${count} deliveries`);
  });

console.log('');

// Initialize data structure: rig -> month -> count
const rigMonthlyTotal = new Map();
BP_DRILLING_LOCATIONS.forEach(rig => {
  rigMonthlyTotal.set(rig, new Map());
  ANALYSIS_MONTHS.forEach(month => {
    rigMonthlyTotal.get(rig).set(month, 0);
  });
});

// Populate with capable OSV delivery data
capableOSVDeliveries.forEach(manifest => {
  try {
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    
    if (rigMonthlyTotal.has(location) && ANALYSIS_MONTHS.includes(monthKey)) {
      const currentCount = rigMonthlyTotal.get(location).get(monthKey);
      rigMonthlyTotal.get(location).set(monthKey, currentCount + 1);
    }
  } catch (error) {
    // Skip invalid entries
  }
});

// Calculate total baseline demand for each rig
console.log('🎯 TOTAL OSV BASELINE DEMAND (ALL CAPABLE OSVs):');
console.log('');

let totalOSVDemand = 0;
const rigTotalAverages = [];

BP_DRILLING_LOCATIONS.forEach(rig => {
  const monthlyData = rigMonthlyTotal.get(rig);
  const monthlyDeliveries = ANALYSIS_MONTHS.map(month => monthlyData.get(month));
  
  // Calculate total average
  const totalAverage = monthlyDeliveries.reduce((sum, val) => sum + val, 0) / monthlyDeliveries.length;
  const totalDeliveries = monthlyDeliveries.reduce((sum, val) => sum + val, 0);
  const activeMonths = monthlyDeliveries.filter(val => val > 0).length;
  
  console.log(`${rig}:`);
  console.log(`  Monthly deliveries: ${monthlyDeliveries.join(', ')}`);
  console.log(`  Total average: ${totalAverage.toFixed(1)} deliveries/month`);
  console.log(`  Total over 6 months: ${totalDeliveries}`);
  console.log(`  Active months: ${activeMonths}/6`);
  console.log('');
  
  totalOSVDemand += totalAverage;
  rigTotalAverages.push({
    rig: rig,
    total: totalAverage,
    monthlyData: monthlyDeliveries,
    totalDeliveries: totalDeliveries
  });
});

console.log('📊 TOTAL OSV DEMAND SUMMARY:');
console.log(`Total OSV baseline demand: ${totalOSVDemand.toFixed(1)} deliveries/month`);
console.log(`Number of drilling rigs: ${BP_DRILLING_LOCATIONS.length}`);
console.log(`Average per rig: ${(totalOSVDemand / BP_DRILLING_LOCATIONS.length).toFixed(1)} deliveries/month`);
console.log('');

console.log('📈 RIG TOTAL DEMAND RANKING:');
rigTotalAverages
  .sort((a, b) => b.total - a.total)
  .forEach((rig, index) => {
    console.log(`${index + 1}. ${rig.rig}: ${rig.total.toFixed(1)} deliveries/month`);
  });

console.log('');
console.log('🔄 COMPARISON:');
console.log(`Your OSVs only: 39.0 deliveries/month`);
console.log(`All capable OSVs: ${totalOSVDemand.toFixed(1)} deliveries/month`);
console.log(`Additional demand handled by others: ${(totalOSVDemand - 39.0).toFixed(1)} deliveries/month`);
console.log(`Your market share: ${((39.0 / totalOSVDemand) * 100).toFixed(1)}%`);
console.log('');
console.log('💡 KEY INSIGHTS:');
console.log('• This represents total drilling demand for conventional OSVs');
console.log('• Excludes Fast vessels, Fantasy Island, Tucker Candies');
console.log('• Shows the full market opportunity for OSV operations');
console.log('• Your fleet handles a portion of this total demand');