// Debug script to examine Mad Dog bulk actions data
// Run this in the browser console on the dashboard page

function debugMadDogBulkActions() {
  console.log('🔍 Debugging Mad Dog Bulk Actions in Enhanced Fluid Analytics');
  
  // Get the data context from the React dev tools or window
  // This assumes the DataContext is accessible
  
  // Method 1: Try to access from React DevTools
  let bulkActions = null;
  
  try {
    // Check if window.debugStore is available (from debug utils)
    if (window.debugStore && window.debugStore.bulkActions) {
      bulkActions = window.debugStore.bulkActions;
      console.log('✅ Found bulk actions via debugStore:', bulkActions.length);
    }
    // Alternative: Check React fiber node
    else if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      console.log('⚠️ Could not access bulk actions directly. Please use browser React DevTools.');
      console.log('📋 To manually debug, paste the following into console after data loads:');
      console.log(`
        // Get bulk actions from React DevTools
        const bulkActions = // paste bulk actions array here
        debugMadDogSpecific(bulkActions);
      `);
      return;
    }
  } catch (error) {
    console.error('❌ Error accessing data:', error);
  }
  
  if (!bulkActions || !Array.isArray(bulkActions)) {
    console.error('❌ Bulk actions not found or not an array');
    return;
  }
  
  return debugMadDogSpecific(bulkActions);
}

