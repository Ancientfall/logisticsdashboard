/**
 * PSV/OSV Voyage Capacity Analysis Tool
 * Analyzes actual PSV performance from VesselManifest data to replace theoretical assumptions
 */

const XLSX = require('xlsx');
const path = require('path');

// Contract rigs to focus analysis on
const CONTRACT_RIGS = [
  'Ocean BlackLion', 'Ocean Blackhornet', 'Thunder Horse Drilling', 
  'Mad Dog Drilling', 'Stena IceMAX', 'Deepwater Invictus', 
  'Atlantis PQ', 'Argos', 'Thunder Horse Prod', 'Mad Dog Prod', 'Na Kika'
];

// Helper functions
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date) && date.getFullYear() === 2025;
};

const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Handle Excel serial date format
  if (typeof dateValue === 'number') {
    // Excel serial date: days since 1900-01-01 (with leap year bug)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
    return isValidDate(date) ? date : null;
  }
  
  // Handle string dates
  const date = new Date(dateValue);
  return isValidDate(date) ? date : null;
};

const isPSVOSV = (vessel) => {
  if (!vessel) return false;
  const vesselName = vessel.toLowerCase().trim();
  
  // Exclude Fast vessels
  if (vesselName.includes('fast')) return false;
  
  // Include PSV/OSV vessels
  return vesselName.includes('psv') || 
         vesselName.includes('osv') || 
         vesselName.includes('supply') ||
         vesselName.includes('vessel') ||
         // Common PSV naming patterns
         /^(hb|c|sea|gulf|island|cape)\s?\w+/i.test(vesselName) ||
         // Exclude obvious non-PSV vessels
         (!vesselName.includes('tug') && 
          !vesselName.includes('barge') && 
          !vesselName.includes('crane') &&
          !vesselName.includes('anchor'));
};

const isServingContractRigs = (manifest) => {
  const location = manifest.mappedLocation || manifest.offshoreLocation || '';
  return CONTRACT_RIGS.some(rig => 
    location.toLowerCase().includes(rig.toLowerCase().replace(' ', '')) ||
    location.toLowerCase().includes(rig.toLowerCase())
  );
};

const getMonthName = (monthNum) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNum - 1] || 'Unknown';
};

const getQuarter = (monthNum) => {
  return Math.ceil(monthNum / 3);
};

