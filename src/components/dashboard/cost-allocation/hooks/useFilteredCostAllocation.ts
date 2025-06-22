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
      // Check for "All" values and YTD
      let monthMatch = false;
      
      if (selectedMonth === 'All Months' || selectedMonth === 'all') {
        monthMatch = true;
      } else if (selectedMonth === 'YTD') {
        // YTD 2025: January 1, 2025 to May 31, 2025 (as requested by user)
        if (allocation.costAllocationDate && allocation.costAllocationDate instanceof Date) {
          const allocDate = allocation.costAllocationDate;
          const year = allocDate.getFullYear();
          const month = allocDate.getMonth(); // 0-based (0 = January, 4 = May)
          
          // User specified YTD should be 2025: Jan 1, 2025 - May 31, 2025
          monthMatch = year === 2025 && month >= 0 && month <= 4;
        }
      } else if (allocation.costAllocationDate) {
        const dateString = `${allocation.costAllocationDate.toLocaleString('en-US', { month: 'long' })} ${allocation.costAllocationDate.getFullYear()}`;
        monthMatch = dateString === selectedMonth;
      }
      
      const locationMatch = selectedLocation === 'All Locations' || selectedLocation === 'all' || 
        allocation.rigLocation === selectedLocation || 
        allocation.locationReference === selectedLocation;
      
      const projectMatch = selectedProjectType === 'All Types' || selectedProjectType === 'all' || 
        allocation.projectType === selectedProjectType;
      
      return monthMatch && locationMatch && projectMatch;
    });
  }, [costAllocation, selectedMonth, selectedLocation, selectedProjectType]);
};