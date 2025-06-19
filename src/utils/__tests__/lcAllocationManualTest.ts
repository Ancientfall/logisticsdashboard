// src/utils/__tests__/lcAllocationManualTest.ts
import { parseLCAllocationString } from '../lcAllocation';
import { getAllProductionLCs, getProductionFacilityByLC, mapCostAllocationLocation, getAllDrillingCapableLocations } from '../../data/masterFacilities';
import { processCostAllocation } from '../processors/costAllocationProcessor';
import { inferDepartmentFromLCNumber } from '../departmentInference';

/**
 * Manual tests for LC allocation logic and Thunder Horse/Mad Dog debugging
 * Run with: npm test -- lcAllocationManualTest
 */

console.log('\n========== LC ALLOCATION & THUNDER HORSE/MAD DOG DEBUG ==========\n');

// Test 1: Parse various LC allocation string formats
console.log('TEST 1: Parsing LC allocation strings');
console.log('=====================================');

const testStrings = [
  '9358 45, 10137 12, 10101',
  '9360',
  '10099 50, 10081 50',
  '10097 33, 10084 33, 10072 34',
  '9358',
  '10137;10101;10102',
  '9358 100',
  ''
];

testStrings.forEach(str => {
  console.log(`\nInput: "${str}"`);
  const result = parseLCAllocationString(str);
  console.log('Output:', result);
  const total = result.reduce((sum, r) => sum + r.percentage, 0);
  console.log(`Total percentage: ${total.toFixed(2)}%`);
});

// Test 2: Production LC mapping
console.log('\n\nTEST 2: Production LC Mapping');
console.log('==============================');

const productionLCs = getAllProductionLCs();
console.log('\nTotal Production LCs:', Object.keys(productionLCs).length);
console.log('\nProduction LC mapping:');
Object.entries(productionLCs).forEach(([lc, facility]) => {
  console.log(`  ${lc} -> ${facility}`);
});

// Test Thunder Horse and Mad Dog LCs specifically
console.log('\n\nTEST 3: Thunder Horse & Mad Dog LC Verification');
console.log('================================================');

const thunderHorseLCs = ['9360', '10099', '10081', '10074', '10052'];
const madDogLCs = ['9358', '10097', '10084', '10072', '10067'];

console.log('\nThunder Horse Production LCs:');
thunderHorseLCs.forEach(lc => {
  const facility = getProductionFacilityByLC(lc);
  const dept = inferDepartmentFromLCNumber(lc);
  console.log(`  ${lc}: Facility=${facility ? facility.displayName : 'NOT FOUND'}, Department=${dept || 'NONE'}`);
});

console.log('\nMad Dog Production LCs:');
madDogLCs.forEach(lc => {
  const facility = getProductionFacilityByLC(lc);
  const dept = inferDepartmentFromLCNumber(lc);
  console.log(`  ${lc}: Facility=${facility ? facility.displayName : 'NOT FOUND'}, Department=${dept || 'NONE'}`);
});

// Test 4: Location mapping
console.log('\n\nTEST 4: Location Mapping Test');
console.log('==============================');

const testLocations = [
  { rigLocation: 'Thunder Horse Prod', locationReference: undefined },
  { rigLocation: 'Thunder Horse', locationReference: 'Thunder Horse Prod' },
  { rigLocation: undefined, locationReference: 'Thunder Horse Prod' },
  { rigLocation: 'Mad Dog Prod', locationReference: undefined },
  { rigLocation: 'Mad Dog', locationReference: 'Mad Dog Prod' },
  { rigLocation: undefined, locationReference: 'Mad Dog Prod' },
  { rigLocation: 'Thunder Horse Drilling', locationReference: undefined },
  { rigLocation: 'Mad Dog Drilling', locationReference: undefined }
];