// Main analysis function
async function analyzePSVCapacity() {
  try {
    console.log('🚢 Starting PSV/OSV Voyage Capacity Analysis...\n');
    
    // Load VesselManifest data
    const manifestPath = path.join(__dirname, 'excel-data', 'excel-files', 'Vessel Manifests.xlsx');
    console.log(`📊 Loading manifest data from: ${manifestPath}`);
    
    const workbook = XLSX.readFile(manifestPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📈 Loaded ${rawData.length} total manifest records`);
    
    // First, let's examine the data to understand vessel naming patterns and locations
    console.log('\n🔍 EXAMINING DATA STRUCTURE...');
    const sampleRecord = rawData[0];
    console.log('Sample record fields:');
    Object.keys(sampleRecord).forEach(key => {
      console.log(`  ${key}: ${sampleRecord[key]}`);
    });
    
    // Analyze unique vessel names to understand patterns
    const vesselNames = [...new Set(rawData.map(row => row['Transporter']).filter(name => name))];
    console.log(`\n📋 Found ${vesselNames.length} unique vessel names`);
    console.log('Sample vessel names:', vesselNames.slice(0, 10));
    
    // Analyze offshore locations to understand contract rig patterns
    const offshoreLocations = [...new Set(rawData.map(row => row['Offshore Location']).filter(loc => loc))];
    console.log(`\n📍 Found ${offshoreLocations.length} unique offshore locations`);
    console.log('Sample locations:', offshoreLocations.slice(0, 10));
    
    // Process data with more inclusive filtering for initial analysis
    const processedData = rawData
      .map(row => {
        const manifestDate = parseDate(row['Manifest Date']);
        if (!manifestDate) return null;
        
        return {
          voyageId: row['Voyage Id'],
          manifestNumber: row['Manifest Number'],
          transporter: row['Transporter'],
          manifestDate,
          month: manifestDate.getMonth() + 1,
          monthName: getMonthName(manifestDate.getMonth() + 1),
          quarter: getQuarter(manifestDate.getMonth() + 1),
          offshoreLocation: row['Offshore Location'],
          mappedLocation: row['Offshore Location'], // Simplified for this analysis
          from: row['From'],
          deckTons: parseFloat(row['deck tons (metric)']) || 0,
          rtTons: parseFloat(row['RT Tons']) || 0,
          lifts: parseInt(row['Lifts']) || 0,
          rtLifts: parseInt(row['RTLifts']) || 0,
        };
      })
      .filter(item => item !== null);
    
    console.log(`\n📊 Processed ${processedData.length} valid records with dates`);
    
    // Let's see what we have by filtering steps
    const step1_2025 = processedData.filter(item => item.manifestDate.getFullYear() === 2025);
    console.log(`Step 1 - 2025 data: ${step1_2025.length} records`);
    
    const step2_excludeFast = step1_2025.filter(item => !item.transporter || !item.transporter.toLowerCase().includes('fast'));
    console.log(`Step 2 - Exclude Fast vessels: ${step2_excludeFast.length} records`);
    
    const step3_contractRigs = step2_excludeFast.filter(item => isServingContractRigs(item));
    console.log(`Step 3 - Contract rigs only: ${step3_contractRigs.length} records`);
    
    // Show which contract rigs are actually found in the data
    const contractRigMatches = {};
    CONTRACT_RIGS.forEach(rig => {
      const matches = step2_excludeFast.filter(item => {
        const location = item.mappedLocation || item.offshoreLocation || '';
        return location.toLowerCase().includes(rig.toLowerCase().replace(' ', '')) ||
               location.toLowerCase().includes(rig.toLowerCase());
      });
      if (matches.length > 0) {
        contractRigMatches[rig] = matches.length;
      }
    });
    
    console.log('\n🎯 Contract rig matches found:');
    Object.entries(contractRigMatches).forEach(([rig, count]) => {
      console.log(`  ${rig}: ${count} records`);
    });
    
    // Use the contract rig filtered data for analysis
    const finalData = step3_contractRigs;
    console.log(`\n🎯 Final filtered dataset: ${finalData.length} records for analysis\n`);
    
    if (finalData.length === 0) {
      console.log('❌ No filtered data found for analysis');
      return;
    }
    
    // Group by vessel for analysis
    const vesselStats = {};
    
    finalData.forEach(record => {
      const vessel = record.transporter.trim();
      
      if (!vesselStats[vessel]) {
        vesselStats[vessel] = {
          vessel,
          voyages: new Set(),
          monthlyVoyages: {},
          totalRecords: 0,
          locations: new Set(),
          quarters: {1: 0, 2: 0, 3: 0, 4: 0}
        };
      }
      
      const stats = vesselStats[vessel];
      stats.voyages.add(record.voyageId);
      stats.totalRecords++;
      stats.locations.add(record.mappedLocation);
      stats.quarters[record.quarter]++;
      
      // Track monthly performance
      const monthKey = `${record.monthName}`;
      if (!stats.monthlyVoyages[monthKey]) {
        stats.monthlyVoyages[monthKey] = new Set();
      }
      stats.monthlyVoyages[monthKey].add(record.voyageId);
    });
    
    // Calculate performance metrics for each vessel
    const vesselPerformance = Object.values(vesselStats).map(stats => {
      const totalVoyages = stats.voyages.size;
      const monthsActive = Object.keys(stats.monthlyVoyages).length;
      const avgVoyagesPerMonth = monthsActive > 0 ? totalVoyages / monthsActive : 0;
      const avgVoyagesPerWeek = avgVoyagesPerMonth / 4.33; // Average weeks per month
      
      // Calculate peak monthly performance
      const monthlyVoyageCounts = Object.values(stats.monthlyVoyages).map(voyageSet => voyageSet.size);
      const peakMonthlyPerformance = Math.max(...monthlyVoyageCounts, 0);
      
      return {
        vessel: stats.vessel,
        totalVoyages,
        monthsActive,
        avgVoyagesPerMonth: Math.round(avgVoyagesPerMonth * 100) / 100,
        avgVoyagesPerWeek: Math.round(avgVoyagesPerWeek * 100) / 100,
        peakMonthlyPerformance,
        totalRecords: stats.totalRecords,
        uniqueLocations: stats.locations.size,
        monthlyBreakdown: Object.keys(stats.monthlyVoyages).reduce((acc, month) => {
          acc[month] = stats.monthlyVoyages[month].size;
          return acc;
        }, {}),
        quarterlyBreakdown: stats.quarters
      };
    });
    
    // Sort by total voyages descending
    vesselPerformance.sort((a, b) => b.totalVoyages - a.totalVoyages);
    
    console.log('='.repeat(80));
    console.log('📊 PSV/OSV VOYAGE CAPACITY ANALYSIS RESULTS');
    console.log('='.repeat(80));
    
    // Overall statistics
    const totalVessels = vesselPerformance.length;
    const totalVoyages = vesselPerformance.reduce((sum, v) => sum + v.totalVoyages, 0);
    const avgVoyagesPerVessel = totalVoyages / totalVessels;
    const avgMonthlyVoyages = vesselPerformance.reduce((sum, v) => sum + v.avgVoyagesPerMonth, 0) / totalVessels;
    
    console.log(`\n📈 OVERALL STATISTICS (2025 YTD - Jan-Jun)`);
    console.log(`Total PSV/OSV vessels analyzed: ${totalVessels}`);
    console.log(`Total voyages completed: ${totalVoyages}`);
    console.log(`Average voyages per vessel (YTD): ${Math.round(avgVoyagesPerVessel * 100) / 100}`);
    console.log(`Average monthly voyages per vessel: ${Math.round(avgMonthlyVoyages * 100) / 100}`);
    
    // Top performers (top quartile)
    const topQuartileCount = Math.ceil(totalVessels * 0.25);
    const topPerformers = vesselPerformance.slice(0, topQuartileCount);
    const topPerformerAvgMonthly = topPerformers.reduce((sum, v) => sum + v.avgVoyagesPerMonth, 0) / topPerformers.length;
    
    console.log(`\n🏆 TOP QUARTILE PERFORMANCE (${topQuartileCount} vessels)`);
    console.log(`Average monthly voyages (top quartile): ${Math.round(topPerformerAvgMonthly * 100) / 100}`);
    console.log(`Peak monthly performance range: ${Math.min(...topPerformers.map(v => v.peakMonthlyPerformance))} - ${Math.max(...topPerformers.map(v => v.peakMonthlyPerformance))} voyages`);
    
    // Detailed vessel performance
    console.log(`\n🚢 DETAILED VESSEL PERFORMANCE (Top 15 vessels)`);
    console.log('-'.repeat(120));
    console.log('Vessel'.padEnd(25) + 'Total'.padEnd(8) + 'Avg/Month'.padEnd(12) + 'Peak Month'.padEnd(12) + 'Months Active'.padEnd(15) + 'Monthly Breakdown');
    console.log('-'.repeat(120));
    
    vesselPerformance.slice(0, 15).forEach(vessel => {
      const monthlyStr = Object.entries(vessel.monthlyBreakdown)
        .map(([month, count]) => `${month}:${count}`)
        .join(', ');
      
      console.log(
        vessel.vessel.padEnd(25) +
        vessel.totalVoyages.toString().padEnd(8) +
        vessel.avgVoyagesPerMonth.toString().padEnd(12) +
        vessel.peakMonthlyPerformance.toString().padEnd(12) +
        vessel.monthsActive.toString().padEnd(15) +
        monthlyStr
      );
    });
    
    // Monthly trend analysis
    const monthlyTrends = {};
    processedData.forEach(record => {
      const monthKey = record.monthName;
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = new Set();
      }
      monthlyTrends[monthKey].add(record.voyageId);
    });
    
    console.log(`\n📅 MONTHLY VOYAGE TRENDS (2025 YTD)`);
    console.log('-'.repeat(40));
    Object.entries(monthlyTrends)
      .sort((a, b) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].indexOf(a[0]) - ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].indexOf(b[0]))
      .forEach(([month, voyageSet]) => {
        console.log(`${month}: ${voyageSet.size} total voyages`);
      });
    
    // Performance distribution analysis
    const voyageRanges = {
      'Low (1-3/month)': vesselPerformance.filter(v => v.avgVoyagesPerMonth <= 3).length,
      'Medium (4-6/month)': vesselPerformance.filter(v => v.avgVoyagesPerMonth > 3 && v.avgVoyagesPerMonth <= 6).length,
      'High (7-9/month)': vesselPerformance.filter(v => v.avgVoyagesPerMonth > 6 && v.avgVoyagesPerMonth <= 9).length,
      'Exceptional (10+/month)': vesselPerformance.filter(v => v.avgVoyagesPerMonth > 9).length
    };
    
    console.log(`\n📊 PERFORMANCE DISTRIBUTION`);
    console.log('-'.repeat(40));
    Object.entries(voyageRanges).forEach(([range, count]) => {
      const percentage = Math.round((count / totalVessels) * 100);
      console.log(`${range}: ${count} vessels (${percentage}%)`);
    });
    
    // Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS FOR PSV CAPACITY ASSUMPTIONS');
    console.log('='.repeat(80));
    
    const currentAssumption = 6;
    const actualAverage = Math.round(avgMonthlyVoyages * 100) / 100;
    const topQuartileCapacity = Math.round(topPerformerAvgMonthly * 100) / 100;
    
    console.log(`\n📋 CAPACITY ANALYSIS:`);
    console.log(`• Current theoretical assumption: ${currentAssumption} voyages/month/vessel`);
    console.log(`• Actual average performance: ${actualAverage} voyages/month/vessel`);
    console.log(`• Top quartile average: ${topQuartileCapacity} voyages/month/vessel`);
    console.log(`• Peak individual performance: ${Math.max(...vesselPerformance.map(v => v.peakMonthlyPerformance))} voyages/month`);
    
    console.log(`\n🎯 RECOMMENDATIONS:`);
    
    if (actualAverage < currentAssumption) {
      console.log(`• REDUCE theoretical capacity to ${Math.ceil(actualAverage)} voyages/month (current assumption is optimistic)`);
    } else if (actualAverage > currentAssumption) {
      console.log(`• INCREASE theoretical capacity to ${Math.floor(actualAverage)} voyages/month (current assumption is conservative)`);
    } else {
      console.log(`• MAINTAIN current assumption of ${currentAssumption} voyages/month (reasonably accurate)`);
    }
    
    console.log(`• For planning purposes, use ${topQuartileCapacity} voyages/month as "theoretical maximum" under good conditions`);
    console.log(`• Consider seasonal variations: Q1-Q2 average appears different from historical patterns`);
    console.log(`• Top-performing vessels achieve ${topQuartileCapacity}+ voyages/month consistently`);
    
    console.log(`\n🔍 KEY INSIGHTS:`);
    console.log(`• ${Math.round((voyageRanges['High (7-9/month)'] + voyageRanges['Exceptional (10+/month)']) / totalVessels * 100)}% of vessels exceed the current 6 voyage/month assumption`);
    console.log(`• ${Math.round(voyageRanges['Low (1-3/month)'] / totalVessels * 100)}% of vessels significantly underperform the assumption`);
    console.log(`• Performance varies significantly by vessel, suggesting operational or route-specific factors`);
    
    // Export detailed data for further analysis
    console.log(`\n📄 Detailed vessel performance data has been calculated and displayed above.`);
    console.log(`   This analysis covers ${finalData.length} manifest records from ${totalVessels} PSV/OSV vessels.`);
    
  } catch (error) {
    console.error('❌ Error during PSV capacity analysis:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the analysis
if (require.main === module) {
  analyzePSVCapacity();
}

module.exports = { analyzePSVCapacity };