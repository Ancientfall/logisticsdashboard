/**
 * Debug the live system to see exactly what's happening with Deepwater Invictus tonnage
 * This will test the actual API endpoints and data flow
 */

const https = require('http');

console.log('🔍 LIVE SYSTEM DEBUG - Deepwater Invictus Tonnage');
console.log('================================================');

// Test the Excel server API
console.log('1. 📡 Testing Excel Server API...');

const testAPI = (path, description) => {
  return new Promise((resolve, reject) => {
    const req = https.get(`http://localhost:5001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`   ✅ ${description}: ${res.statusCode}`);
          resolve(parsed);
        } catch (error) {
          console.log(`   ❌ ${description}: Parse error`);
          resolve(data);
        }
      });
    });
    req.on('error', (error) => {
      console.log(`   ❌ ${description}: ${error.message}`);
      resolve(null);
    });
    req.setTimeout(5000, () => {
      console.log(`   ⏱️ ${description}: Timeout`);
      req.destroy();
      resolve(null);
    });
  });
};

async function runTests() {
  try {
    // Test 1: Check if Excel server is serving files
    const fileList = await testAPI('/api/excel-files', 'Excel files list');
    
    if (fileList && fileList.files) {
      console.log('   📋 Available files:');
      fileList.files.forEach(file => {
        console.log(`      - ${file.name} (${new Date(file.lastModified).toLocaleString()})`);
      });
    }

    // Test 2: Try to get Cost Allocation file directly
    console.log('\\n2. 📊 Testing Cost Allocation File Access...');
    
    const costAllocationResponse = await testAPI('/api/excel-files/Cost%20Allocation.xlsx', 'Cost Allocation file');
    
    if (costAllocationResponse) {
      console.log('   ✅ Cost Allocation file is accessible from API');
    } else {
      console.log('   ❌ Cost Allocation file is NOT accessible from API');
      console.log('   🔧 This could be the issue - dashboard might not be getting updated data');
    }

    // Test 3: Check if development server is running
    console.log('\\n3. 🖥️ Testing Development Server...');
    
    const devServerTest = new Promise((resolve) => {
      const req = https.get('http://localhost:3000', (res) => {
        console.log(`   ✅ Development server responding: ${res.statusCode}`);
        resolve(true);
      });
      req.on('error', (error) => {
        console.log(`   ❌ Development server error: ${error.message}`);
        resolve(false);
      });
      req.setTimeout(3000, () => {
        console.log('   ⏱️ Development server timeout');
        req.destroy();
        resolve(false);
      });
    });

    await devServerTest;

    // Analysis and recommendations
    console.log('\\n🎯 ANALYSIS:');
    console.log('=============');
    
    console.log('\\nIf both servers are running but tonnage is still 697:');
    console.log('\\n1. 🗃️ INDEXEDDB CACHE ISSUE:');
    console.log('   - Open browser Dev Tools (F12)');
    console.log('   - Go to Application tab');
    console.log('   - Find IndexedDB section');
    console.log('   - Delete ALL databases');
    console.log('   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    
    console.log('\\n2. 📅 DATE FILTERING ISSUE:');
    console.log('   - Make sure you are filtering by June 2025');
    console.log('   - Try changing to "All Months" to see if data appears');
    console.log('   - Check if date format in Excel file is correct');
    
    console.log('\\n3. 🎯 LOCATION FILTERING ISSUE:');
    console.log('   - Try "All Locations" instead of "Deepwater Invictus"');
    console.log('   - See if tonnage changes when location filter changes');
    
    console.log('\\n4. 🔄 DATA PROCESSING ISSUE:');
    console.log('   - The system might be using cached processed data');
    console.log('   - Try uploading the Excel files again via the dashboard');
    console.log('   - Use the Monthly Data Upload feature to force reprocessing');
    
    console.log('\\n5. 🧪 QUICK TEST:');
    console.log('   - Go to drilling dashboard');
    console.log('   - Set filter to "All Locations" and "All Months"');
    console.log('   - Look for Deepwater Invictus in the data');
    console.log('   - If you see it there, it is a filtering issue');
    console.log('   - If you do not see it at all, it is a data loading issue');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

runTests();