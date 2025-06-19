/**
 * Activity classification utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Classify activity based on parent event and event
 */
export const classifyActivity = (
  parentEvent: string | null,
  event: string | null
): "Productive" | "Non-Productive" | "Needs Review - Null Event" | "Uncategorized" => {
  if (!parentEvent) return "Uncategorized";
  
  // Handle null event values first
  if (event === null || event === undefined || event === '') {
    const productiveParentEvents = [
      "End Voyage", "Standby inside 500m zone", "Standby Inside 500m zone",
      "Standby - Close", "Cargo Ops", "Marine Trial"
    ];
    
    const nonProductiveParentEvents = [
      "Waiting on Weather", "Waiting on Installation",
      "Waiting on Quay", "Port or Supply Base closed"
    ];
    
    if (productiveParentEvents.includes(parentEvent)) {
      return "Productive";
    } else if (nonProductiveParentEvents.includes(parentEvent)) {
      return "Non-Productive";
    } else {
      return "Needs Review - Null Event";
    }
  }
  
  // Handle productive combinations (Parent Event + Event)
  const productiveCombinations = [
    "ROV Operations,ROV Operational duties",
    "Cargo Ops,Load - Fuel, Water or Methanol",
    "Cargo Ops,Offload - Fuel, Water or Methanol",
    "Cargo Ops,Cargo Loading or Discharging",
    "Cargo Ops,Simops ",
    "Installation Productive Time,Bulk Displacement",
    "Installation Productive Time,Floating Storage",
    "Maintenance,Vessel Under Maintenance",
    "Maintenance,Training",
    "Marine Trial, ",
    "Maneuvering,Shifting",
    "Maneuvering,Set Up",
    "Maneuvering,Pilotage",
    "Standby,Close - Standby",
    "Standby,Emergency Response Standby",
    "Transit,Steam from Port",
    "Transit,Steam to Port",
    "Transit,Steam Infield",
    "Transit,Enter 500 mtr zone Setup Maneuver",
    "Stop the Job,Installation, Vessel, Supply Base",
    "Standby,Standby - Close",
    "Tank Cleaning,Tank Cleaning"
  ];
  
  const combination = `${parentEvent},${event}`;
  if (productiveCombinations.includes(combination)) {
    return "Productive";
  }
  
  // Handle non-productive parent events
  const nonProductiveParentEvents = [
    "Waiting on Weather", "Waiting on Installation",
    "Waiting on Quay", "Port or Supply Base closed"
  ];
  
  if (nonProductiveParentEvents.includes(parentEvent)) {
    return "Non-Productive";
  }
  
  return "Uncategorized";
};

/**
 * Infer company from vessel name
 */
export const inferCompanyFromVessel = (vesselName: string): string => {
  const name = vesselName.toLowerCase();
  if (name.includes('hos')) return 'Hornbeck';
  if (name.includes('chouest')) return 'Edison Chouest';
  if (name.includes('harvey')) return 'Harvey Gulf';
  if (name.includes('seacor')) return 'Seacor';
  if (name.includes('jackson')) return 'Jackson Offshore';   
  return 'Unknown';
};

/**
 * Infer vessel type from vessel name
 */
export const inferVesselType = (vesselName: string): string => {
  const name = vesselName.toLowerCase();
  if (name.includes('fsv') || name.includes('fast')) return 'FSV';
  if (name.includes('osv')) return 'OSV';
  return 'Other';
}; 