console.log('\nTesting location mapping:');
testLocations.forEach(test => {
  const mapped = mapCostAllocationLocation(test.rigLocation, test.locationReference);
  console.log(`  Rig: "${test.rigLocation || 'N/A'}", Ref: "${test.locationReference || 'N/A'}" -> ${mapped ? mapped.displayName : 'UNMAPPED'}`);
});

// Test 5: Drilling facilities check
console.log('\n\nTEST 5: Drilling Facilities Check');
console.log('==================================');

const drillingFacilities = getAllDrillingCapableLocations();
console.log('\nAll drilling capable locations:');
drillingFacilities.forEach(facility => {
  console.log(`  ${facility.displayName} (${facility.facilityType}):`);
  console.log(`    - Location Name: ${facility.locationName}`);
  console.log(`    - Drilling LCs: ${facility.drillingLCs || 'None'}`);
  console.log(`    - Production LCs: ${facility.productionLCs || 'None'}`);
});

// Test 6: Cost Allocation Processing for Thunder Horse/Mad Dog
console.log('\n\nTEST 6: Cost Allocation Processing Test');
console.log('========================================');

const mockRawData = [
  {
    "LC Number": "9360",
    "Rig Location": "Thunder Horse Prod",
    "Location Reference": "Thunder Horse Production",
    "Description": "Thunder Horse Production Operations",
    "Project Type": "Production",
    "Month-Year": "Jan-24",
    "Total Allocated Days": 30,
    "Total Cost": 1000000
  },
  {
    "LC Number": "10099",
    "Rig Location": "Thunder Horse Prod",
    "Description": "Thunder Horse Production Support",
    "Project Type": "Production",
    "Month-Year": "Jan-24",
    "Alloc (days)": 25,
    "Total Cost": 850000
  },
  {
    "LC Number": "9358",
    "Location Reference": "Mad Dog Prod",
    "Description": "Mad Dog Production Operations",
    "Project Type": "Production",
    "Month-Year": "Jan-24",
    "Total Allocated Days": 28,
    "Total Cost": 920000
  },
  {
    "LC Number": "10097",
    "Rig Location": "Mad Dog Prod",
    "Location Reference": "Mad Dog Production",
    "Description": "Mad Dog Production Support",
    "Project Type": "Production",
    "Month-Year": "Jan-24",
    "Alloc (days)": 26,
    "Total Cost": 880000
  }
];

console.log('\nProcessing mock cost allocation data:');
const processed = processCostAllocation(mockRawData as any, { minYear: 2020, maxYear: 2030 });

console.log(`\nProcessed ${processed.length} records:`);
processed.forEach(record => {
  console.log(`\n  LC ${record.lcNumber}:`);
  console.log(`    - Rig Location: ${record.rigLocation}`);
  console.log(`    - Location Reference: ${record.locationReference}`);
  console.log(`    - Department: ${record.department}`);
  console.log(`    - Project Type: ${record.projectType}`);
  console.log(`    - Month/Year: ${record.monthYear}`);
  console.log(`    - Allocated Days: ${record.totalAllocatedDays}`);
  console.log(`    - Total Cost: $${record.totalCost?.toLocaleString() || 'N/A'}`);
  console.log(`    - Is Thunder Horse: ${record.isThunderHorse}`);
  console.log(`    - Is Mad Dog: ${record.isMadDog}`);
  console.log(`    - Is Drilling: ${record.isDrilling}`);
});

// Test 7: Department assignment logic
console.log('\n\nTEST 7: Department Assignment Logic');
console.log('====================================');

console.log('\nChecking if Production LCs are being excluded from Drilling dashboard:');
const allProductionLCs = new Set(Object.keys(productionLCs));
thunderHorseLCs.concat(madDogLCs).forEach(lc => {
  const isProduction = allProductionLCs.has(lc);
  const dept = inferDepartmentFromLCNumber(lc);
  console.log(`  LC ${lc}: Is Production LC = ${isProduction}, Department = ${dept || 'NONE'}`);
});

console.log('\n========== END OF DEBUG TESTS ==========\n');