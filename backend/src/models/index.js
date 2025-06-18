const User = require('./User')
const Upload = require('./Upload')
const WellOperation = require('./WellOperation')
const Vessel = require('./Vessel')
const FluidAnalysis = require('./FluidAnalysis')
const PasswordReset = require('./PasswordReset')
const VoyageEvent = require('./VoyageEvent')
const VesselManifest = require('./VesselManifest')
const CostAllocation = require('./CostAllocation')
const BulkAction = require('./BulkAction')
const VoyageList = require('./VoyageList')
const MasterFacility = require('./MasterFacility')
const VesselClassification = require('./VesselClassification')

// User -> Upload (One to Many)
User.hasMany(Upload, { foreignKey: 'userId', as: 'uploads' })
Upload.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// User -> PasswordReset (One to Many)
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' })
PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// Upload -> WellOperation (One to Many)
Upload.hasMany(WellOperation, { foreignKey: 'uploadId', as: 'wellOperations' })
WellOperation.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> Vessel (One to Many)
Upload.hasMany(Vessel, { foreignKey: 'uploadId', as: 'vessels' })
Vessel.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> FluidAnalysis (One to Many)
Upload.hasMany(FluidAnalysis, { foreignKey: 'uploadId', as: 'fluidAnalyses' })
FluidAnalysis.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> VoyageEvent (One to Many)
Upload.hasMany(VoyageEvent, { foreignKey: 'uploadId', as: 'voyageEvents' })
VoyageEvent.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> VesselManifest (One to Many)
Upload.hasMany(VesselManifest, { foreignKey: 'uploadId', as: 'vesselManifests' })
VesselManifest.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> CostAllocation (One to Many)
Upload.hasMany(CostAllocation, { foreignKey: 'uploadId', as: 'costAllocations' })
CostAllocation.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> BulkAction (One to Many)
Upload.hasMany(BulkAction, { foreignKey: 'uploadId', as: 'bulkActions' })
BulkAction.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> VoyageList (One to Many)
Upload.hasMany(VoyageList, { foreignKey: 'uploadId', as: 'voyageLists' })
VoyageList.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

module.exports = {
	User,
	Upload,
	WellOperation,
	Vessel,
	FluidAnalysis,
	PasswordReset,
	VoyageEvent,
	VesselManifest,
	CostAllocation,
	BulkAction,
	VoyageList,
	MasterFacility,
	VesselClassification
}