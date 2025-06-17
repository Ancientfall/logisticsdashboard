#!/usr/bin/env node

// Simple script to create a user directly in the database
// Usage: node create-user.js <email> <password> <firstName> <lastName> <role>

const path = require('path');
const bcrypt = require('bcryptjs');

// Set up environment for backend
process.env.NODE_ENV = 'production';
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function createUser() {
  try {
    // Import after environment is set up
    const { sequelize } = require('./backend/src/config/database');
    const User = require('./backend/src/models/User');

    const [, , email, password, firstName, lastName, role = 'admin'] = process.argv;

    if (!email || !password || !firstName || !lastName) {
      console.log('Usage: node create-user.js <email> <password> <firstName> <lastName> [role]');
      console.log('Example: node create-user.js john@example.com MyPass123! John Doe admin');
      process.exit(1);
    }

    // Test database connection
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Create user
    console.log('👤 Creating user...');
    const user = await User.create({
      email,
      password, // Model will hash this automatically
      firstName,
      lastName,
      role,
      isActive: true
    });

    console.log('✅ User created successfully!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

createUser();