const XLSX = require('xlsx');

function searchForTBD(filename) {
  console.log(`\n🔍 Examining ${filename}...`);
  
  try {
    const workbook = XLSX.readFile(filename);
    const worksheetNames = workbook.SheetNames;
    
    console.log(`📋 Worksheets: ${worksheetNames.join(', ')}`);
    
    let foundTBD = false;
    
    worksheetNames.forEach(sheetName => {
      console.log(`\n📄 Sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get headers (first row)
      const headers = data[0] || [];
      console.log(`🏷️  Headers (first 8): ${headers.slice(0, 8).join(' | ')}`);
      
      // Search for TBD in all cells
      const tbdRows = [];
      
      data.forEach((row, rowIndex) => {
        const rowTBDs = [];
        row.forEach((cell, colIndex) => {
          if (cell && typeof cell === 'string' && cell.includes('TBD')) {
            rowTBDs.push({
              column: headers[colIndex] || `Col${colIndex}`,
              value: cell
            });
          }
        });
        
        if (rowTBDs.length > 0) {
          tbdRows.push({
            row: rowIndex,
            data: rowTBDs,
            fullRow: row
          });
          foundTBD = true;
        }
      });
      
      if (tbdRows.length > 0) {
        console.log(`✅ Found ${tbdRows.length} rows containing TBD:`);
        tbdRows.slice(0, 10).forEach(({ row, data, fullRow }) => {
          console.log(`   Row ${row + 1}:`);
          data.forEach(({ column, value }) => {
            console.log(`     ${column}: "${value}"`);
          });
          // Show first few columns for context
          const context = fullRow.slice(0, 4).map((cell, idx) => 
            `${headers[idx] || 'Col' + idx}: ${cell || 'N/A'}`
          ).join(' | ');
          console.log(`     Context: ${context}`);
          console.log('');
        });
        if (tbdRows.length > 10) {
          console.log(`     ... and ${tbdRows.length - 10} more rows with TBD`);
        }
      } else {
        console.log(`❌ No TBD found in this sheet`);
      }
    });
    
    if (!foundTBD) {
      console.log(`\n❌ No TBD entries found in ${filename}`);
    }
    
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
  }
}

// Check both files
searchForTBD('/tmp/RigScheduleMeanCase.xlsx');
searchForTBD('/tmp/RigScheduleEarlyCase.xlsx');