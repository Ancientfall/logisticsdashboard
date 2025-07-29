/**
 * Debug script to examine LC number mapping for Deepwater Invictus vs Mad Dog
 * Focus on LC numbers 10140 and 10133 that should belong to Deepwater Invictus
 */

const XLSX = require('xlsx');

console.log('🔍 LC NUMBER MAPPING DEBUG - Deepwater Invictus vs Mad Dog');
console.log('===========================================================');

try {
  // Load Cost Allocation file
  const costAllocationPath = 'excel-data/excel-files/Cost Allocation.xlsx';
  const workbook = XLSX.readFile(costAllocationPath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`📊 Total cost allocation records: ${data.length}`);

  // Filter for the problematic LC numbers
  const deepwaterInvictusLCs = ['10140', '10133'];
  
  console.log('\n🎯 ANALYZING DEEPWATER INVICTUS LC NUMBERS:');
  console.log('============================================');
  
  deepwaterInvictusLCs.forEach(lcNumber => {
    console.log(`\n🔍 LC Number: ${lcNumber}`);
    console.log('-------------------');
    
    const records = data.filter(row => {
      const lc = String(row['LC Number'] || '').trim();
      return lc === lcNumber;
    });
    
    console.log(`   Found ${records.length} records for LC ${lcNumber}`);
    
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`     LC Number: "${record['LC Number']}"`);
        console.log(`     Rig Location: "${record['Rig Location'] || 'N/A'}"`);
        console.log(`     Location Reference: "${record['Location Reference'] || 'N/A'}"`);
        console.log(`     Rig Reference: "${record['Rig Reference'] || 'N/A'}"`);
        console.log(`     Description: "${record['Description'] || 'N/A'}"`);
        console.log(`     Project Type: "${record['Project Type'] || 'N/A'}"`);
        console.log(`     Month-Year: "${record['Month-Year'] || 'N/A'}"`);
        console.log(`     Total Cost: "${record['Total Cost'] || 'N/A'}"`);
        console.log(`     Days: "${record['Alloc (days)'] || record['Total Allocated Days'] || 'N/A'}"`);
        
        // Check which location this would be mapped to
        const rigLocation = String(record["Rig Location"] || '').trim();
        const locationReference = String(record["Location Reference"] || '').trim();
        const rigReference = String(record["Rig Reference"] || '').trim();
        const description = String(record.Description || '').trim();
        
        const finalLocation = rigLocation || rigReference || locationReference || 'Unknown';
        const allText = `${rigLocation} ${locationReference} ${rigReference} ${description}`.toLowerCase();
        
        console.log(`     -> Final Location (computed): "${finalLocation}"`);
        console.log(`     -> Contains "mad dog": ${allText.includes('mad dog')}`);
        console.log(`     -> Contains "deepwater": ${allText.includes('deepwater')}`);
        console.log(`     -> Contains "invictus": ${allText.includes('invictus')}`);
      });
    } else {
      console.log(`   ❌ No records found for LC ${lcNumber}`);
    }
  });

  // Also check what Mad Dog drilling LC numbers exist
  console.log('\n🔍 ANALYZING MAD DOG REFERENCES:');
  console.log('=================================');
  
  const madDogRecords = data.filter(row => {
    const rigLocation = String(row["Rig Location"] || '').toLowerCase();
    const locationReference = String(row["Location Reference"] || '').toLowerCase();
    const rigReference = String(row["Rig Reference"] || '').toLowerCase();
    const description = String(row.Description || '').toLowerCase();
    
    const allText = `${rigLocation} ${locationReference} ${rigReference} ${description}`;
    return allText.includes('mad dog') && 
           (allText.includes('drill') || (row['Project Type'] && String(row['Project Type']).toLowerCase().includes('drill')));
  });
  
  console.log(`   Found ${madDogRecords.length} Mad Dog drilling records`);
  
  if (madDogRecords.length > 0) {
    const madDogLCs = new Set();
    madDogRecords.forEach(record => {
      const lc = String(record['LC Number'] || '').trim();
      if (lc) madDogLCs.add(lc);
    });
    
    console.log(`   Mad Dog drilling LC numbers: ${Array.from(madDogLCs).join(', ')}`);
    
    // Check if any of these overlap with Deepwater Invictus
    const overlap = Array.from(madDogLCs).filter(lc => deepwaterInvictusLCs.includes(lc));
    if (overlap.length > 0) {
      console.log(`   ⚠️  OVERLAP DETECTED: ${overlap.join(', ')} appear in both Mad Dog and Deepwater Invictus!`);
    } else {
      console.log(`   ✅ No overlap - Good!`);
    }
  }

  // Check master facilities mapping
  console.log('\n🔍 MASTER FACILITIES MAPPING:');
  console.log('==============================');
  console.log('   Deepwater Invictus drillingLCs: "10140,10133"');
  console.log('   Mad Dog Drilling drillingLCs: "" (empty)');
  
  // Analyze the June 2025 data specifically
  console.log('\n🔍 JUNE 2025 SPECIFIC ANALYSIS:');
  console.log('===============================');
  
  const june2025Records = data.filter(row => {
    const monthYear = String(row['Month-Year'] || '').toLowerCase();
    return monthYear.includes('jun') && monthYear.includes('25');
  });
  
  console.log(`   Found ${june2025Records.length} June 2025 records total`);
  
  const june2025LCs = new Set();
  june2025Records.forEach(record => {
    const lc = String(record['LC Number'] || '').trim();
    if (lc) june2025LCs.add(lc);
  });
  
  console.log(`   June 2025 LC numbers: ${Array.from(june2025LCs).join(', ')}`);
  
  // Check which of our target LCs appear in June 2025
  deepwaterInvictusLCs.forEach(lc => {
    if (june2025LCs.has(lc)) {
      console.log(`   ✅ LC ${lc} found in June 2025 data`);
    } else {
      console.log(`   ❌ LC ${lc} NOT found in June 2025 data`);
    }
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}