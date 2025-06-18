const { sequelize } = require('../config/database')
const { MasterFacility, VesselClassification } = require('../models')

// Master Facilities Data - based on src/data/masterFacilities.ts
const masterFacilitiesData = [
	{
		locationID: 1,
		locationName: "Thunder Horse",
		displayName: "Thunder Horse PDQ",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 1,
		productionLCs: ["LC001", "LC002", "LC003"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Primary production platform"
	},
	{
		locationID: 2,
		locationName: "Thunder Horse PDQ",
		displayName: "Thunder Horse PDQ - Drilling",
		facilityType: "Drilling",
		parentFacility: "Thunder Horse",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 2,
		productionLCs: [],
		drillingLCs: ["LC004", "LC005"],
		isProductionCapable: false,
		isDrillingCapable: true,
		category: "Drilling Rigs",
		isIntegrated: false,
		notes: "Thunder Horse drilling operations"
	},
	{
		locationID: 3,
		locationName: "Mad Dog",
		displayName: "Mad Dog Spar",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 3,
		productionLCs: ["LC006", "LC007"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Spar production platform"
	},
	{
		locationID: 4,
		locationName: "Mad Dog 2",
		displayName: "Mad Dog 2 Semi",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 4,
		productionLCs: ["LC008", "LC009"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Semi-submersible production platform"
	},
	{
		locationID: 5,
		locationName: "Na Kika",
		displayName: "Na Kika",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 5,
		productionLCs: ["LC010", "LC011"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Deep water production platform"
	},
	{
		locationID: 6,
		locationName: "Atlantis",
		displayName: "Atlantis",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 6,
		productionLCs: ["LC012", "LC013"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Semi-submersible production platform"
	},
	{
		locationID: 7,
		locationName: "Fourchon",
		displayName: "Port Fourchon",
		facilityType: "Logistics",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 7,
		productionLCs: [],
		drillingLCs: [],
		isProductionCapable: false,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Main supply base"
	},
	{
		locationID: 8,
		locationName: "Venice",
		displayName: "Venice Base",
		facilityType: "Logistics",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 8,
		productionLCs: [],
		drillingLCs: [],
		isProductionCapable: false,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Secondary supply base"
	},
	{
		locationID: 9,
		locationName: "Morgan City",
		displayName: "Morgan City",
		facilityType: "Logistics",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 9,
		productionLCs: [],
		drillingLCs: [],
		isProductionCapable: false,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Tertiary supply base"
	},
	{
		locationID: 10,
		locationName: "Argos",
		displayName: "Argos Platform",
		facilityType: "Production",
		region: "Gulf of Mexico",
		isActive: true,
		sortOrder: 10,
		productionLCs: ["LC014", "LC015"],
		drillingLCs: [],
		isProductionCapable: true,
		isDrillingCapable: false,
		category: "Production Facilities",
		isIntegrated: false,
		notes: "Production platform"
	}
]

// Vessel Classifications Data - based on src/data/vesselClassification.ts
const vesselClassificationsData = [
	{
		vesselName: "HOS ACHIEVER",
		standardizedVesselName: "HOS ACHIEVER",
		company: "Hornbeck Offshore",
		size: 240,
		vesselType: "OSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Medium",
		deckSpace: 1200,
		fuelCapacity: 500,
		waterCapacity: 300,
		length: 73.15,
		beam: 15.85,
		yearBuilt: 2009,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "HOS IRON HORSE",
		standardizedVesselName: "HOS IRON HORSE",
		company: "Hornbeck Offshore",
		size: 245,
		vesselType: "OSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Medium",
		deckSpace: 1250,
		fuelCapacity: 520,
		waterCapacity: 320,
		length: 74.68,
		beam: 15.85,
		yearBuilt: 2010,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "THUNDER HORSE",
		standardizedVesselName: "THUNDER HORSE",
		company: "BP Marine",
		size: 350,
		vesselType: "FSV",
		category: "Support",
		vesselCategory: "Support",
		sizeCategory: "Large",
		deckSpace: 2000,
		fuelCapacity: 800,
		waterCapacity: 500,
		length: 106.68,
		beam: 22.86,
		yearBuilt: 2008,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "HIGHLAND CHIEF",
		standardizedVesselName: "HIGHLAND CHIEF",
		company: "Tidewater",
		size: 280,
		vesselType: "OSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Large",
		deckSpace: 1500,
		fuelCapacity: 600,
		waterCapacity: 400,
		length: 85.34,
		beam: 18.29,
		yearBuilt: 2012,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "ISLAND COMMANDER",
		standardizedVesselName: "ISLAND COMMANDER",
		company: "Island Offshore",
		size: 320,
		vesselType: "Support",
		category: "Multi-Purpose",
		vesselCategory: "Multi-Purpose",
		sizeCategory: "Large",
		deckSpace: 1800,
		fuelCapacity: 750,
		waterCapacity: 450,
		mudCapacity: 200,
		length: 97.54,
		beam: 21.34,
		yearBuilt: 2014,
		flag: "Norway",
		operationalArea: ["Gulf of Mexico", "North Sea"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "SEACOR MAYA",
		standardizedVesselName: "SEACOR MAYA",
		company: "Seacor Marine",
		size: 220,
		vesselType: "OSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Medium",
		deckSpace: 1000,
		fuelCapacity: 450,
		waterCapacity: 280,
		length: 67.06,
		beam: 14.63,
		yearBuilt: 2007,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "GULF CAPTAIN",
		standardizedVesselName: "GULF CAPTAIN",
		company: "Gulf Offshore",
		size: 190,
		vesselType: "OSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Small",
		deckSpace: 800,
		fuelCapacity: 350,
		waterCapacity: 200,
		length: 57.91,
		beam: 12.80,
		yearBuilt: 2005,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "OLYMPIC ZEUS",
		standardizedVesselName: "OLYMPIC ZEUS",
		company: "Olympic Shipping",
		size: 310,
		vesselType: "AHTS",
		category: "Support",
		vesselCategory: "Support",
		sizeCategory: "Large",
		deckSpace: 1600,
		fuelCapacity: 700,
		waterCapacity: 400,
		bollardPull: 180,
		length: 94.49,
		beam: 20.12,
		yearBuilt: 2011,
		flag: "Greece",
		operationalArea: ["Gulf of Mexico", "Mediterranean"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "VERSATILE",
		standardizedVesselName: "VERSATILE",
		company: "Versatile Marine",
		size: 260,
		vesselType: "MSV",
		category: "Specialized",
		vesselCategory: "Specialized",
		sizeCategory: "Medium",
		deckSpace: 1300,
		fuelCapacity: 550,
		waterCapacity: 350,
		length: 79.25,
		beam: 17.07,
		yearBuilt: 2013,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	},
	{
		vesselName: "STORM RIDER",
		standardizedVesselName: "STORM RIDER",
		company: "Storm Marine",
		size: 275,
		vesselType: "PSV",
		category: "Supply",
		vesselCategory: "Supply",
		sizeCategory: "Large",
		deckSpace: 1400,
		fuelCapacity: 580,
		waterCapacity: 380,
		length: 83.82,
		beam: 18.29,
		yearBuilt: 2015,
		flag: "USA",
		operationalArea: ["Gulf of Mexico"],
		status: "Active",
		isActive: true
	}
]

async function seedReferenceData() {
	try {
		console.log('🌱 Starting reference data seeding...')
		
		// Ensure database connection
		await sequelize.authenticate()
		console.log('✅ Database connection established')
		
		// Sync models (create tables if they don't exist)
		await sequelize.sync({ alter: true })
		console.log('✅ Database models synchronized')
		
		// Clear existing data
		await MasterFacility.destroy({ where: {}, truncate: true })
		await VesselClassification.destroy({ where: {}, truncate: true })
		console.log('🧹 Cleared existing reference data')
		
		// Seed Master Facilities
		console.log('🏭 Seeding Master Facilities...')
		const facilities = await MasterFacility.bulkCreate(masterFacilitiesData, {
			validate: true,
			returning: true
		})
		console.log(`✅ Created ${facilities.length} master facilities`)
		
		// Seed Vessel Classifications
		console.log('🚢 Seeding Vessel Classifications...')
		const vessels = await VesselClassification.bulkCreate(vesselClassificationsData, {
			validate: true,
			returning: true
		})
		console.log(`✅ Created ${vessels.length} vessel classifications`)
		
		console.log('🌟 Reference data seeding completed successfully!')
		
		// Log summary
		console.log('\n📊 Seeding Summary:')
		console.log(`- Master Facilities: ${facilities.length}`)
		console.log(`- Vessel Classifications: ${vessels.length}`)
		console.log(`- Total Reference Records: ${facilities.length + vessels.length}`)
		
		return {
			success: true,
			facilities: facilities.length,
			vessels: vessels.length,
			total: facilities.length + vessels.length
		}
		
	} catch (error) {
		console.error('❌ Error seeding reference data:', error)
		throw error
	}
}

// Export for use in other scripts
module.exports = {
	seedReferenceData,
	masterFacilitiesData,
	vesselClassificationsData
}

// Run if called directly
if (require.main === module) {
	seedReferenceData()
		.then(() => {
			console.log('✅ Seeding script completed')
			process.exit(0)
		})
		.catch((error) => {
			console.error('❌ Seeding script failed:', error)
			process.exit(1)
		})
}