function debugMadDogSpecific(bulkActions) {
  console.log('🔍 Starting Mad Dog specific debugging...');
  
  // Filter for Mad Dog related entries
  const madDogActions = bulkActions.filter(action => {
    const destination = (action.standardizedDestination || '').toLowerCase();
    const origin = (action.standardizedOrigin || '').toLowerCase();
    const atPort = (action.atPort || '').toLowerCase();
    
    return destination.includes('mad dog') || 
           origin.includes('mad dog') || 
           atPort.includes('mad dog');
  });
  
  console.log(`📊 Total bulk actions: ${bulkActions.length}`);
  console.log(`📊 Mad Dog bulk actions: ${madDogActions.length}`);
  
  if (madDogActions.length === 0) {
    console.log('❌ No Mad Dog bulk actions found!');
    
    // Check for variations in location names
    const uniqueDestinations = [...new Set(bulkActions.map(a => a.standardizedDestination).filter(Boolean))];
    const uniqueOrigins = [...new Set(bulkActions.map(a => a.standardizedOrigin).filter(Boolean))];
    
    console.log('📍 All unique destinations:', uniqueDestinations.sort());
    console.log('📍 All unique origins:', uniqueOrigins.sort());
    
    // Look for potential Mad Dog variations
    const madDogVariations = [...uniqueDestinations, ...uniqueOrigins]
      .filter(loc => loc && (
        loc.toLowerCase().includes('mad') || 
        loc.toLowerCase().includes('dog') ||
        loc.toLowerCase().includes('thunderhorse') ||
        loc.toLowerCase().includes('thunder')
      ));
    
    console.log('🔍 Potential Mad Dog location variations:', madDogVariations);
    return;
  }
  
  // Analyze Mad Dog actions
  console.log('📋 Mad Dog Actions Analysis:');
  
  // Group by key properties
  const analysis = {
    byAction: {},
    byPortType: {},
    byFluidType: {},
    byDestination: {},
    drillingFluids: 0,
    completionFluids: 0,
    otherFluids: 0,
    withRigPortType: 0,
    withLoadAction: 0,
    withOffloadAction: 0
  };
  
  madDogActions.forEach(action => {
    // By action
    const actionKey = action.action || 'Unknown';
    analysis.byAction[actionKey] = (analysis.byAction[actionKey] || 0) + 1;
    
    // By port type
    const portTypeKey = action.portType || 'Unknown';
    analysis.byPortType[portTypeKey] = (analysis.byPortType[portTypeKey] || 0) + 1;
    
    // By fluid type
    const fluidTypeKey = action.bulkType || 'Unknown';
    analysis.byFluidType[fluidTypeKey] = (analysis.byFluidType[fluidTypeKey] || 0) + 1;
    
    // By destination
    const destKey = action.standardizedDestination || 'No Destination';
    analysis.byDestination[destKey] = (analysis.byDestination[destKey] || 0) + 1;
    
    // Drilling/completion fluid counts
    if (action.isDrillingFluid) analysis.drillingFluids++;
    if (action.isCompletionFluid) analysis.completionFluids++;
    if (!action.isDrillingFluid && !action.isCompletionFluid) analysis.otherFluids++;
    
    // Filtering criteria
    if (action.portType === 'rig') analysis.withRigPortType++;
    if (action.action && action.action.toLowerCase().includes('load')) analysis.withLoadAction++;
    if (action.action && action.action.toLowerCase().includes('offload')) analysis.withOffloadAction++;
  });
  
  console.log('📊 Mad Dog Analysis Results:');
  console.log('Actions by type:', analysis.byAction);
  console.log('Actions by port type:', analysis.byPortType);
  console.log('Actions by fluid type:', analysis.byFluidType);
  console.log('Actions by destination:', analysis.byDestination);
  console.log(`💧 Drilling fluids: ${analysis.drillingFluids}`);
  console.log(`🧪 Completion fluids: ${analysis.completionFluids}`);
  console.log(`❓ Other fluids: ${analysis.otherFluids}`);
  console.log(`🏭 With rig port type: ${analysis.withRigPortType}`);
  console.log(`⬆️ With load action: ${analysis.withLoadAction}`);
  console.log(`⬇️ With offload action: ${analysis.withOffloadAction}`);
  
  // Check Enhanced Fluid Analytics filtering criteria
  const enhancedFluidCriteria = madDogActions.filter(action => {
    return (action.isDrillingFluid || action.isCompletionFluid) &&
           (action.action && (action.action.toLowerCase().includes('offload') || action.action.toLowerCase().includes('load'))) &&
           (action.portType === 'rig');
  });
  
  console.log(`✅ Actions meeting Enhanced Fluid Analytics criteria: ${enhancedFluidCriteria.length}`);
  
  if (enhancedFluidCriteria.length === 0) {
    console.log('❌ No Mad Dog actions meet the Enhanced Fluid Analytics criteria!');
    console.log('🔍 Debugging criteria:');
    
    // Check each criteria individually
    const hasDrillingOrCompletion = madDogActions.filter(a => a.isDrillingFluid || a.isCompletionFluid);
    const hasCorrectAction = madDogActions.filter(a => a.action && (a.action.toLowerCase().includes('offload') || a.action.toLowerCase().includes('load')));
    const hasRigPortType = madDogActions.filter(a => a.portType === 'rig');
    
    console.log(`- Has drilling/completion fluid: ${hasDrillingOrCompletion.length}/${madDogActions.length}`);
    console.log(`- Has load/offload action: ${hasCorrectAction.length}/${madDogActions.length}`);
    console.log(`- Has rig port type: ${hasRigPortType.length}/${madDogActions.length}`);
    
    // Show sample failed actions
    console.log('📋 Sample Mad Dog actions that fail criteria:');
    madDogActions.slice(0, 5).forEach((action, i) => {
      console.log(`${i + 1}. Action: "${action.action}", PortType: "${action.portType}", IsDrilling: ${action.isDrillingFluid}, IsCompletion: ${action.isCompletionFluid}, BulkType: "${action.bulkType}"`);
    });
  } else {
    console.log('✅ Sample Mad Dog actions meeting criteria:');
    enhancedFluidCriteria.slice(0, 5).forEach((action, i) => {
      console.log(`${i + 1}. ${action.bulkType} - ${action.action} at ${action.standardizedDestination} (${action.volumeBbls} BBLs)`);
    });
  }
  
  return {
    totalMadDogActions: madDogActions.length,
    qualifyingActions: enhancedFluidCriteria.length,
    analysis,
    madDogActions: madDogActions.slice(0, 10), // First 10 for inspection
    qualifyingActionsDetails: enhancedFluidCriteria.slice(0, 10)
  };
}

// Auto-run if bulk actions are available
if (typeof window !== 'undefined') {
  console.log('🚀 Mad Dog Bulk Actions Debugger loaded');
  console.log('📋 Run debugMadDogBulkActions() to start debugging');
  
  // Make functions globally available
  window.debugMadDogBulkActions = debugMadDogBulkActions;
  window.debugMadDogSpecific = debugMadDogSpecific;
  
  // Try to auto-run if data is immediately available
  setTimeout(() => {
    try {
      debugMadDogBulkActions();
    } catch (error) {
      console.log('⏳ Data not ready yet. Run debugMadDogBulkActions() manually when data loads.');
    }
  }, 2000);
}