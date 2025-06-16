const User = require('./User')
const Upload = require('./Upload')
const WellOperation = require('./WellOperation')
const Vessel = require('./Vessel')
const FluidAnalysis = require('./FluidAnalysis')

// User -> Upload (One to Many)
User.hasMany(Upload, { foreignKey: 'userId', as: 'uploads' })
Upload.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// Upload -> WellOperation (One to Many)
Upload.hasMany(WellOperation, { foreignKey: 'uploadId', as: 'wellOperations' })
WellOperation.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> Vessel (One to Many)
Upload.hasMany(Vessel, { foreignKey: 'uploadId', as: 'vessels' })
Vessel.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

// Upload -> FluidAnalysis (One to Many)
Upload.hasMany(FluidAnalysis, { foreignKey: 'uploadId', as: 'fluidAnalyses' })
FluidAnalysis.belongsTo(Upload, { foreignKey: 'uploadId', as: 'upload' })

module.exports = {
	User,
	Upload,
	WellOperation,
	Vessel,
	FluidAnalysis
}