#!/usr/bin/env node

/**
 * Script to create a vessel classification Excel template
 * Usage: node scripts/createVesselTemplate.js [output-file.xlsx]
 */

const XLSX = require('xlsx');
const path = require('path');

function createTemplate() {
  console.log('📊 Creating vessel classification Excel template...');
  
  // Template data with examples
  const templateData = [
    {
      'Vessel Name': 'HOS Commander',
      'Company': 'Hornbeck Offshore',
      'Size': 320,
      'Type': 'OSV',
      'Year Built': 2015,
      'Flag': 'USA',
      'Status': 'Active',
      'Deck Space': 1200,
      'Fuel Capacity': 500,
      'Water Capacity': 300,
      'Mud Capacity': 200,
      'Beam': 18.5,
      'Draft': 5.2,
      'Bollard Pull': '',
      'Operational Area': 'Gulf of Mexico'
    },
    {
      'Vessel Name': 'Fast Tiger',
      'Company': 'Edison Chouest Offshore',
      'Size': 196,
      'Type': 'FSV',
      'Year Built': 2012,
      'Flag': 'USA',
      'Status': 'Active',
      'Deck Space': 800,
      'Fuel Capacity': 300,
      'Water Capacity': 200,
      'Mud Capacity': 150,
      'Beam': 16.2,
      'Draft': 4.8,
      'Bollard Pull': '',
      'Operational Area': 'Gulf of Mexico'
    },
    {
      'Vessel Name': 'Harvey Power',
      'Company': 'Harvey Gulf',
      'Size': 310,
      'Type': 'OSV',
      'Year Built': 2018,
      'Flag': 'USA',
      'Status': 'Active',
      'Deck Space': 1100,
      'Fuel Capacity': 450,
      'Water Capacity': 280,
      'Mud Capacity': 180,
      'Beam': 17.8,
      'Draft': 5.0,
      'Bollard Pull': '',
      'Operational Area': 'Gulf of Mexico, West Africa'
    },
    {
      'Vessel Name': 'Example AHTS',
      'Company': 'Your Company',
      'Size': 280,
      'Type': 'AHTS',
      'Year Built': 2020,
      'Flag': 'USA',
      'Status': 'Active',
      'Deck Space': 900,
      'Fuel Capacity': 400,
      'Water Capacity': 250,
      'Mud Capacity': 100,
      'Beam': 17.0,
      'Draft': 5.5,
      'Bollard Pull': 150,
      'Operational Area': 'Gulf of Mexico'
    },
    // Empty rows for user input
    ...Array(20).fill(null).map((_, index) => ({
      'Vessel Name': '',
      'Company': '',
      'Size': '',
      'Type': '',
      'Year Built': '',
      'Flag': '',
      'Status': '',
      'Deck Space': '',
      'Fuel Capacity': '',
      'Water Capacity': '',
      'Mud Capacity': '',
      'Beam': '',
      'Draft': '',
      'Bollard Pull': '',
      'Operational Area': ''
    }))
  ];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create main data worksheet
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 20 }, // Vessel Name
    { width: 25 }, // Company
    { width: 10 }, // Size
    { width: 12 }, // Type
    { width: 12 }, // Year Built
    { width: 10 }, // Flag
    { width: 12 }, // Status
    { width: 15 }, // Deck Space
    { width: 15 }, // Fuel Capacity
    { width: 15 }, // Water Capacity
    { width: 15 }, // Mud Capacity
    { width: 10 }, // Beam
    { width: 10 }, // Draft
    { width: 15 }, // Bollard Pull
    { width: 25 }  // Operational Area
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vessel Data');
  
  // Create instructions worksheet
  const instructions = [
    ['Vessel Classification Template Instructions'],
    [''],
    ['Required Columns:'],
    ['• Vessel Name - Official vessel name'],
    ['• Company - Operating company name'],
    ['• Size - Length in feet'],
    ['• Type - Vessel type (OSV, FSV, AHTS, PSV, MSV, Support, Specialty)'],
    [''],
    ['Optional Columns:'],
    ['• Year Built - Construction year'],
    ['• Flag - Registry flag'],
    ['• Status - Active, Standby, Maintenance, or Retired'],
    ['• Deck Space - Deck area in square meters'],
    ['• Fuel Capacity - Fuel capacity in cubic meters'],
    ['• Water Capacity - Water capacity in cubic meters'],
    ['• Mud Capacity - Mud capacity in cubic meters'],
    ['• Beam - Vessel width in meters'],
    ['• Draft - Vessel draft in meters'],
    ['• Bollard Pull - Bollard pull in tonnes (for AHTS vessels)'],
    ['• Operational Area - Comma-separated operating areas'],
    [''],
    ['Valid Vessel Types:'],
    ['• OSV - Offshore Supply Vessel'],
    ['• FSV - Fast Supply Vessel'],
    ['• AHTS - Anchor Handling Tug Supply'],
    ['• PSV - Platform Supply Vessel'],
    ['• MSV - Multi-Service Vessel'],
    ['• Support - Support Vessel'],
    ['• Specialty - Specialty Vessel'],
    [''],
    ['Valid Status Values:'],
    ['• Active - Currently operational'],
    ['• Standby - Available but not currently deployed'],
    ['• Maintenance - Under maintenance or repair'],
    ['• Retired - No longer in service'],
    [''],
    ['Notes:'],
    ['• The first 4 rows contain example data - replace with your vessels'],
    ['• Empty rows are provided for your data entry'],
    ['• All measurements should be in the units specified above'],
    ['• Multiple operational areas can be separated by commas'],
    ['• Missing optional data will be handled gracefully by the import script']
  ];
  
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ width: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Create validation reference sheet
  const validationData = [
    ['Vessel Types', 'Status Values', 'Sample Companies', 'Sample Areas'],
    ['OSV', 'Active', 'Edison Chouest Offshore', 'Gulf of Mexico'],
    ['FSV', 'Standby', 'Harvey Gulf', 'West Africa'],
    ['AHTS', 'Maintenance', 'Hornbeck Offshore', 'North Sea'],
    ['PSV', 'Retired', 'Tidewater Marine', 'Brazil'],
    ['MSV', '', 'Otto Candies', 'Trinidad'],
    ['Support', '', 'Jackson Offshore', 'Mexico'],
    ['Specialty', '', 'Laborde Marine', 'Guyana']
  ];
  
  const validationSheet = XLSX.utils.aoa_to_sheet(validationData);
  validationSheet['!cols'] = [
    { width: 15 },
    { width: 15 },
    { width: 25 },
    { width: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, validationSheet, 'Reference Data');
  
  return workbook;
}

function main() {
  const args = process.argv.slice(2);
  const outputFile = args[0] || 'vessel-classification-template.xlsx';
  
  try {
    const workbook = createTemplate();
    
    // Write file
    XLSX.writeFile(workbook, outputFile);
    
    console.log(`✅ Template created: ${outputFile}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Open the Excel file');
    console.log('2. Review the Instructions sheet');
    console.log('3. Replace example data with your vessels');
    console.log('4. Save the file');
    console.log('5. Run: node scripts/updateVesselClassifications.js ' + outputFile);
    console.log('');
    console.log('📊 The template includes:');
    console.log('• Example vessel data (first 4 rows)');
    console.log('• 20 empty rows for your data');
    console.log('• Detailed instructions sheet');
    console.log('• Reference data for validation');
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}