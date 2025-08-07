/**
 * CORRECTED DRILLING DEMAND CALCULATION
 * 
 * Problem: Current method divides total manifests by 6 months
 * This doesn't account for rig activity patterns or inactive periods
 * 
 * Correct Method: Calculate per-rig monthly averages, then sum
 */

const fs = require('fs');
const xlsx = require('xlsx');

console.log('🔧 CORRECTED DRILLING DEMAND CALCULATION');
console.log('');

// Load manifest data
const manifestPath = './excel-data/excel-files/Vessel Manifests.xlsx';
if (!fs.existsSync(manifestPath)) {
  console.log('❌ Vessel Manifests.xlsx not found');
  process.exit(1);
}

const workbook = xlsx.readFile(manifestPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const manifestData = xlsx.utils.sheet_to_json(worksheet);

// Drilling locations
const BP_DRILLING_LOCATIONS = [
  'Ocean BlackLion',
  'Ocean Blackhornet', 
  'Mad Dog Drilling',
  'ThunderHorse Drilling',
  'Stena IceMAX',
  'Deepwater Invictus'
];

// Analysis period
const ANALYSIS_MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

// Function to convert Excel date to JS date
function excelDateToJSDate(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

// Function to normalize rig location names
function normalizeRigLocation(location) {
  if (!location) return 'Unknown';
  const loc = location.toString().toLowerCase().trim();
  
  // Map variations to standard names
  if (loc.includes('blacklion') || loc.includes('black lion')) return 'Ocean BlackLion';
  if (loc.includes('blackhornet') || loc.includes('black hornet')) return 'Ocean Blackhornet';
  if (loc.includes('mad dog') && loc.includes('drill')) return 'Mad Dog Drilling';
  if (loc.includes('thunder') && loc.includes('drill')) return 'ThunderHorse Drilling';
  if (loc.includes('stena') && loc.includes('ice')) return 'Stena IceMAX';
  if (loc.includes('deepwater') && loc.includes('invictus')) return 'Deepwater Invictus';
  
  return location; // Return original if no match
}

// Filter manifests to drilling locations and 2025 period
const drillingManifests = manifestData.filter(manifest => {
  try {
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const year = manifestDate.getFullYear();
    
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    const isDrillingLocation = BP_DRILLING_LOCATIONS.includes(location);
    
    return year === 2025 && isDrillingLocation;
  } catch (error) {
    return false;
  }
});

console.log(`📊 Found ${drillingManifests.length} drilling manifests in 2025`);
console.log('');

// CORRECTED METHOD: Calculate per-rig monthly demand
console.log('🎯 CORRECTED CALCULATION METHOD:');
console.log('');

// Group manifests by rig and month
const rigMonthlyData = new Map();

// Initialize data structure
BP_DRILLING_LOCATIONS.forEach(rig => {
  rigMonthlyData.set(rig, new Map());
  ANALYSIS_MONTHS.forEach(month => {
    rigMonthlyData.get(rig).set(month, 0);
  });
});

// Populate with actual manifest data
drillingManifests.forEach(manifest => {
  try {
    const manifestDate = excelDateToJSDate(manifest['Manifest Date']);
    const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
    const location = normalizeRigLocation(manifest['Offshore Location'] || '');
    
    if (rigMonthlyData.has(location) && ANALYSIS_MONTHS.includes(monthKey)) {
      const currentCount = rigMonthlyData.get(location).get(monthKey);
      rigMonthlyData.get(location).set(monthKey, currentCount + 1);
    }
  } catch (error) {
    // Skip invalid dates
  }
});

// Calculate corrected demand
let totalDemand = 0;
console.log('📍 PER-RIG MONTHLY ANALYSIS:');
console.log('');

BP_DRILLING_LOCATIONS.forEach(rig => {
  const monthlyData = rigMonthlyData.get(rig);
  const monthlyDemands = ANALYSIS_MONTHS.map(month => monthlyData.get(month));
  
  console.log(`${rig}:`);
  console.log(`  Monthly breakdown: ${monthlyDemands.join(', ')} deliveries`);
  
  // Method 1: Average including inactive months
  const avgWithInactive = monthlyDemands.reduce((sum, val) => sum + val, 0) / monthlyDemands.length;
  
  // Method 2: Average only active months (non-zero)
  const activeMonths = monthlyDemands.filter(val => val > 0);
  const avgActiveOnly = activeMonths.length > 0 ? 
    activeMonths.reduce((sum, val) => sum + val, 0) / activeMonths.length : 0;
  
  console.log(`  Average (all months): ${avgWithInactive.toFixed(1)} deliveries/month`);
  console.log(`  Average (active only): ${avgActiveOnly.toFixed(1)} deliveries/month (${activeMonths.length}/${monthlyDemands.length} active months)`);
  console.log(`  Total over 6 months: ${monthlyDemands.reduce((sum, val) => sum + val, 0)} deliveries`);
  console.log('');
  
  // Use average including inactive months for total demand calculation
  totalDemand += avgWithInactive;
});

console.log('📊 CORRECTED DRILLING DEMAND RESULTS:');
console.log(`Total Drilling Demand: ${totalDemand.toFixed(1)} deliveries/month`);
console.log('');
console.log('🔄 COMPARISON:');
console.log(`Current (wrong) method: 50.7 deliveries/month (total manifests ÷ 6)`);
console.log(`Corrected method: ${totalDemand.toFixed(1)} deliveries/month (sum of per-rig averages)`);
console.log(`Difference: ${(totalDemand - 50.7).toFixed(1)} deliveries/month`);
console.log('');
console.log('💡 WHY THIS MATTERS:');
console.log('• Accounts for rig inactivity periods');
console.log('• Reflects true operational demand patterns'); 
console.log('• More accurate vessel requirement calculations');