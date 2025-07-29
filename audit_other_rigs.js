/**
 * Audit other rig locations (excluding Thunder Horse and Mad Dog) 
 * to identify potential issues similar to Deepwater Invictus
 */

const XLSX = require('xlsx');

console.log('🔍 AUDIT: OTHER RIG LOCATIONS (Excluding Thunder Horse & Mad Dog)');
console.log('================================================================');

try {
  // Load cost allocation data
  const costAllocationPath = 'excel-data/excel-files/Cost Allocation.xlsx';
  const workbook = XLSX.readFile(costAllocationPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const costData = XLSX.utils.sheet_to_json(worksheet);

  // Define drilling rigs from master facilities (excluding Thunder Horse and Mad Dog)
  const otherDrillingRigs = [
    'Ocean Blackhornet',
    'Ocean BlackLion', 
    'Deepwater Invictus',
    'Island Venture',
    'Stena IceMAX',
    'Auriga',
    'Island Intervention',
    'C-Constructor'
  ];

  console.log('📋 DRILLING RIGS TO AUDIT:');
  console.log('===========================');
  otherDrillingRigs.forEach((rig, i) => console.log(`${i + 1}. ${rig}`));
  console.log('');

  // Analyze cost allocation entries
  console.log('🔍 COST ALLOCATION ANALYSIS:');
  console.log('=============================');

  const rigAnalysis = {};

  costData.forEach((entry, index) => {
    const lcNumber = entry['LC Number'];
    const rigLocation = String(entry["Rig Location"] || '').trim();
    const locationReference = String(entry["Location Reference"] || '').trim();
    const rigReference = String(entry["Rig Reference"] || '').trim();
    const description = String(entry.Description || '').trim();
    const projectType = entry['Project Type'];

    // Skip Thunder Horse and Mad Dog (as requested)
    const allFields = [rigLocation, locationReference, rigReference, description].join(' ').toLowerCase();
    if (allFields.includes('thunder horse') || allFields.includes('mad dog')) {
      return;
    }

    // Check if this entry relates to any of our other drilling rigs
    otherDrillingRigs.forEach(rigName => {
      const rigNameLower = rigName.toLowerCase();
      const rigNameVariations = [
        rigNameLower,
        rigNameLower.replace(/\\s+/g, ''),
        rigNameLower.replace('deepwater', '').trim(),
        rigNameLower.replace('island', '').trim(),
        rigNameLower.replace('ocean', '').trim(),
        rigNameLower.replace('stena', '').trim()
      ];

      const matchesRig = rigNameVariations.some(variation => 
        allFields.includes(variation) && variation.length > 3
      );

      if (matchesRig) {
        if (!rigAnalysis[rigName]) {
          rigAnalysis[rigName] = {
            lcNumbers: [],
            fieldUsage: {
              rigLocation: 0,
              locationReference: 0, 
              rigReference: 0,
              descriptionOnly: 0
            },
            projectTypes: {},
            issues: []
          };
        }

        const analysis = rigAnalysis[rigName];
        analysis.lcNumbers.push(lcNumber);

        // Track which field contains the rig name
        if (rigLocation) analysis.fieldUsage.rigLocation++;
        else if (rigReference) analysis.fieldUsage.rigReference++;
        else if (locationReference) analysis.fieldUsage.locationReference++;
        else analysis.fieldUsage.descriptionOnly++;

        // Track project types
        if (projectType) {
          analysis.projectTypes[projectType] = (analysis.projectTypes[projectType] || 0) + 1;
        }

        // Check for potential issues
        if (!rigLocation && !locationReference && !rigReference) {
          analysis.issues.push(`LC ${lcNumber}: No location fields, only in description`);
        }
        
        if (projectType === 'Drilling' && !rigLocation && !locationReference) {
          analysis.issues.push(`LC ${lcNumber}: Drilling LC but only in Rig Reference field`);
        }
      }
    });
  });

  // Report findings
  console.log('📊 FINDINGS BY RIG:');
  console.log('====================');

  Object.entries(rigAnalysis).forEach(([rigName, analysis]) => {
    console.log(`\\n🚢 ${rigName}:`);
    console.log(`   LC Numbers Found: ${analysis.lcNumbers.length} (${analysis.lcNumbers.slice(0, 5).join(', ')}${analysis.lcNumbers.length > 5 ? '...' : ''})`);
    
    console.log('   Field Usage:');
    console.log(`     Rig Location: ${analysis.fieldUsage.rigLocation}`);
    console.log(`     Location Reference: ${analysis.fieldUsage.locationReference}`);
    console.log(`     Rig Reference: ${analysis.fieldUsage.rigReference}`);
    console.log(`     Description Only: ${analysis.fieldUsage.descriptionOnly}`);
    
    console.log('   Project Types:');
    Object.entries(analysis.projectTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
    if (analysis.issues.length > 0) {
      console.log('   ⚠️ POTENTIAL ISSUES:');
      analysis.issues.slice(0, 3).forEach(issue => console.log(`     - ${issue}`));
      if (analysis.issues.length > 3) {
        console.log(`     - ... and ${analysis.issues.length - 3} more`);
      }
    }
  });

  // Check for rigs with no cost allocation data
  console.log('\\n❓ RIGS WITH NO COST ALLOCATION DATA:');
  console.log('======================================');
  const rigsWithNoData = otherDrillingRigs.filter(rig => !rigAnalysis[rig]);
  if (rigsWithNoData.length > 0) {
    rigsWithNoData.forEach(rig => console.log(`- ${rig}`));
  } else {
    console.log('✅ All rigs have cost allocation data');
  }

  // Summary of potential issues
  console.log('\\n🎯 SUMMARY OF POTENTIAL ISSUES:');
  console.log('================================');
  
  let totalIssues = 0;
  Object.entries(rigAnalysis).forEach(([rigName, analysis]) => {
    if (analysis.fieldUsage.rigReference > 0 && analysis.fieldUsage.rigLocation === 0) {
      console.log(`⚠️ ${rigName}: Uses Rig Reference field (like Deepwater Invictus issue)`);
      totalIssues++;
    }
    if (analysis.fieldUsage.descriptionOnly > 0) {
      console.log(`⚠️ ${rigName}: Some LCs only in description field`);
      totalIssues++;
    }
    if (analysis.issues.length > 0) {
      console.log(`⚠️ ${rigName}: ${analysis.issues.length} field mapping issues`);
      totalIssues++;
    }
  });

  if (totalIssues === 0) {
    console.log('✅ No major issues found with other rig locations!');
  } else {
    console.log(`\\n📋 RECOMMENDATIONS:`);
    console.log('===================');
    console.log('1. Review rigs that use "Rig Reference" field exclusively');
    console.log('2. Consider adding missing LC numbers to master facilities');
    console.log('3. Test tonnage calculations for rigs with field mapping issues');
    console.log('4. Verify location name matching works for all rig variations');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}