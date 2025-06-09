// Thunder Horse and Mad Dog debugging script
import { getAllProductionLCs, mapCostAllocationLocation } from '../../data/masterFacilities';
import { inferDepartmentFromLCNumber } from '../departmentInference';

console.log('\n=== THUNDER HORSE & MAD DOG DEBUG ===\n');

// 1. Check if Thunder Horse and Mad Dog Production LCs are correctly mapped
const productionLCs = getAllProductionLCs();
const thunderHorseLCs = ['9360', '10099', '10081', '10074', '10052'];
const madDogLCs = ['9358', '10097', '10084', '10072', '10067'];

console.log('1. Production LC Verification:');
console.log('------------------------------');
console.log('\nThunder Horse Production LCs:');
thunderHorseLCs.forEach(lc => {
  const facility = productionLCs[lc];
  const dept = inferDepartmentFromLCNumber(lc);
  console.log(`  LC ${lc}: Facility="${facility || 'NOT FOUND'}", Department="${dept || 'NONE'}"`);
});

console.log('\nMad Dog Production LCs:');
madDogLCs.forEach(lc => {
  const facility = productionLCs[lc];
  const dept = inferDepartmentFromLCNumber(lc);
  console.log(`  LC ${lc}: Facility="${facility || 'NOT FOUND'}", Department="${dept || 'NONE'}"`);
});

// 2. Check location mapping
console.log('\n\n2. Location Mapping Test:');
console.log('-------------------------');
const testMappings = [
  'Thunder Horse Prod',
  'Thunder Horse Production',
  'Mad Dog Prod',
  'Mad Dog Production',
  'Thunder Horse',
  'Mad Dog'
];

testMappings.forEach(loc => {
  const mapped = mapCostAllocationLocation(loc, undefined);
  console.log(`  "${loc}" -> ${mapped ? mapped.displayName : 'UNMAPPED'}`);
});

// 3. The Problem
console.log('\n\n3. THE PROBLEM:');
console.log('----------------');
console.log('Thunder Horse Prod and Mad Dog Prod are PRODUCTION facilities.');
console.log('Their LCs (9360,10099,10081,10074,10052 and 9358,10097,10084,10072,10067) are PRODUCTION LCs.');
console.log('\nIn the Drilling Dashboard:');
console.log('- Production LCs are being EXCLUDED (as they should be)');
console.log('- This means Thunder Horse Prod and Mad Dog Prod will show 0 in the Drilling Dashboard');
console.log('- This is CORRECT behavior - these are production facilities, not drilling');
console.log('\nThunder Horse DRILLING and Mad Dog DRILLING should have their own separate LCs.');

export {};