#!/usr/bin/env node

const https = require('https');
const http = require('http');
const dns = require('dns');
const { URL } = require('url');

const supabaseUrl = 'https://grdwegggpiwdcspqhosb.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZHdlZ2dncGl3ZGNzcHFob3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzQ3MDYsImV4cCI6MjA2NDIxMDcwNn0._-knmXp3LoRYPnIn0knrh6Y1GZbdsCFpEWHv543_Zgs';

console.log('🔍 Node.js Environment Tests for Supabase Connection');
console.log('=' .repeat(60));

async function testDNS() {
  console.log('\n1. DNS Resolution Test');
  console.log('-'.repeat(30));
  
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    console.log(`✅ DNS Resolution successful for ${hostname}`);
    console.log(`   IP Addresses: ${addresses.join(', ')}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS Resolution failed: ${error.message}`);
    return false;
  }
}

async function testHTTPS() {
  console.log('\n2. HTTPS Connectivity Test');
  console.log('-'.repeat(30));
  
  return new Promise((resolve) => {
    const req = https.request(supabaseUrl + '/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Node.js Test Client'
      },
      timeout: 10000
    }, (res) => {
      console.log(`✅ HTTPS Connection successful`);
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Headers:`, Object.keys(res.headers).map(k => `${k}: ${res.headers[k]}`).join('\n            '));
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Response size: ${data.length} bytes`);
        if (data.length > 0 && data.length < 1000) {
          console.log(`   Response preview: ${data.substring(0, 200)}...`);
        }
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ HTTPS Connection failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ HTTPS Connection timed out`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function testSupabaseAPI() {
  console.log('\n3. Supabase API Test');
  console.log('-'.repeat(30));
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      vessel: 'TEST_VESSEL_NODE',
      voyage_number: 998,
      year: 2024,
      month: 'test',
      mission: 'node_test',
      locations: 'Node Test Location'
    });
    
    const req = https.request(supabaseUrl + '/rest/v1/voyage_list', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=representation'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Supabase API Insert successful`);
          console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
          console.log(`   Response: ${data}`);
          
          // Now test retrieval
          testRetrieve().then(resolve);
        } else {
          console.log(`❌ Supabase API Insert failed`);
          console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
          console.log(`   Response: ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Supabase API request failed: ${error.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testRetrieve() {
  return new Promise((resolve) => {
    const req = https.request(supabaseUrl + '/rest/v1/voyage_list?vessel=eq.TEST_VESSEL_NODE', {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const records = JSON.parse(data);
          console.log(`✅ Supabase API Retrieve successful`);
          console.log(`   Records found: ${records.length}`);
          
          // Clean up
          cleanup().then(() => resolve(true));
        } else {
          console.log(`❌ Supabase API Retrieve failed: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function cleanup() {
  return new Promise((resolve) => {
    const req = https.request(supabaseUrl + '/rest/v1/voyage_list?vessel=eq.TEST_VESSEL_NODE', {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    }, (res) => {
      console.log(`   Cleanup: ${res.statusCode === 204 ? 'Success' : 'Failed'}`);
      resolve();
    });
    
    req.on('error', () => resolve());
    req.end();
  });
}

async function runAllTests() {
  console.log(`Testing connection to: ${supabaseUrl}`);
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  
  const results = {};
  
  results.dns = await testDNS();
  results.https = await testHTTPS();
  results.api = await testSupabaseAPI();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`DNS Resolution:    ${results.dns ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`HTTPS Connection:  ${results.https ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Supabase API:      ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOverall Result:    ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Your Supabase connection works perfectly from Node.js!');
    console.log('   The issue is likely browser-specific (CORS, ad blockers, etc.)');
  } else {
    console.log('\n🔍 Connection issues detected. Check your network, firewall, or Supabase configuration.');
  }
}

runAllTests().catch(console.error);