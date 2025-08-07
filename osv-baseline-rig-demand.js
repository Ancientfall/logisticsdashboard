/**
 * OSV BASELINE RIG DEMAND CALCULATION
 * 
 * Calculate monthly baseline demand for each rig location using ONLY your OSV fleet
 * This gives the fundamental demand baseline your fleet needs to meet
 */

const fs = require('fs');
const xlsx = require('xlsx');

console.log('🎯 OSV BASELINE RIG DEMAND ANALYSIS');
console.log('');

// Load manifest data
const manifestPath = './excel-data/excel-files/Vessel Manifests.xlsx';
const workbook = xlsx.readFile(manifestPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const manifestData = xlsx.utils.sheet_to_json(worksheet);

// Your OSV fleet (baseline fleet)
const YOUR_OSV_FLEET = [
  'pelican island',
  'dauphin island',
  'lightning', 
  'squall',
  'harvey supporter',
  'ship island'
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

function isYourOSV(vesselName) {
  if (!vesselName) return false;
  const vessel = vesselName.toString().toLowerCase().trim();
  return YOUR_OSV_FLEET.some(osvName => 
    vessel.includes(osvName.replace(' ', '')) || 
    vessel === osvName
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

// Filter to YOUR OSV deliveries to drilling locations in 2025
const yourOSVDrillingDeliveries = manifestData.filter(manifest => {
  try {
    // Date filter
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const year = manifestDate.getFullYear();
    if (year !== 2025) return false;
    
    // Your OSV filter
    const transporter = manifest.Transporter || '';
    if (!isYourOSV(transporter)) return false;
    
    // Drilling location filter
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    return BP_DRILLING_LOCATIONS.includes(location);
    
  } catch (error) {
    return false;
  }
});

console.log(`📊 Found ${yourOSVDrillingDeliveries.length} deliveries by YOUR OSVs to drilling locations`);
console.log('');

// Initialize data structure: rig -> month -> count
const rigMonthlyBaseline = new Map();
BP_DRILLING_LOCATIONS.forEach(rig => {
  rigMonthlyBaseline.set(rig, new Map());
  ANALYSIS_MONTHS.forEach(month => {
    rigMonthlyBaseline.get(rig).set(month, 0);
  });
});

// Populate with your OSV delivery data
yourOSVDrillingDeliveries.forEach(manifest => {
  try {
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    
    if (rigMonthlyBaseline.has(location) && ANALYSIS_MONTHS.includes(monthKey)) {
      const currentCount = rigMonthlyBaseline.get(location).get(monthKey);
      rigMonthlyBaseline.get(location).set(monthKey, currentCount + 1);
    }
  } catch (error) {
    // Skip invalid entries
  }
});

// Calculate baseline demand for each rig
console.log('🎯 BASELINE RIG DEMAND (YOUR OSV FLEET ONLY):');
console.log('');

let totalBaselineDemand = 0;
const rigBaselineAverages = [];

BP_DRILLING_LOCATIONS.forEach(rig => {
  const monthlyData = rigMonthlyBaseline.get(rig);
  const monthlyDeliveries = ANALYSIS_MONTHS.map(month => monthlyData.get(month));
  
  // Calculate baseline average (including inactive months as this is baseline capacity needed)
  const baselineAverage = monthlyDeliveries.reduce((sum, val) => sum + val, 0) / monthlyDeliveries.length;
  const totalDeliveries = monthlyDeliveries.reduce((sum, val) => sum + val, 0);
  const activeMonths = monthlyDeliveries.filter(val => val > 0).length;
  
  console.log(`${rig}:`);
  console.log(`  Monthly deliveries: ${monthlyDeliveries.join(', ')}`);
  console.log(`  Baseline average: ${baselineAverage.toFixed(1)} deliveries/month`);
  console.log(`  Total over 6 months: ${totalDeliveries}`);
  console.log(`  Active months: ${activeMonths}/6`);
  console.log('');
  
  totalBaselineDemand += baselineAverage;
  rigBaselineAverages.push({
    rig: rig,
    baseline: baselineAverage,
    monthlyData: monthlyDeliveries,
    totalDeliveries: totalDeliveries
  });
});

console.log('📊 BASELINE DEMAND SUMMARY:');
console.log(`Total baseline demand: ${totalBaselineDemand.toFixed(1)} deliveries/month`);
console.log(`Number of drilling rigs: ${BP_DRILLING_LOCATIONS.length}`);
console.log(`Average per rig: ${(totalBaselineDemand / BP_DRILLING_LOCATIONS.length).toFixed(1)} deliveries/month`);
console.log('');

console.log('📈 RIG BASELINE RANKING:');
rigBaselineAverages
  .sort((a, b) => b.baseline - a.baseline)
  .forEach((rig, index) => {
    console.log(`${index + 1}. ${rig.rig}: ${rig.baseline.toFixed(1)} deliveries/month`);
  });

console.log('');
console.log('🎯 KEY INSIGHTS:');
console.log('• This is the fundamental baseline demand your OSV fleet must handle');
console.log('• Based on actual historical performance of YOUR vessels');
console.log('• Excludes deliveries by Fast vessels, Fantasy Island, and third parties');
console.log('• Represents the true operational requirement for your fleet');