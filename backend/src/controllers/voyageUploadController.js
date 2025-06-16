const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Upload, VoyageEvent, VesselManifest, CostAllocation, BulkAction, VoyageList, sequelize } = require('../models');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// Upload voyage events
const uploadVoyageEvents = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Create upload record
    const uploadRecord = await Upload.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType: 'voyage_events',
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: data.length,
      status: 'processing'
    }, { transaction: t });

    // Process and insert voyage events
    const voyageEvents = data.map((row, index) => ({
      uploadId: uploadRecord.id,
      mission: row.Mission || row.mission,
      event: row.Event || row.event,
      parentEvent: row['Parent Event'] || row.parentEvent,
      location: row.Location || row.location,
      quay: row.Quay || row.quay,
      remarks: row.Remarks || row.remarks,
      isActive: row['Is active?'] === 'Yes' || row.isActive === true,
      from: row.From || row.from,
      to: row.To || row.to,
      hours: parseFloat(row.Hours) || 0,
      portType: row['Port Type'] || row.portType,
      eventCategory: row['Event Category'] || row.eventCategory,
      year: parseInt(row.Year) || new Date().getFullYear(),
      ins500m: row['Ins. 500m'] === 'Yes' || row.ins500m === true,
      costDedicatedTo: row['Cost Dedicated to'] || row.costDedicatedTo,
      vessel: row.Vessel || row.vessel,
      voyageNumber: row['Voyage #'] || row.voyageNumber,
      metadata: {
        originalRow: index + 2,
        rawData: row
      }
    }));

    await VoyageEvent.bulkCreate(voyageEvents, { transaction: t });

    // Update upload status
    uploadRecord.status = 'completed';
    uploadRecord.processedAt = new Date();
    await uploadRecord.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${voyageEvents.length} voyage events`,
      uploadId: uploadRecord.id,
      recordCount: voyageEvents.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Voyage events upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload voyage events',
      error: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Upload vessel manifests
const uploadVesselManifests = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Create upload record
    const uploadRecord = await Upload.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType: 'vessel_manifests',
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: data.length,
      status: 'processing'
    }, { transaction: t });

    // Process and insert vessel manifests
    const vesselManifests = data.map((row, index) => ({
      uploadId: uploadRecord.id,
      voyageId: row['Voyage Id'] || row.voyageId,
      manifestNumber: row['Manifest Number'] || row.manifestNumber,
      transporter: row.Transporter || row.transporter,
      type: row.Type || row.type,
      manifestDate: row['Manifest Date'] ? new Date(row['Manifest Date']) : null,
      costCode: row['Cost Code'] || row.costCode,
      from: row.From || row.from,
      offshoreLocation: row['Offshore Location'] || row.offshoreLocation,
      deckLbs: parseFloat(row['Deck Lbs']) || 0,
      deckTons: parseFloat(row['Deck Tons']) || 0,
      rtTons: parseFloat(row['RT Tons']) || 0,
      lifts: parseInt(row.Lifts) || 0,
      wetBulkBbls: parseFloat(row['Wet Bulk (bbls)']) || 0,
      wetBulkGals: parseFloat(row['Wet Bulk (gals)']) || 0,
      deckSqft: parseFloat(row['Deck Sqft']) || 0,
      remarks: row.Remarks || row.remarks,
      year: parseInt(row.Year) || new Date().getFullYear(),
      metadata: {
        originalRow: index + 2,
        rawData: row
      }
    }));

    await VesselManifest.bulkCreate(vesselManifests, { transaction: t });

    // Update upload status
    uploadRecord.status = 'completed';
    uploadRecord.processedAt = new Date();
    await uploadRecord.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${vesselManifests.length} vessel manifests`,
      uploadId: uploadRecord.id,
      recordCount: vesselManifests.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Vessel manifests upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload vessel manifests',
      error: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Upload cost allocations
