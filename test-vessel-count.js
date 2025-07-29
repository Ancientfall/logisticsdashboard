// Test script to trigger vessel requirement calculation and capture debugging output
// This simulates loading the vessel requirements dashboard

const puppeteer = require('puppeteer');

async function testVesselCount() {
  console.log('🧪 Starting vessel count debugging test...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false, // Show browser for debugging
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs from the browser
    page.on('console', msg => {
      if (msg.text().includes('VESSEL COUNT') || msg.text().includes('🚢')) {
        console.log('🚢 BROWSER:', msg.text());
      }
    });
    
    // Navigate to the application
    console.log('📱 Navigating to vessel requirements dashboard...');
    await page.goto('http://localhost:3000/vessel-requirements', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for the dashboard to load and calculate
    console.log('⏳ Waiting for vessel calculations...');
    await page.waitForTimeout(10000); // Wait 10 seconds for calculations
    
    // Try to find and click elements that might trigger calculations
    try {
      await page.waitForSelector('[data-testid="vessel-count"]', { timeout: 5000 });
      console.log('✅ Vessel count element found');
    } catch (e) {
      console.log('⚠️ Vessel count element not found, continuing...');
    }
    
    console.log('✅ Test completed. Check browser console for debugging output.');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if puppeteer is available, otherwise provide manual instructions
try {
  testVesselCount();
} catch (error) {
  console.log('⚠️ Puppeteer not available. Manual testing instructions:');
  console.log('1. Open browser to http://localhost:3000');
  console.log('2. Navigate to vessel requirements dashboard');
  console.log('3. Open browser console (F12)');
  console.log('4. Look for vessel count debugging output with 🚢 emoji');
}