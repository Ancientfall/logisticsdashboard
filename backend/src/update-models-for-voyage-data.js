// Script to update database models for voyage/manifest/cost data
const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config/database');

// Create sequelize instance
const sequelize = new Sequelize(config);

// Import existing model functions
const UserModel = require('./models/User');
const UploadModel = require('./models/Upload');
const VoyageEventModel = require('./models/VoyageEvent');
const VesselManifestModel = require('./models/VesselManifest');
const CostAllocationModel = require('./models/CostAllocation');
const BulkActionModel = require('./models/BulkAction');
const VoyageListModel = require('./models/VoyageList');

async function updateDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully.');

    // Initialize models
    console.log('Initializing new models...');
    const User = UserModel(sequelize);
    const Upload = UploadModel(sequelize);
    const VoyageEvent = VoyageEventModel(sequelize);
    const VesselManifest = VesselManifestModel(sequelize);
    const CostAllocation = CostAllocationModel(sequelize);
    const BulkAction = BulkActionModel(sequelize);
    const VoyageList = VoyageListModel(sequelize);

    // Set up associations
    console.log('Setting up associations...');
    
    // Upload -> VoyageEvent
    Upload.hasMany(VoyageEvent, { foreignKey: 'uploadId', as: 'voyageEvents' });
    VoyageEvent.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' });

    // Upload -> VesselManifest
    Upload.hasMany(VesselManifest, { foreignKey: 'uploadId', as: 'vesselManifests' });
    VesselManifest.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' });

    // Upload -> CostAllocation
    Upload.hasMany(CostAllocation, { foreignKey: 'uploadId', as: 'costAllocations' });
    CostAllocation.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' });

    // Upload -> BulkAction
    Upload.hasMany(BulkAction, { foreignKey: 'uploadId', as: 'bulkActions' });
    BulkAction.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' });

    // Upload -> VoyageList
    Upload.hasMany(VoyageList, { foreignKey: 'uploadId', as: 'voyageLists' });
    VoyageList.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' });

    // Sync new models
    console.log('Creating new tables...');
    await VoyageEvent.sync({ alter: true });
    await VesselManifest.sync({ alter: true });
    await CostAllocation.sync({ alter: true });
    await BulkAction.sync({ alter: true });
    await VoyageList.sync({ alter: true });

    console.log('✅ Database updated successfully!');
    console.log('New tables created:');
    console.log('  - voyage_events');
    console.log('  - vessel_manifests');
    console.log('  - cost_allocations');
    console.log('  - bulk_actions');
    console.log('  - voyage_lists');

  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateDatabase();