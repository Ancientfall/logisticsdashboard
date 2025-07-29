/**
 * Detailed PSV Insights - Enhanced Analysis for Business Recommendations
 * Provides deeper insights into PSV operational capacity and performance patterns
 */

const XLSX = require('xlsx');
const path = require('path');

// Enhanced analysis function
function generateDetailedInsights() {
  try {
    console.log('🔍 DETAILED PSV OPERATIONAL INSIGHTS');
    console.log('='.repeat(80));
    
    // Load data
    const manifestPath = path.join(__dirname, 'excel-data', 'excel-files', 'Vessel Manifests.xlsx');
    const workbook = XLSX.readFile(manifestPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        return date.getFullYear() === 2025 ? date : null;
      }
      const date = new Date(dateValue);
      return date.getFullYear() === 2025 ? date : null;
    };
    
    // Process 2025 YTD data excluding Fast vessels
    const processedData = rawData
      .map(row => {
        const manifestDate = parseDate(row['Manifest Date']);
        if (!manifestDate) return null;
        
        return {
          voyageId: row['Voyage Id'],
          transporter: row['Transporter'],
          manifestDate,
          month: manifestDate.getMonth() + 1,
          week: Math.ceil(manifestDate.getDate() / 7),
          offshoreLocation: row['Offshore Location'],
          deckTons: parseFloat(row['deck tons (metric)']) || 0,
          rtTons: parseFloat(row['RT Tons']) || 0,
          lifts: parseInt(row['Lifts']) || 0,
        };
      })
      .filter(item => item !== null)
      .filter(item => !item.transporter?.toLowerCase().includes('fast'));
    
    console.log(`📊 Analyzing ${processedData.length} PSV records from 2025 YTD`);
    
    // Enhanced vessel performance analysis
    const vesselMetrics = {};
    
    processedData.forEach(record => {
      const vessel = record.transporter?.trim();
      if (!vessel) return;
      
      if (!vesselMetrics[vessel]) {
        vesselMetrics[vessel] = {
          voyages: new Set(),
          weeks: new Set(),
          months: new Set(),
          totalCargo: { deck: 0, rt: 0, lifts: 0 },
          weeklyPerformance: {},
          consistencyScore: 0,
          utilizationPattern: {}
        };
      }
      
      const metrics = vesselMetrics[vessel];
      metrics.voyages.add(record.voyageId);
      metrics.weeks.add(`${record.month}-W${record.week}`);
      metrics.months.add(record.month);
      metrics.totalCargo.deck += record.deckTons;
      metrics.totalCargo.rt += record.rtTons;
      metrics.totalCargo.lifts += record.lifts;
      
      // Track weekly performance
      const weekKey = `${record.month}-W${record.week}`;
      if (!metrics.weeklyPerformance[weekKey]) {
        metrics.weeklyPerformance[weekKey] = new Set();
      }
      metrics.weeklyPerformance[weekKey].add(record.voyageId);
    });
    
    // Calculate enhanced metrics
    const performanceAnalysis = Object.entries(vesselMetrics).map(([vessel, metrics]) => {
      const totalVoyages = metrics.voyages.size;
      const activeWeeks = metrics.weeks.size;
      const activeMonths = metrics.months.size;
      
      const avgVoyagesPerWeek = activeWeeks > 0 ? totalVoyages / activeWeeks : 0;
      const avgVoyagesPerMonth = activeMonths > 0 ? totalVoyages / activeMonths : 0;
      
      // Calculate consistency score (how evenly distributed voyages are across time)
      const weeklyVoyageCounts = Object.values(metrics.weeklyPerformance).map(voyageSet => voyageSet.size);
      const avgWeeklyVoyages = weeklyVoyageCounts.reduce((sum, count) => sum + count, 0) / weeklyVoyageCounts.length || 0;
      const variance = weeklyVoyageCounts.reduce((sum, count) => sum + Math.pow(count - avgWeeklyVoyages, 2), 0) / weeklyVoyageCounts.length || 0;
      const consistencyScore = avgWeeklyVoyages > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avgWeeklyVoyages * 100)) : 0;
      
      return {
        vessel,
        totalVoyages,
        activeWeeks,
        activeMonths,
        avgVoyagesPerWeek: Math.round(avgVoyagesPerWeek * 100) / 100,
        avgVoyagesPerMonth: Math.round(avgVoyagesPerMonth * 100) / 100,
        consistencyScore: Math.round(consistencyScore),
        totalCargoTons: Math.round((metrics.totalCargo.deck + metrics.totalCargo.rt) * 100) / 100,
        avgCargoPerVoyage: Math.round(((metrics.totalCargo.deck + metrics.totalCargo.rt) / totalVoyages) * 100) / 100,
        totalLifts: metrics.totalCargo.lifts,
        weeklyBreakdown: metrics.weeklyPerformance
      };
    }).sort((a, b) => b.totalVoyages - a.totalVoyages);
    
    console.log('\n🎯 OPERATIONAL PERFORMANCE INSIGHTS');
    console.log('-'.repeat(80));
    
    // Top performers analysis
    const topQuartile = Math.ceil(performanceAnalysis.length * 0.25);
    const topPerformers = performanceAnalysis.slice(0, topQuartile);
    const bottomQuartile = performanceAnalysis.slice(-Math.ceil(performanceAnalysis.length * 0.25));
    
    console.log(`\n🏆 TOP QUARTILE VESSELS (${topQuartile} vessels):`);
    topPerformers.forEach((vessel, idx) => {
      console.log(`${idx + 1}. ${vessel.vessel.padEnd(20)} | ${vessel.totalVoyages} voyages | ${vessel.avgVoyagesPerMonth}/month | ${vessel.avgVoyagesPerWeek}/week | Consistency: ${vessel.consistencyScore}%`);
    });
    
    console.log(`\n⚠️ BOTTOM QUARTILE VESSELS (${bottomQuartile.length} vessels):`);
    bottomQuartile.forEach((vessel, idx) => {
      console.log(`${idx + 1}. ${vessel.vessel.padEnd(20)} | ${vessel.totalVoyages} voyages | ${vessel.avgVoyagesPerMonth}/month | ${vessel.avgVoyagesPerWeek}/week | Consistency: ${vessel.consistencyScore}%`);
    });
    
    // Capacity utilization analysis
    const utilizationTiers = {
      'High Utilization (>6/month)': performanceAnalysis.filter(v => v.avgVoyagesPerMonth > 6),
      'Optimal Utilization (4-6/month)': performanceAnalysis.filter(v => v.avgVoyagesPerMonth >= 4 && v.avgVoyagesPerMonth <= 6),
      'Low Utilization (2-4/month)': performanceAnalysis.filter(v => v.avgVoyagesPerMonth >= 2 && v.avgVoyagesPerMonth < 4),
      'Very Low Utilization (<2/month)': performanceAnalysis.filter(v => v.avgVoyagesPerMonth < 2)
    };
    
    console.log('\n📊 CAPACITY UTILIZATION DISTRIBUTION');
    console.log('-'.repeat(50));
    Object.entries(utilizationTiers).forEach(([tier, vessels]) => {
      const percentage = Math.round((vessels.length / performanceAnalysis.length) * 100);
      const avgVoyages = vessels.length > 0 ? Math.round((vessels.reduce((sum, v) => sum + v.avgVoyagesPerMonth, 0) / vessels.length) * 100) / 100 : 0;
      console.log(`${tier}: ${vessels.length} vessels (${percentage}%) - Avg: ${avgVoyages}/month`);
    });
    
    // Seasonal pattern analysis
    const monthlyTotals = processedData.reduce((acc, record) => {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][record.month - 1];
      if (!acc[monthName]) acc[monthName] = new Set();
      acc[monthName].add(record.voyageId);
      return acc;
    }, {});
    
    console.log('\n📅 SEASONAL VOYAGE PATTERNS');
    console.log('-'.repeat(40));
    Object.entries(monthlyTotals).forEach(([month, voyageSet]) => {
      const weeklyAvg = Math.round((voyageSet.size / 4.33) * 10) / 10; // Convert monthly to weekly average
      console.log(`${month}: ${voyageSet.size} voyages (${weeklyAvg}/week avg)`);
    });
    
    // Fleet efficiency insights
    const fleetMetrics = {
      totalFleetVoyages: performanceAnalysis.reduce((sum, v) => sum + v.totalVoyages, 0),
      totalFleetCargoTons: performanceAnalysis.reduce((sum, v) => sum + v.totalCargoTons, 0),
      avgFleetUtilization: performanceAnalysis.reduce((sum, v) => sum + v.avgVoyagesPerMonth, 0) / performanceAnalysis.length,
      highConsistencyVessels: performanceAnalysis.filter(v => v.consistencyScore >= 70).length,
      lowConsistencyVessels: performanceAnalysis.filter(v => v.consistencyScore < 50).length
    };
    
    console.log('\n🚢 FLEET EFFICIENCY ANALYSIS');
    console.log('-'.repeat(50));
    console.log(`Total Fleet Capacity: ${fleetMetrics.totalFleetVoyages} voyages in 6 months`);
    console.log(`Average Fleet Utilization: ${Math.round(fleetMetrics.avgFleetUtilization * 100) / 100} voyages/month/vessel`);
    console.log(`Total Cargo Moved: ${Math.round(fleetMetrics.totalFleetCargoTons)} metric tons`);
    console.log(`High Consistency Vessels: ${fleetMetrics.highConsistencyVessels} vessels (≥70% consistency)`);
    console.log(`Low Consistency Vessels: ${fleetMetrics.lowConsistencyVessels} vessels (<50% consistency)`);
    
    // Business recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💼 STRATEGIC BUSINESS RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    const currentAssumption = 6;
    const actualFleetAvg = Math.round(fleetMetrics.avgFleetUtilization * 100) / 100;
    const topQuartileAvg = Math.round((topPerformers.reduce((sum, v) => sum + v.avgVoyagesPerMonth, 0) / topPerformers.length) * 100) / 100;
    
    console.log('\n🎯 CAPACITY PLANNING RECOMMENDATIONS:');
    console.log(`• Current Assumption: ${currentAssumption} voyages/month/vessel`);
    console.log(`• Actual Fleet Average: ${actualFleetAvg} voyages/month/vessel`);
    console.log(`• Top Quartile Average: ${topQuartileAvg} voyages/month/vessel`);
    console.log(`• Realistic Planning Capacity: ${Math.floor(actualFleetAvg)} voyages/month/vessel`);
    console.log(`• Optimistic Planning Capacity: ${Math.floor(topQuartileAvg)} voyages/month/vessel`);
    
    console.log('\n📈 OPERATIONAL OPTIMIZATION OPPORTUNITIES:');
    console.log(`• ${fleetMetrics.lowConsistencyVessels} vessels show inconsistent performance - investigate operational constraints`);
    console.log(`• ${utilizationTiers['Very Low Utilization (<2/month)'].length} vessels are significantly underutilized - consider redeployment`);
    console.log(`• ${utilizationTiers['High Utilization (>6/month)'].length} vessels exceed current assumptions - analyze best practices`);
    
    console.log('\n⚠️ RISK CONSIDERATIONS:');
    console.log(`• Current ${currentAssumption} voyage/month assumption overstates capacity by ${Math.round(((currentAssumption - actualFleetAvg) / currentAssumption) * 100)}%`);
    console.log(`• Weather, maintenance, and operational delays appear to significantly impact realized capacity`);
    console.log(`• High variability in vessel performance suggests need for vessel-specific capacity planning`);
    
    console.log('\n🔧 IMPLEMENTATION RECOMMENDATIONS:');
    console.log(`• Update theoretical capacity assumption to ${Math.ceil(actualFleetAvg)} voyages/month/vessel`);
    console.log(`• Use ${Math.ceil(topQuartileAvg)} voyages/month for best-case scenario planning`);
    console.log(`• Implement vessel-specific capacity factors based on historical performance`);
    console.log(`• Focus improvement efforts on the ${fleetMetrics.lowConsistencyVessels} low-consistency vessels`);
    
  } catch (error) {
    console.error('❌ Error in detailed PSV analysis:', error);
  }
}

// Run the analysis
if (require.main === module) {
  generateDetailedInsights();
}

module.exports = { generateDetailedInsights };