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
      const monthMatch = selectedMonth === 'all' || allocation.monthYear === selectedMonth;
      const locationMatch = selectedLocation === 'all' || allocation.rigLocation === selectedLocation;
      const projectMatch = selectedProjectType === 'all' || allocation.projectType === selectedProjectType;
      
      return monthMatch && locationMatch && projectMatch;
    });
  }, [costAllocation, selectedMonth, selectedLocation, selectedProjectType]);
};