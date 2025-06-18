const { MasterFacility, VesselClassification } = require('../models')

// Fallback data in case database is not accessible
const fallbackMasterFacilities = [
	{
		id: "1",
		locationName: "Thunder Horse",
		facilityType: "Production",
		parentFacility: null,
		isProductionCapable: true,
		isDrillingCapable: false,
		productionLCs: ["LC001", "LC002"],
		region: "Gulf of Mexico",
		notes: "Primary production platform",
		isActive: true
	},
	{
		id: "2",
		locationName: "Mad Dog",
		facilityType: "Production",
		parentFacility: null,
		isProductionCapable: true,
		isDrillingCapable: false,
		productionLCs: ["LC003", "LC004"],
		region: "Gulf of Mexico",
		notes: "Spar production platform",
		isActive: true
	},
	{
		id: "3",
		locationName: "Na Kika",
		facilityType: "Production",
		parentFacility: null,
		isProductionCapable: true,
		isDrillingCapable: false,
		productionLCs: ["LC005", "LC006"],
		region: "Gulf of Mexico",
		notes: "Deep water production platform",
		isActive: true
	},
	{
		id: "4",
		locationName: "Atlantis",
		facilityType: "Production",
		parentFacility: null,
		isProductionCapable: true,
		isDrillingCapable: false,
		productionLCs: ["LC007", "LC008"],
		region: "Gulf of Mexico",
		notes: "Semi-submersible production platform",
		isActive: true
	},
	{
		id: "5",
		locationName: "Fourchon",
		facilityType: "Logistics",
		parentFacility: null,
		isProductionCapable: false,
		isDrillingCapable: false,
		productionLCs: [],
		region: "Gulf of Mexico",
		notes: "Main supply base",
		isActive: true
	}
]

const fallbackVesselClassifications = [
	{
		id: "1",
		vesselName: "HOS ACHIEVER",
		standardizedVesselName: "HOS ACHIEVER",
		company: "Hornbeck Offshore",
		size: 240,
		vesselType: "OSV",
		vesselCategory: "Supply",
		sizeCategory: "Medium",
		yearBuilt: 2009,
		flag: "USA",
		isActive: true
	},
	{
		id: "2",
		vesselName: "THUNDER HORSE",
		standardizedVesselName: "THUNDER HORSE",
		company: "BP Marine",
		size: 350,
		vesselType: "FSV",
		vesselCategory: "Support", 
		sizeCategory: "Large",
		yearBuilt: 2008,
		flag: "USA",
		isActive: true
	},
	{
		id: "3",
		vesselName: "HIGHLAND CHIEF",
		standardizedVesselName: "HIGHLAND CHIEF",
		company: "Tidewater",
		size: 280,
		vesselType: "OSV",
		vesselCategory: "Supply",
		sizeCategory: "Large",
		yearBuilt: 2012,
		flag: "USA",
		isActive: true
	}
]

const getMasterFacilities = async (req, res) => {
	try {
		const { page = 1, limit = 1000, active, facilityType } = req.query
		
		// Try to get from database first
		try {
			const where = {}
			
			if (active !== undefined) {
				where.isActive = active === 'true'
			}
			
			if (facilityType) {
				where.facilityType = facilityType
			}
			
			const offset = (page - 1) * limit
			
			const { rows: facilities, count } = await MasterFacility.findAndCountAll({
				where,
				order: [['sortOrder', 'ASC'], ['locationName', 'ASC']],
				limit: parseInt(limit),
				offset: parseInt(offset)
			})
			
			res.json({
				success: true,
				data: facilities,
				pagination: {
					total: count,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(count / limit)
				}
			})
		} catch (dbError) {
			console.warn('Database not accessible, using fallback data:', dbError.message)
			
			// Use fallback data
			let filteredData = [...fallbackMasterFacilities]
			
			if (active !== undefined) {
				filteredData = filteredData.filter(f => f.isActive === (active === 'true'))
			}
			
			if (facilityType) {
				filteredData = filteredData.filter(f => f.facilityType === facilityType)
			}
			
			res.json({
				success: true,
				data: filteredData,
				fallback: true,
				pagination: {
					total: filteredData.length,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(filteredData.length / limit)
				}
			})
		}
	} catch (error) {
		console.error('Error fetching master facilities:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to fetch master facilities'
		})
	}
}

const getVesselClassifications = async (req, res) => {
	try {
		const { page = 1, limit = 1000, active, vesselType, company, sizeCategory } = req.query
		
		// Try to get from database first
		try {
			const { Op } = require('sequelize')
			const where = {}
			
			if (active !== undefined) {
				where.isActive = active === 'true'
			}
			
			if (vesselType) {
				where.vesselType = vesselType
			}
			
			if (company) {
				where.company = { [Op.iLike]: `%${company}%` }
			}
			
			if (sizeCategory) {
				where.sizeCategory = sizeCategory
			}
			
			const offset = (page - 1) * limit
			
			const { rows: vessels, count } = await VesselClassification.findAndCountAll({
				where,
				order: [['vesselName', 'ASC']],
				limit: parseInt(limit),
				offset: parseInt(offset)
			})
			
			res.json({
				success: true,
				data: vessels,
				pagination: {
					total: count,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(count / limit)
				}
			})
		} catch (dbError) {
			console.warn('Database not accessible, using fallback data:', dbError.message)
			
			// Use fallback data
			let filteredData = [...fallbackVesselClassifications]
			
			if (active !== undefined) {
				filteredData = filteredData.filter(v => v.isActive === (active === 'true'))
			}
			
			if (vesselType) {
				filteredData = filteredData.filter(v => v.vesselType === vesselType)
			}
			
			if (company) {
				filteredData = filteredData.filter(v => v.company.toLowerCase().includes(company.toLowerCase()))
			}
			
			if (sizeCategory) {
				filteredData = filteredData.filter(v => v.sizeCategory === sizeCategory)
			}
			
			res.json({
				success: true,
				data: filteredData,
				fallback: true,
				pagination: {
					total: filteredData.length,
					page: parseInt(page),
					limit: parseInt(limit),
					pages: Math.ceil(filteredData.length / limit)
				}
			})
		}
	} catch (error) {
		console.error('Error fetching vessel classifications:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to fetch vessel classifications'
		})
	}
}

module.exports = {
	getMasterFacilities,
	getVesselClassifications
}