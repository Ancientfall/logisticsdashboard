// Manual test to simulate the React app data loading process
import fs from 'fs';
import fetch from 'node-fetch';

// Simulate server file loading and check console output patterns
async function manualDataTest() {
  console.log('🧪 Manual data loading test...');
  
  try {
    // Step 1: Verify server files are available
    console.log('\n1. Checking server availability...');
    const serverResponse = await fetch('http://localhost:5001/api/excel-files');
    
    if (!serverResponse.ok) {
      console.error('❌ Excel server not responding on localhost:5001');
      console.log('Please run: npm run excel-server');
      return;
    }
    
    const serverData = await serverResponse.json();
    const vesselManifestFile = serverData.files.find(f => f.name === 'Vessel Manifests.xlsx');
    
    if (!vesselManifestFile) {
      console.error('❌ Vessel Manifests.xlsx not found on server');
      return;
    }
    
    console.log(`✅ Server running, Vessel Manifests.xlsx available (${vesselManifestFile.size} bytes)`);
    
    // Step 2: Test file download
    console.log('\n2. Testing file download...');
    const downloadResponse = await fetch('http://localhost:5001/api/excel-files/Vessel%20Manifests.xlsx');
    
    if (!downloadResponse.ok) {
      console.error(`❌ Failed to download file: ${downloadResponse.status}`);
      return;
    }
    
    const buffer = await downloadResponse.buffer();
    console.log(`✅ File downloaded successfully: ${buffer.length} bytes`);
    
    // Step 3: Check React app accessibility
    console.log('\n3. Checking React app...');
    
    try {
      const reactResponse = await fetch('http://localhost:3000', { timeout: 2000 });
      if (reactResponse.ok) {
        console.log('✅ React app is running on localhost:3000');
        console.log('\n📋 To see the debug output:');
        console.log('1. Open http://localhost:3000/upload in your browser');
        console.log('2. Click "Load Data from Server"');
        console.log('3. Check the browser console for debug messages');
        console.log('4. Look for these debug patterns:');
        console.log('   - 🚢 Processing X vessel manifests...');
        console.log('   - 📋 Sample raw vessel manifest fields...');
        console.log('   - 🔍 First processed vessel manifest...');
        console.log('   - 🎯 useDataOperations: setVesselManifests called...');
        console.log('   - 🔍 calculateEnhancedManifestMetrics called...');
        console.log('   - 🎯 RT Lifts calculation...');
      } else {
        console.log('⚠️ React app not running. Start with: npm start');
      }
    } catch (error) {
      console.log('⚠️ React app not running. Start with: npm start');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Ensure React app is running (npm start)');
    console.log('2. Navigate to the data upload page');
    console.log('3. Trigger server data loading');
    console.log('4. Monitor browser console for the debug messages we added');
    console.log('5. This will help identify exactly where vessel manifests processing fails');
    
  } catch (error) {
    console.error('❌ Error in manual test:', error);
  }
}

manualDataTest();