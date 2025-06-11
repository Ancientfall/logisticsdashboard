import { classifyBulkFluid } from './bulkFluidClassification';

// Test data that should be classified as drilling fluids
const drillingTestCases = [
  { type: 'WBM', desc: 'Water Based Mud' },
  { type: 'SBM', desc: 'Synthetic Based Mud' },
  { type: 'OBM', desc: 'Oil Based Mud' },
  { type: 'Drilling Mud', desc: '' },
  { type: 'Drilling Fluid', desc: 'Premium' },
  { type: 'Mud', desc: 'Drilling' },
  { type: 'Premix', desc: 'Drilling Fluid' },
  { type: 'Base Oil', desc: 'For drilling' },
  { type: 'BASEOIL', desc: '' },
  { type: 'Pre-Mix', desc: 'Drilling Mud' },
];

// Test data that should be classified as completion fluids
const completionTestCases = [
  { type: 'Calcium Bromide', desc: '' },
  { type: 'CaBr2', desc: 'Completion Fluid' },
  { type: 'Calcium Chloride', desc: '' },
  { type: 'CaCl2', desc: 'Completion Brine' },
  { type: 'Sodium Chloride', desc: '' },
  { type: 'NaCl', desc: 'Brine' },
  { type: 'KCL', desc: 'Completion Fluid' },
  { type: 'Potassium Chloride', desc: '' },
  { type: 'Clayfix', desc: '' },
  { type: 'Completion Brine', desc: 'CaCl2/CaBr2' },
  { type: 'Workover Fluid', desc: '' },
  { type: 'Intervention Fluid', desc: 'Calcium Bromide' },
];

export function testBulkFluidClassification(): void {
  console.group('🧪 Testing Bulk Fluid Classification');
  
  console.group('Testing Drilling Fluid Classification');
  drillingTestCases.forEach(testCase => {
    const result = classifyBulkFluid(testCase.type, testCase.desc);
    const passed = result.isDrillingFluid;
    console.log(
      `${passed ? '✅' : '❌'} Type: "${testCase.type}", Desc: "${testCase.desc}" => ` +
      `isDrillingFluid: ${result.isDrillingFluid}, category: ${result.category}, specificType: ${result.specificType}`
    );
  });
  console.groupEnd();
  
  console.group('Testing Completion Fluid Classification');
  completionTestCases.forEach(testCase => {
    const result = classifyBulkFluid(testCase.type, testCase.desc);
    const passed = result.isCompletionFluid;
    console.log(
      `${passed ? '✅' : '❌'} Type: "${testCase.type}", Desc: "${testCase.desc}" => ` +
      `isCompletionFluid: ${result.isCompletionFluid}, category: ${result.category}, specificType: ${result.specificType}`
    );
  });
  console.groupEnd();
  
  console.groupEnd();
}

// Function to analyze actual data patterns
export function analyzeActualBulkData(bulkActions: any[]): void {
  console.group('📊 Analyzing Actual Bulk Data Patterns');
  
  // Find common patterns in bulk types and descriptions
  const typePatterns = new Map<string, number>();
  const descPatterns = new Map<string, number>();
  const combinedPatterns = new Map<string, number>();
  
  bulkActions.forEach(action => {
    const bulkType = (action["Bulk Type"] || '').toLowerCase().trim();
    const bulkDesc = (action["Bulk Description"] || '').toLowerCase().trim();
    const combined = `${bulkType} | ${bulkDesc}`;
    
    if (bulkType) {
      typePatterns.set(bulkType, (typePatterns.get(bulkType) || 0) + 1);
    }
    if (bulkDesc) {
      descPatterns.set(bulkDesc, (descPatterns.get(bulkDesc) || 0) + 1);
    }
    if (bulkType || bulkDesc) {
      combinedPatterns.set(combined, (combinedPatterns.get(combined) || 0) + 1);
    }
  });
  
  // Sort and display top patterns
  console.group('Top Bulk Types (by frequency)');
  Array.from(typePatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([type, count]) => {
      console.log(`"${type}": ${count} occurrences`);
    });
  console.groupEnd();
  
  console.group('Top Bulk Descriptions (by frequency)');
  Array.from(descPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([desc, count]) => {
      console.log(`"${desc}": ${count} occurrences`);
    });
  console.groupEnd();
  
  console.group('Top Combined Patterns (Type | Description)');
  Array.from(combinedPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([pattern, count]) => {
      const [type, desc] = pattern.split(' | ');
      const classification = classifyBulkFluid(type, desc);
      console.log(
        `"${pattern}": ${count} occurrences => ` +
        `Category: ${classification.category}, ` +
        `isDrilling: ${classification.isDrillingFluid}, ` +
        `isCompletion: ${classification.isCompletionFluid}`
      );
    });
  console.groupEnd();
  
  console.groupEnd();
}