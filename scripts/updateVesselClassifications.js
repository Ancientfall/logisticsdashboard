#!/usr/bin/env node

/**
 * Script to update vessel classifications from Excel file
 * Usage: node scripts/updateVesselClassifications.js path/to/vessel-data.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function processExcelFile(filePath) {
  console.log(`📊 Processing Excel file: ${filePath}`);
  
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  console.log(`📋 Found ${rawData.length} rows in Excel file`);
  
  // Process and validate the data
  const vessels = rawData.map((row, index) => {
    try {
      // Map Excel columns to our interface
      // Adjust these column names to match your Excel file
      const vesselName = row['Vessel Name'] || row['VesselName'] || row['Name'] || `Unknown-${index}`;
      const company = row['Company'] || row['Owner'] || row['Operator'] || 'Unknown';
      const size = parseFloat(row['Size'] || row['Length'] || row['LOA'] || 0);
      const vesselType = mapVesselType(row['Type'] || row['Vessel Type'] || row['VesselType'] || 'OSV');
      const category = mapCategory(vesselType);
      const yearBuilt = parseInt(row['Year Built'] || row['YearBuilt'] || row['Built'] || 0) || undefined;
      const flag = row['Flag'] || row['Registry'] || undefined;
      const status = row['Status'] || 'Active';
      
      return {
        vesselName: vesselName.trim(),
        company: company.trim(),
        size: size,
        vesselType: vesselType,
        category: category,
        capacity: extractCapacity(row),
        specifications: extractSpecifications(row, size),
        operationalArea: extractOperationalArea(row),
        status: mapStatus(status)
      };
    } catch (error) {
      console.warn(`⚠️ Error processing row ${index + 1}:`, error.message);
      return null;
    }
  }).filter(vessel => vessel !== null);
  
  console.log(`✅ Successfully processed ${vessels.length} vessels`);
  return vessels;
}

function mapVesselType(type) {
  const normalizedType = type.toLowerCase().trim();
  
  if (normalizedType.includes('osv') || normalizedType.includes('offshore supply')) return 'OSV';
  if (normalizedType.includes('fsv') || normalizedType.includes('fast supply')) return 'FSV';
  if (normalizedType.includes('ahts') || normalizedType.includes('anchor handling')) return 'AHTS';
  if (normalizedType.includes('psv') || normalizedType.includes('platform supply')) return 'PSV';
  if (normalizedType.includes('msv') || normalizedType.includes('multi') || normalizedType.includes('service')) return 'MSV';
  if (normalizedType.includes('support')) return 'Support';
  if (normalizedType.includes('specialty') || normalizedType.includes('special')) return 'Specialty';
  
  return 'OSV'; // Default
}

function mapCategory(vesselType) {
  switch (vesselType) {
    case 'OSV':
    case 'FSV':
    case 'PSV':
      return 'Supply';
    case 'AHTS':
    case 'Support':
      return 'Support';
    case 'MSV':
      return 'Multi-Purpose';
    case 'Specialty':
      return 'Specialized';
    default:
      return 'Supply';
  }
}

function mapStatus(status) {
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus.includes('active') || normalizedStatus.includes('operational')) return 'Active';
  if (normalizedStatus.includes('standby')) return 'Standby';
  if (normalizedStatus.includes('maintenance') || normalizedStatus.includes('repair')) return 'Maintenance';
  if (normalizedStatus.includes('retired') || normalizedStatus.includes('inactive')) return 'Retired';
  return 'Active'; // Default
}

function extractCapacity(row) {
  const capacity = {};
  
  if (row['Deck Space'] || row['DeckSpace']) {
    capacity.deckSpace = parseFloat(row['Deck Space'] || row['DeckSpace']);
  }
  if (row['Fuel Capacity'] || row['FuelCapacity']) {
    capacity.fuelCapacity = parseFloat(row['Fuel Capacity'] || row['FuelCapacity']);
  }
  if (row['Water Capacity'] || row['WaterCapacity']) {
    capacity.waterCapacity = parseFloat(row['Water Capacity'] || row['WaterCapacity']);
  }
  if (row['Mud Capacity'] || row['MudCapacity']) {
    capacity.mudCapacity = parseFloat(row['Mud Capacity'] || row['MudCapacity']);
  }
  
  return Object.keys(capacity).length > 0 ? capacity : undefined;
}

function extractSpecifications(row, size) {
  const specs = {};
  
  specs.length = size; // Use size as length
  
  if (row['Beam'] || row['Width']) {
    specs.beam = parseFloat(row['Beam'] || row['Width']);
  }
  if (row['Draft']) {
    specs.draft = parseFloat(row['Draft']);
  }
  if (row['Bollard Pull'] || row['BollardPull']) {
    specs.bollardPull = parseFloat(row['Bollard Pull'] || row['BollardPull']);
  }
  
  return Object.keys(specs).length > 0 ? specs : undefined;
}

function extractOperationalArea(row) {
  const area = row['Operational Area'] || row['OperationalArea'] || row['Region'];
  if (area) {
    return area.split(',').map(a => a.trim());
  }
  return ['Gulf of Mexico']; // Default
}

function generateTypeScriptFile(vessels) {
  const timestamp = new Date().toISOString();
  
  const tsContent = `export interface VesselClassification {
  vesselName: string;
  company: string;
  size: number;
  vesselType: 'OSV' | 'FSV' | 'Specialty' | 'Support' | 'AHTS' | 'MSV' | 'PSV';
  category: 'Supply' | 'Support' | 'Specialized' | 'Multi-Purpose';
  capacity?: {
    deckSpace?: number; // m²
    fuelCapacity?: number; // m³
    waterCapacity?: number; // m³
    mudCapacity?: number; // m³
  };
  specifications?: {
    length?: number; // meters
    beam?: number; // meters
    draft?: number; // meters
    bollardPull?: number; // tonnes (for AHTS)
  };
  operationalArea?: string[];
  status: 'Active' | 'Standby' | 'Maintenance' | 'Retired';
}

// Generated from Excel file on ${timestamp}
export const vesselClassificationData: VesselClassification[] = ${JSON.stringify(vessels, null, 2)};

// Helper functions for vessel classification
export const getVesselByName = (vesselName: string): VesselClassification | undefined => {
  return vesselClassificationData.find(vessel => 
    vessel.vesselName.toLowerCase() === vesselName.toLowerCase()
  );
};

export const getVesselsByCompany = (company: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.company.toLowerCase().includes(company.toLowerCase())
  );
};

export const getVesselsByType = (vesselType: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.vesselType.toLowerCase() === vesselType.toLowerCase()
  );
};

export const getVesselsByCategory = (category: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.category.toLowerCase() === category.toLowerCase()
  );
};

export const getVesselTypeFromName = (vesselName: string): string => {
  const vessel = getVesselByName(vesselName);
  return vessel?.vesselType || 'Unknown';
};

export const getVesselCompanyFromName = (vesselName: string): string => {
  const vessel = getVesselByName(vesselName);
  return vessel?.company || 'Unknown';
};

export const getVesselSizeFromName = (vesselName: string): number => {
  const vessel = getVesselByName(vesselName);
  return vessel?.size || 0;
};

// Statistics functions
export const getVesselStatistics = () => {
  const totalVessels = vesselClassificationData.length;
  const vesselsByType = vesselClassificationData.reduce((acc, vessel) => {
    acc[vessel.vesselType] = (acc[vessel.vesselType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const vesselsByCompany = vesselClassificationData.reduce((acc, vessel) => {
    acc[vessel.company] = (acc[vessel.company] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const averageSize = vesselClassificationData.reduce((sum, vessel) => sum + vessel.size, 0) / totalVessels;
  
  return {
    totalVessels,
    vesselsByType,
    vesselsByCompany,
    averageSize: Math.round(averageSize)
  };
};

export default vesselClassificationData;
`;

  return tsContent;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide the path to your Excel file');
    console.log('Usage: node scripts/updateVesselClassifications.js path/to/vessel-data.xlsx');
    process.exit(1);
  }
  
  const excelFilePath = args[0];
  
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ File not found: ${excelFilePath}`);
    process.exit(1);
  }
  
  try {
    // Process the Excel file
    const vessels = processExcelFile(excelFilePath);
    
    // Generate TypeScript content
    const tsContent = generateTypeScriptFile(vessels);
    
    // Write to the vesselClassification.ts file
    const outputPath = path.join(__dirname, '../src/data/vesselClassification.ts');
    
    // Backup the existing file
    const backupPath = `${outputPath}.backup.${Date.now()}`;
    if (fs.existsSync(outputPath)) {
      fs.copyFileSync(outputPath, backupPath);
      console.log(`📄 Backed up existing file to: ${backupPath}`);
    }
    
    // Write the new file
    fs.writeFileSync(outputPath, tsContent);
    console.log(`✅ Successfully updated: ${outputPath}`);
    console.log(`📊 Total vessels processed: ${vessels.length}`);
    
    // Show summary
    const summary = vessels.reduce((acc, vessel) => {
      acc[vessel.company] = (acc[vessel.company] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Summary by company:');
    Object.entries(summary).forEach(([company, count]) => {
      console.log(`  ${company}: ${count} vessels`);
    });
    
  } catch (error) {
    console.error('❌ Error processing file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}