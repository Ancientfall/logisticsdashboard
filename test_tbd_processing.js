const XLSX = require('xlsx');
const path = require('path');

// Import the actual processing functions (we'll simulate this)
function parseExcelSerialDate(serial) {
  if (typeof serial === 'number' && serial > 0 && serial < 2958466) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    return date;
  }
  return null;
}

function testTBDProcessing() {
  console.log('🔍 Testing TBD data processing with updated column mappings...\n');
  
  try {
    // Load the Excel files
    const meanCaseWorkbook = XLSX.readFile('/tmp/RigScheduleMeanCase.xlsx');
    const earlyCaseWorkbook = XLSX.readFile('/tmp/RigScheduleEarlyCase.xlsx');
    
    const meanSheet = meanCaseWorkbook.Sheets['MEAN CASE'];
    const earlySheet = earlyCaseWorkbook.Sheets['EARLY CASE'];
    
    // Convert to JSON with header row
    const meanData = XLSX.utils.sheet_to_json(meanSheet);
    const earlyData = XLSX.utils.sheet_to_json(earlySheet);
    
    console.log(`📊 Mean Case: ${meanData.length} total rows`);
    console.log(`📊 Early Case: ${earlyData.length} total rows\n`);
    
    // Test processing for TBD activities
    const meanTBDActivities = meanData.filter(row => 
      row['GWDXAG-Rig Name'] && (
        row['GWDXAG-Rig Name'].includes('TBD #02') || 
        row['GWDXAG-Rig Name'].includes('TBD #07')
      )
    );
    
    const earlyTBDActivities = earlyData.filter(row => 
      row['GWDXAG-Rig Name'] && (
        row['GWDXAG-Rig Name'].includes('TBD #02') || 
        row['GWDXAG-Rig Name'].includes('TBD #07')
      )
    );
    
    console.log(`✅ Found ${meanTBDActivities.length} TBD activities in Mean Case`);
    console.log(`✅ Found ${earlyTBDActivities.length} TBD activities in Early Case\n`);
    
    // Test date parsing for TBD activities
    console.log('📅 Testing date parsing for TBD activities:\n');
    
    const testActivities = meanTBDActivities.slice(0, 5); // Test first 5
    testActivities.forEach((activity, index) => {
      const rigName = activity['GWDXAG-Rig Name'];
      const activityName = activity['Activity Name'];
      const startSerial = activity['(*)Start'];
      const finishSerial = activity['(*)Finish'];
      
      console.log(`${index + 1}. ${rigName} - ${activityName}`);
      console.log(`   Raw Start: ${startSerial} (${typeof startSerial})`);
      console.log(`   Raw Finish: ${finishSerial} (${typeof finishSerial})`);
      
      if (typeof startSerial === 'number') {
        const startDate = parseExcelSerialDate(startSerial);
        console.log(`   Parsed Start: ${startDate ? startDate.toISOString().substring(0, 10) : 'Failed'}`);
      }
      
      if (typeof finishSerial === 'number') {
        const finishDate = parseExcelSerialDate(finishSerial);
        console.log(`   Parsed Finish: ${finishDate ? finishDate.toISOString().substring(0, 10) : 'Failed'}`);
      }
      
      console.log('');
    });
    
    // Check if activities fall within forecast period
    const forecastStart = new Date(2026, 0, 1); // Jan 1, 2026
    const forecastEnd = new Date(2027, 5, 30); // June 30, 2027
    
    console.log(`📊 Forecast Period: ${forecastStart.toISOString().substring(0, 10)} to ${forecastEnd.toISOString().substring(0, 10)}\n`);
    
    const inForecastPeriod = meanTBDActivities.filter(activity => {
      const startDate = parseExcelSerialDate(activity['(*)Start']);
      return startDate && startDate >= forecastStart && startDate <= forecastEnd;
    });
    
    console.log(`🎯 TBD activities within forecast period: ${inForecastPeriod.length}`);
    inForecastPeriod.forEach(activity => {
      const startDate = parseExcelSerialDate(activity['(*)Start']);
      console.log(`   ${activity['GWDXAG-Rig Name']} - ${activity['Activity Name']} (${startDate.toISOString().substring(0, 10)})`);
    });
    
    if (inForecastPeriod.length > 0) {
      console.log('\n✅ SUCCESS: TBD activities found within forecast period!');
      console.log('   These should now appear in the vessel forecast dashboard.');
    } else {
      console.log('\n❌ No TBD activities found within forecast period.');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testTBDProcessing();