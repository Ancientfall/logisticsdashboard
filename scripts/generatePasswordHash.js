#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('BP Logistics Dashboard - Password Hash Generator');
console.log('================================================\n');

rl.question('Enter the password you want to hash: ', (password) => {
  if (!password || password.length < 8) {
    console.error('\nError: Password must be at least 8 characters long.');
    rl.close();
    return;
  }

  // Generate hash with salt rounds of 10
  const hash = bcrypt.hashSync(password, 10);
  
  console.log('\n✅ Password hash generated successfully!\n');
  console.log('Add this to your .env file:');
  console.log('----------------------------');
  console.log(`REACT_APP_ADMIN_PASSWORD_HASH=${hash}`);
  console.log('----------------------------\n');
  
  // Verify the hash works
  const verifyResult = bcrypt.compareSync(password, hash);
  console.log(`Verification: ${verifyResult ? '✅ Hash verified' : '❌ Hash verification failed'}`);
  
  rl.close();
});

rl.on('close', () => {
  console.log('\nDone! Remember to restart your development server after updating .env');
  process.exit(0);
});