import { BarChart3 } from 'lucide-react';
import { Tab } from './TabNavigation';

export const COST_ALLOCATION_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }
];

export type TabId = 'dashboard';

export const PROJECT_TYPE_CONFIG = {
  drilling: {
    name: 'Drilling Activities',
    colorClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    textColorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
  },
  exploration: {
    name: 'Exploration Activities',
    colorClass: 'bg-gradient-to-br from-purple-500 to-pink-600',
    textColorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-50',
    borderColorClass: 'border-purple-200',
  },
  transit: {
    name: 'Transit',
    colorClass: 'bg-gradient-to-br from-gray-500 to-gray-700',
    textColorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-50',
    borderColorClass: 'border-gray-200',
  },
  other: {
    name: 'Other Activities',
    colorClass: 'bg-gradient-to-br from-orange-500 to-red-600',
    textColorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-50',
    borderColorClass: 'border-orange-200',
  },
} as const;

export type ProjectType = keyof typeof PROJECT_TYPE_CONFIG;