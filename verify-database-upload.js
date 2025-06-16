// Database Upload Verification Script
// Run this on your VPS to check if data is being saved to PostgreSQL

const { WellOperation, Vessel, FluidAnalysis, Upload, User } = require('./backend/src/models');

async function verifyDatabaseStatus() {
  try {
    console.log('=================================');
    console.log('BP Logistics Database Status');
    console.log('=================================\n');

    // Count records in each table
    const [wells, vessels, fluids, uploads, users] = await Promise.all([
      WellOperation.count(),
      Vessel.count(),
      FluidAnalysis.count(),
      Upload.count(),
      User.count()
    ]);

    console.log('📊 Record Counts:');
    console.log(`   - Well Operations: ${wells}`);
    console.log(`   - Vessels: ${vessels}`);
    console.log(`   - Fluid Analyses: ${fluids}`);
    console.log(`   - Upload History: ${uploads}`);
    console.log(`   - Users: ${users}`);

    // Get recent uploads
    const recentUploads = await Upload.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: ['user']
    });

    if (recentUploads.length > 0) {
      console.log('\n📤 Recent Uploads:');
      recentUploads.forEach(upload => {
        console.log(`   - ${upload.fileName} (${upload.fileType}) by ${upload.user?.email || 'Unknown'} at ${upload.createdAt}`);
      });
    } else {
      console.log('\n⚠️  No upload history found');
    }

    // Get sample well operations
    const sampleWells = await WellOperation.findAll({
      limit: 3,
      order: [['date', 'DESC']]
    });

    if (sampleWells.length > 0) {
      console.log('\n🛢️  Sample Well Operations:');
      sampleWells.forEach(well => {
        console.log(`   - ${well.wellName} on ${well.date}: Production=${well.production}, Status=${well.status}`);
      });
    }

    // Check if tables are empty
    if (wells === 0 && vessels === 0 && fluids === 0) {
      console.log('\n❌ WARNING: No data found in database!');
      console.log('   Upload files through the web interface to populate the database.');
    } else {
      console.log('\n✅ Database contains data and is ready for use!');
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

verifyDatabaseStatus();