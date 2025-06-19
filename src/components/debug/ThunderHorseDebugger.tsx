import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getAllDrillingCapableLocations, mapCostAllocationLocation } from '../../data/masterFacilities';

const ThunderHorseDebugger: React.FC = () => {
  const { voyageEvents, vesselManifests, costAllocation } = useData();

  const debugInfo = useMemo(() => {
    const thunderHorseDrilling = getAllDrillingCapableLocations().find(
      f => f.displayName === 'Thunder Horse (Drilling)'
    );

    // Find all variations of Thunder Horse in the data
    const thunderHorseVariations = new Set<string>();
    const thunderHorseEvents: any[] = [];
    const thunderHorseManifests: any[] = [];
    const thunderHorseCosts: any[] = [];

    // Check voyage events
    voyageEvents.forEach(event => {
      const location = event.location?.toLowerCase() || '';
      const mappedLocation = event.mappedLocation?.toLowerCase() || '';
      
      if (location.includes('thunder') || mappedLocation.includes('thunder')) {
        thunderHorseVariations.add(`Event Location: ${event.location} | Mapped: ${event.mappedLocation}`);
        thunderHorseEvents.push({
          vessel: event.vessel,
          location: event.location,
          mappedLocation: event.mappedLocation,
          department: event.department,
          hours: event.hours,
          finalHours: event.finalHours,
          parentEvent: event.parentEvent,
          event: event.event,
          lcNumber: event.lcNumber,
          costDedicatedTo: event.costDedicatedTo
        });
      }
    });

    // Check vessel manifests
    vesselManifests.forEach(manifest => {
      const location = manifest.offshoreLocation?.toLowerCase() || '';
      const mappedLocation = manifest.mappedLocation?.toLowerCase() || '';
      
      if (location.includes('thunder') || mappedLocation.includes('thunder')) {
        thunderHorseVariations.add(`Manifest Location: ${manifest.offshoreLocation} | Mapped: ${manifest.mappedLocation}`);
        thunderHorseManifests.push({
          transporter: manifest.transporter,
          offshoreLocation: manifest.offshoreLocation,
          mappedLocation: manifest.mappedLocation,
          finalDepartment: manifest.finalDepartment,
          deckTons: manifest.deckTons,
          lifts: manifest.lifts,
          costCode: manifest.costCode
        });
      }
    });

    // Check cost allocations
    costAllocation.forEach(cost => {
      const rigLocation = cost.rigLocation?.toLowerCase() || '';
      const locationRef = cost.locationReference?.toLowerCase() || '';
      
      if (rigLocation.includes('thunder') || locationRef.includes('thunder')) {
        const mapped = mapCostAllocationLocation(cost.rigLocation, cost.locationReference);
        thunderHorseCosts.push({
          lcNumber: cost.lcNumber,
          rigLocation: cost.rigLocation,
          locationReference: cost.locationReference,
          mappedTo: mapped?.displayName || 'UNMAPPED',
          department: cost.department,
          projectType: cost.projectType,
          totalAllocatedDays: cost.totalAllocatedDays,
          monthYear: cost.monthYear
        });
      }
    });

    // Check drilling LCs
    const drillingLCs = thunderHorseDrilling?.drillingLCs?.split(',') || [];
    const lcCosts = costAllocation.filter(cost => 
      drillingLCs.includes(String(cost.lcNumber).trim())
    );

    // Department distribution
    const departmentCounts = {
      events: {
        Drilling: thunderHorseEvents.filter(e => e.department === 'Drilling').length,
        Production: thunderHorseEvents.filter(e => e.department === 'Production').length,
        Logistics: thunderHorseEvents.filter(e => e.department === 'Logistics').length,
        None: thunderHorseEvents.filter(e => !e.department).length
      },
      manifests: {
        Drilling: thunderHorseManifests.filter(m => m.finalDepartment === 'Drilling').length,
        Production: thunderHorseManifests.filter(m => m.finalDepartment === 'Production').length,
        Logistics: thunderHorseManifests.filter(m => m.finalDepartment === 'Logistics').length,
        None: thunderHorseManifests.filter(m => !m.finalDepartment).length
      }
    };

    return {
      thunderHorseDrilling,
      variations: Array.from(thunderHorseVariations),
      events: thunderHorseEvents,
      manifests: thunderHorseManifests,
      costs: thunderHorseCosts,
      lcCosts,
      departmentCounts,
      drillingLCs
    };
  }, [voyageEvents, vesselManifests, costAllocation]);

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-900">Thunder Horse (Drilling) Debug Information</h2>
      
      {/* Master Facility Info */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Master Facility Configuration</h3>
        {debugInfo.thunderHorseDrilling ? (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Display Name:</span> {debugInfo.thunderHorseDrilling.displayName}</p>
            <p><span className="font-medium">Location Name:</span> {debugInfo.thunderHorseDrilling.locationName}</p>
            <p><span className="font-medium">Drilling LCs:</span> {debugInfo.thunderHorseDrilling.drillingLCs}</p>
            <p><span className="font-medium">Facility Type:</span> {debugInfo.thunderHorseDrilling.facilityType}</p>
          </div>
        ) : (
          <p className="text-red-600">Thunder Horse (Drilling) not found in master facilities!</p>
        )}
      </div>

      {/* Location Variations */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Location Name Variations Found</h3>
        {debugInfo.variations.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-1">
            {debugInfo.variations.map((variation, idx) => (
              <li key={idx}>{variation}</li>
            ))}
          </ul>
        ) : (
          <p className="text-red-600">No Thunder Horse variations found in the data!</p>
        )}
      </div>

      {/* Department Distribution */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Department Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm mb-1">Voyage Events</h4>
            <ul className="text-sm space-y-1">
              <li>Drilling: {debugInfo.departmentCounts.events.Drilling}</li>
              <li>Production: {debugInfo.departmentCounts.events.Production}</li>
              <li>Logistics: {debugInfo.departmentCounts.events.Logistics}</li>
              <li className="text-red-600">No Department: {debugInfo.departmentCounts.events.None}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">Vessel Manifests</h4>
            <ul className="text-sm space-y-1">
              <li>Drilling: {debugInfo.departmentCounts.manifests.Drilling}</li>
              <li>Production: {debugInfo.departmentCounts.manifests.Production}</li>
              <li>Logistics: {debugInfo.departmentCounts.manifests.Logistics}</li>
              <li className="text-red-600">No Department: {debugInfo.departmentCounts.manifests.None}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Thunder Horse Events Sample */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Sample Thunder Horse Events ({debugInfo.events.length} total)</h3>
        {debugInfo.events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vessel</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Mapped Location</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Hours</th>
                  <th className="text-left p-2">Parent Event</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.events.slice(0, 10).map((event, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{event.vessel}</td>
                    <td className="p-2">{event.location}</td>
                    <td className="p-2">{event.mappedLocation}</td>
                    <td className="p-2">{event.department || <span className="text-red-600">None</span>}</td>
                    <td className="p-2">{event.finalHours?.toFixed(2) || event.hours?.toFixed(2)}</td>
                    <td className="p-2">{event.parentEvent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-red-600">No Thunder Horse events found!</p>
        )}
      </div>

      {/* Thunder Horse Manifests Sample */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Sample Thunder Horse Manifests ({debugInfo.manifests.length} total)</h3>
        {debugInfo.manifests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Transporter</th>
                  <th className="text-left p-2">Offshore Location</th>
                  <th className="text-left p-2">Mapped Location</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Deck Tons</th>
                  <th className="text-left p-2">Lifts</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.manifests.slice(0, 10).map((manifest, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{manifest.transporter}</td>
                    <td className="p-2">{manifest.offshoreLocation}</td>
                    <td className="p-2">{manifest.mappedLocation}</td>
                    <td className="p-2">{manifest.finalDepartment || <span className="text-red-600">None</span>}</td>
                    <td className="p-2">{manifest.deckTons?.toFixed(2)}</td>
                    <td className="p-2">{manifest.lifts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-red-600">No Thunder Horse manifests found!</p>
        )}
      </div>

      {/* LC Cost Allocations */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Thunder Horse Drilling LC Cost Allocations</h3>
        <p className="text-sm mb-2">Looking for LCs: {debugInfo.drillingLCs.join(', ')}</p>
        {debugInfo.lcCosts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">LC Number</th>
                  <th className="text-left p-2">Rig Location</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Allocated Days</th>
                  <th className="text-left p-2">Month-Year</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.lcCosts.slice(0, 10).map((cost, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{cost.lcNumber}</td>
                    <td className="p-2">{cost.rigLocation || cost.locationReference}</td>
                    <td className="p-2">{cost.department || <span className="text-red-600">None</span>}</td>
                    <td className="p-2">{cost.totalAllocatedDays}</td>
                    <td className="p-2">{cost.monthYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-red-600">No cost allocations found for Thunder Horse drilling LCs!</p>
        )}
      </div>
    </div>
  );
};

export default ThunderHorseDebugger;