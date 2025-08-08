const XLSX = require('xlsx');

function analyzeTBDDetails(filename) {
  console.log(`\n🔍 Detailed TBD Analysis for ${filename}...`);
  
  try {
    const workbook = XLSX.readFile(filename);
    const worksheetNames = workbook.SheetNames;
    
    worksheetNames.forEach(sheetName => {
      console.log(`\n📄 Sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get headers
      const headers = data[0] || [];
      console.log(`🏷️  Headers: ${headers.join(' | ')}`);
      
      // Find TBD #02 and TBD #07 specifically
      const tbdRigs = data.filter((row, index) => {
        if (index === 0) return false; // Skip header row
        return row.some(cell => 
          cell && typeof cell === 'string' && 
          (cell.includes('TBD #02') || cell.includes('TBD #07') || cell.includes('GOM.TBD#02') || cell.includes('GOM.TBD#07'))
        );
      });
      
      console.log(`\n🎯 Found ${tbdRigs.length} rows with TBD #02 or TBD #07:`);
      
      tbdRigs.forEach((row, index) => {
        console.log(`\n   Row ${data.indexOf(row) + 1}:`);
        
        // Map each cell to its header
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          if (value !== undefined && value !== null && value !== '') {
            console.log(`     ${header}: ${value}`);
          }
        });
      });
      
      // Also look for date ranges
      if (tbdRigs.length > 0) {
        console.log(`\n📅 Date Analysis for TBD activities:`);
        const startCol = headers.findIndex(h => h && (h.includes('Start') || h.includes('start')));
        const finishCol = headers.findIndex(h => h && (h.includes('Finish') || h.includes('finish') || h.includes('End') || h.includes('end')));
        
        console.log(`Start column index: ${startCol} (${headers[startCol]})`);
        console.log(`Finish column index: ${finishCol} (${headers[finishCol]})`);
        
        tbdRigs.forEach((row, index) => {
          const startDate = row[startCol];
          const finishDate = row[finishCol];
          const rigName = row[headers.findIndex(h => h && h.includes('Rig'))];
          const activityName = row[headers.findIndex(h => h && h.includes('Activity Name'))];
          
          console.log(`     ${rigName} - ${activityName}: ${startDate} to ${finishDate}`);
        });
      }
    });
    
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
  }
}

// Analyze both files
analyzeTBDDetails('/tmp/RigScheduleMeanCase.xlsx');
analyzeTBDDetails('/tmp/RigScheduleEarlyCase.xlsx');