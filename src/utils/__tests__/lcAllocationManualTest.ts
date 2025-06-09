import { parseLCAllocationString } from '../lcAllocation';

// Helper function to format output nicely
const formatAllocation = (allocations: { lcNumber: string; percentage: number }[]) => {
  return allocations.map(a => `${a.lcNumber}: ${a.percentage.toFixed(2)}%`).join(', ');
};

console.log('=== LC Allocation Parser Test Results ===\n');

// User-specified scenarios
console.log('USER-SPECIFIED SCENARIOS:');
console.log('-------------------------');

// Test 1
const test1 = "9358";
console.log(`1. Input: "${test1}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(test1))}`);
console.log(`   Expected: 9358: 100%\n`);

// Test 2
const test2 = "9358, 9360, 10139";
console.log(`2. Input: "${test2}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(test2))}`);
console.log(`   Expected: 33.33% to each\n`);

// Test 3
const test3 = "9358, 10123";
console.log(`3. Input: "${test3}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(test3))}`);
console.log(`   Expected: 50% to each\n`);

// Test 4
const test4 = "9358 12, 10123 64, 9876 12, 91023 12";
console.log(`4. Input: "${test4}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(test4))}`);
console.log(`   Expected: Use specific percentages (12%, 64%, 12%, 12%)\n`);

console.log('\nEDGE CASES:');
console.log('------------');

// Edge case 1: Total not 100%
const edge1 = "9358 30, 10123 40, 9876 20";
console.log(`1. Total ≠ 100% - Input: "${edge1}" (Total: 90%)`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge1))}`);
console.log(`   Expected: Normalize to 100%\n`);

// Edge case 2: Mixed formats
const edge2 = "9358 40, 10123, 9876 30, 91023";
console.log(`2. Mixed formats - Input: "${edge2}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge2))}`);
console.log(`   Expected: 9358: 40%, 10123: 15%, 9876: 30%, 91023: 15%\n`);

// Edge case 3: Different delimiters
const edge3a = "9358; 9360; 10139";
console.log(`3a. Semicolon delimiter - Input: "${edge3a}"`);
console.log(`    Output: ${formatAllocation(parseLCAllocationString(edge3a))}\n`);

const edge3b = "9358 | 9360 | 10139";
console.log(`3b. Pipe delimiter - Input: "${edge3b}"`);
console.log(`    Output: ${formatAllocation(parseLCAllocationString(edge3b))}\n`);

// Edge case 4: Empty/whitespace
const edge4a = "";
console.log(`4a. Empty string - Input: "${edge4a}"`);
console.log(`    Output: ${formatAllocation(parseLCAllocationString(edge4a)) || '(empty array)'}\n`);

const edge4b = "   ";
console.log(`4b. Whitespace only - Input: "${edge4b}"`);
console.log(`    Output: ${formatAllocation(parseLCAllocationString(edge4b)) || '(empty array)'}\n`);

// Edge case 5: Percentages over 100%
const edge5 = "9358 60, 10123 80";
console.log(`5. Percentages > 100% - Input: "${edge5}" (Total: 140%)`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge5))}`);
console.log(`   Expected: Normalize to 100%\n`);

// Edge case 6: Invalid percentage
const edge6 = "9358 abc, 10123 50";
console.log(`6. Invalid percentage - Input: "${edge6}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge6))}`);
console.log(`   Expected: Treat 'abc' as no percentage\n`);

// Edge case 7: With percentage symbols
const edge7 = "9358 40%, 10123 60%";
console.log(`7. With % symbols - Input: "${edge7}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge7))}`);
console.log(`   Note: Current implementation may not handle % symbol\n`);

// Edge case 8: Complex spacing
const edge8 = "  9358  40  ,   10123   ,  9876   60  ";
console.log(`8. Complex spacing - Input: "${edge8}"`);
console.log(`   Output: ${formatAllocation(parseLCAllocationString(edge8))}`);
console.log(`   Expected: Parse correctly despite spacing\n`);

console.log('=== End of Test Results ===');