/**
 * Script to clean VoyageEvent duplicates and re-add unique constraint
 * 
 * This script identifies and removes duplicate voyage events based on
 * key identifying fields, then re-adds the unique constraint.
 * 
 * Usage: node src/scripts/cleanVoyageEventDuplicates.js [--dry-run]
 */

const { VoyageEvent } = require('../models');
const { Op } = require('sequelize');

const DRY_RUN = process.argv.includes('--dry-run');

async function findDuplicates() {
  console.log('🔍 Identifying duplicate voyage events...');
  
  // Group by key fields that should be unique
  const duplicateGroups = await VoyageEvent.findAll({
    attributes: [
      'vessel',
      'voyageNumber',
      'eventDate',
      'eventType',
      'location',
      [VoyageEvent.sequelize.fn('COUNT', '*'), 'count'],
      [VoyageEvent.sequelize.fn('MIN', VoyageEvent.sequelize.col('id')), 'keepId']
    ],
    group: ['vessel', 'voyageNumber', 'eventDate', 'eventType', 'location'],
    having: VoyageEvent.sequelize.where(
      VoyageEvent.sequelize.fn('COUNT', '*'), 
      Op.gt, 
      1
    ),
    raw: true
  });

  console.log(`📊 Found ${duplicateGroups.length} groups of duplicates`);
  
  let totalDuplicates = 0;
  const duplicateIds = [];

  for (const group of duplicateGroups) {
    const duplicateCount = parseInt(group.count) - 1; // Keep one record
    totalDuplicates += duplicateCount;
    
    console.log(`   📍 Group: ${group.vessel} | ${group.voyageNumber} | ${group.location} (${group.count} records)`);
    
    // Find all records in this group except the one we want to keep
    const duplicates = await VoyageEvent.findAll({
      where: {
        vessel: group.vessel,
        voyageNumber: group.voyageNumber,
        eventDate: group.eventDate,
        eventType: group.eventType,
        location: group.location,
        id: { [Op.ne]: group.keepId }
      },
      attributes: ['id']
    });
    
    duplicateIds.push(...duplicates.map(d => d.id));
  }

  return { totalDuplicates, duplicateIds };
}

async function removeDuplicates(duplicateIds) {
  if (DRY_RUN) {
    console.log(`🔥 DRY RUN: Would remove ${duplicateIds.length} duplicate records`);
    return;
  }

  console.log(`🔥 Removing ${duplicateIds.length} duplicate records...`);
  
  const batchSize = 100;
  let processed = 0;
  
  for (let i = 0; i < duplicateIds.length; i += batchSize) {
    const batch = duplicateIds.slice(i, i + batchSize);
    
    await VoyageEvent.destroy({
      where: {
        id: { [Op.in]: batch }
      }
    });
    
    processed += batch.length;
    console.log(`   ✅ Processed ${processed}/${duplicateIds.length} records`);
  }
  
  console.log('✅ Duplicate removal completed');
}

async function addUniqueConstraint() {
  if (DRY_RUN) {
    console.log('🔒 DRY RUN: Would add unique constraint on [vessel, voyageNumber, eventDate, eventType, location]');
    return;
  }

  console.log('🔒 Adding unique constraint...');
  
  try {
    await VoyageEvent.sequelize.query(`
      ALTER TABLE VoyageEvents 
      ADD CONSTRAINT unique_voyage_event 
      UNIQUE (vessel, voyageNumber, eventDate, eventType, location)
    `);
    
    console.log('✅ Unique constraint added successfully');
  } catch (error) {
    console.error('❌ Failed to add unique constraint:', error.message);
    throw error;
  }
}

async function validateDataIntegrity() {
  console.log('🔍 Validating data integrity...');
  
  const totalRecords = await VoyageEvent.count();
  console.log(`📊 Total voyage events: ${totalRecords}`);
  
  // Check for any remaining duplicates
  const remainingDuplicates = await VoyageEvent.findAll({
    attributes: [
      'vessel',
      'voyageNumber', 
      'eventDate',
      'eventType',
      'location',
      [VoyageEvent.sequelize.fn('COUNT', '*'), 'count']
    ],
    group: ['vessel', 'voyageNumber', 'eventDate', 'eventType', 'location'],
    having: VoyageEvent.sequelize.where(
      VoyageEvent.sequelize.fn('COUNT', '*'),
      Op.gt,
      1
    ),
    raw: true
  });
  
  if (remainingDuplicates.length === 0) {
    console.log('✅ No duplicates found - data is clean');
  } else {
    console.log(`❌ Warning: ${remainingDuplicates.length} duplicate groups still exist`);
    remainingDuplicates.forEach(dup => {
      console.log(`   - ${dup.vessel} | ${dup.voyageNumber} | ${dup.location} (${dup.count} records)`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting VoyageEvent duplicate cleanup...');
    console.log(`⚙️  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
    console.log('');
    
    // Step 1: Find duplicates
    const { totalDuplicates, duplicateIds } = await findDuplicates();
    
    if (totalDuplicates === 0) {
      console.log('✅ No duplicates found! Data is already clean.');
      
      if (!DRY_RUN) {
        await addUniqueConstraint();
      }
      
      return;
    }
    
    console.log(`📊 Summary: ${totalDuplicates} duplicate records to remove`);
    console.log('');
    
    // Step 2: Remove duplicates
    await removeDuplicates(duplicateIds);
    
    // Step 3: Add unique constraint
    if (!DRY_RUN) {
      await addUniqueConstraint();
    }
    
    // Step 4: Validate
    await validateDataIntegrity();
    
    console.log('');
    console.log('🎉 VoyageEvent cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { findDuplicates, removeDuplicates, addUniqueConstraint, validateDataIntegrity };