const uploadCostAllocations = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Create upload record
    const uploadRecord = await Upload.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType: 'cost_allocations',
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: data.length,
      status: 'processing'
    }, { transaction: t });

    // Process and insert cost allocations
    const costAllocations = data.map((row, index) => {
      // Determine department based on LC Number
      let department = null;
      const lcNumber = row['LC Number'] || row.lcNumber || '';
      if (lcNumber.includes('0250') || lcNumber.includes('0100')) {
        department = 'Drilling';
      } else if (lcNumber.includes('0300')) {
        department = 'Production';
      } else if (lcNumber.includes('0350')) {
        department = 'Logistics';
      }

      return {
        uploadId: uploadRecord.id,
        lcNumber: lcNumber,
        rigReference: row['Rig Reference'] || row.rigReference,
        description: row.Description || row.description,
        costElement: row['Cost Element'] || row.costElement,
        monthYear: row['Month-Year'] || row.monthYear,
        mission: row.Mission || row.mission,
        projectType: row['Project Type'] || row.projectType,
        allocatedDays: parseFloat(row['Alloc (days)'] || row['Total Allocated Days'] || row.allocatedDays) || 0,
        avgVesselCostPerDay: parseFloat(row['Average Vessel Cost Per Day'] || row.avgVesselCostPerDay) || 0,
        totalCost: parseFloat(row['Total Cost'] || row.totalCost) || 0,
        rigLocation: row['Rig Location'] || row.rigLocation,
        rigType: row['Rig Type'] || row.rigType,
        waterDepth: row['Water Depth'] || row.waterDepth,
        department: department,
        metadata: {
          originalRow: index + 2,
          rawData: row
        }
      };
    });

    await CostAllocation.bulkCreate(costAllocations, { transaction: t });

    // Update upload status
    uploadRecord.status = 'completed';
    uploadRecord.processedAt = new Date();
    await uploadRecord.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${costAllocations.length} cost allocations`,
      uploadId: uploadRecord.id,
      recordCount: costAllocations.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Cost allocations upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload cost allocations',
      error: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Upload bulk actions
const uploadBulkActions = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Create upload record
    const uploadRecord = await Upload.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType: 'bulk_actions',
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: data.length,
      status: 'processing'
    }, { transaction: t });

    // Process and insert bulk actions
    const bulkActions = data.map((row, index) => ({
      uploadId: uploadRecord.id,
      vesselName: row['Vessel Name'] || row.vesselName || row.Vessel,
      voyageNumber: row['Voyage Number'] || row.voyageNumber || row['Voyage #'],
      manifestNumber: row['Manifest Number'] || row.manifestNumber,
      manifestDate: row['Manifest Date'] ? new Date(row['Manifest Date']) : null,
      from: row.From || row.from,
      to: row.To || row.to,
      cargoType: row['Cargo Type'] || row.cargoType,
      cargoDescription: row['Cargo Description'] || row.cargoDescription,
      quantity: parseFloat(row.Quantity) || 0,
      unit: row.Unit || row.unit,
      weight: parseFloat(row.Weight) || 0,
      volume: parseFloat(row.Volume) || 0,
      costCode: row['Cost Code'] || row.costCode,
      projectCode: row['Project Code'] || row.projectCode,
      department: row.Department || row.department,
      status: row.Status || row.status || 'pending',
      actionType: row['Action Type'] || row.actionType,
      completedDate: row['Completed Date'] ? new Date(row['Completed Date']) : null,
      remarks: row.Remarks || row.remarks,
      metadata: {
        originalRow: index + 2,
        rawData: row
      }
    }));

    await BulkAction.bulkCreate(bulkActions, { transaction: t });

    // Update upload status
    uploadRecord.status = 'completed';
    uploadRecord.processedAt = new Date();
    await uploadRecord.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${bulkActions.length} bulk actions`,
      uploadId: uploadRecord.id,
      recordCount: bulkActions.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Bulk actions upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload bulk actions',
      error: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Upload voyage list
const uploadVoyageList = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Create upload record
    const uploadRecord = await Upload.create({
      userId: req.user.id,
      fileName: req.file.originalname,
      fileType: 'voyage_list',
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: data.length,
      status: 'processing'
    }, { transaction: t });

    // Process and insert voyage list
    const voyageList = data.map((row, index) => ({
      uploadId: uploadRecord.id,
      vesselName: row['Vessel Name'] || row.vesselName || row.Vessel,
      voyageNumber: row['Voyage Number'] || row.voyageNumber || row['Voyage #'],
      voyageType: row['Voyage Type'] || row.voyageType,
      departurePort: row['Departure Port'] || row.departurePort,
      departureDate: row['Departure Date'] ? new Date(row['Departure Date']) : null,
      arrivalPort: row['Arrival Port'] || row.arrivalPort,
      arrivalDate: row['Arrival Date'] ? new Date(row['Arrival Date']) : null,
      voyageDuration: parseFloat(row['Voyage Duration'] || row.voyageDuration) || 0,
      totalDistance: parseFloat(row['Total Distance'] || row.totalDistance) || 0,
      fuelConsumption: parseFloat(row['Fuel Consumption'] || row.fuelConsumption) || 0,
      cargoCapacity: parseFloat(row['Cargo Capacity'] || row.cargoCapacity) || 0,
      cargoUtilization: parseFloat(row['Cargo Utilization'] || row.cargoUtilization) || 0,
      voyageStatus: row['Voyage Status'] || row.voyageStatus || 'planned',
      charterer: row.Charterer || row.charterer,
      operator: row.Operator || row.operator,
      masterName: row['Master Name'] || row.masterName,
      totalCrew: parseInt(row['Total Crew'] || row.totalCrew) || 0,
      voyagePurpose: row['Voyage Purpose'] || row.voyagePurpose,
      totalRevenue: parseFloat(row['Total Revenue'] || row.totalRevenue) || 0,
      totalCost: parseFloat(row['Total Cost'] || row.totalCost) || 0,
      profit: parseFloat(row.Profit || row.profit) || 0,
      remarks: row.Remarks || row.remarks,
      metadata: {
        originalRow: index + 2,
        rawData: row
      }
    }));

    await VoyageList.bulkCreate(voyageList, { transaction: t });

    // Update upload status
    uploadRecord.status = 'completed';
    uploadRecord.processedAt = new Date();
    await uploadRecord.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${voyageList.length} voyage list entries`,
      uploadId: uploadRecord.id,
      recordCount: voyageList.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Voyage list upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload voyage list',
      error: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

module.exports = {
  upload,
  uploadVoyageEvents,
  uploadVesselManifests,
  uploadCostAllocations,
  uploadBulkActions,
  uploadVoyageList
};