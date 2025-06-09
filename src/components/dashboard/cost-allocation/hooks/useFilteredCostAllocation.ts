import { useMemo } from 'react';
import { CostAllocation } from '../../../../types';

export const useFilteredCostAllocation = (
  costAllocation: CostAllocation[] | undefined,
  selectedMonth: string,
  selectedLocation: string,
  selectedProjectType: string
) => {
  return useMemo(() => {
    if (!costAllocation) return [];
    
    return costAllocation.filter(allocation => {
      // Check for "All" values
      const monthMatch = selectedMonth === 'All Months' || selectedMonth === 'all' || 
        (allocation.costAllocationDate && 
         `${allocation.costAllocationDate.toLocaleString('en-US', { month: 'long' })} ${allocation.costAllocationDate.getFullYear()}` === selectedMonth);
      
      const locationMatch = selectedLocation === 'All Locations' || selectedLocation === 'all' || 
        allocation.rigLocation === selectedLocation || 
        allocation.locationReference === selectedLocation;
      
      const projectMatch = selectedProjectType === 'All Types' || selectedProjectType === 'all' || 
        allocation.projectType === selectedProjectType;
      
      return monthMatch && locationMatch && projectMatch;
    });
  }, [costAllocation, selectedMonth, selectedLocation, selectedProjectType]);
};