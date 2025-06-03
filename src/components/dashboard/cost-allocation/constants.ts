import { BarChart3, MapPin, FileText, Calendar, TrendingUp, Download } from 'lucide-react';
import { Tab } from './TabNavigation';

export const COST_ALLOCATION_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'rigs', label: 'Rigs', icon: MapPin },
  { id: 'projects', label: 'Projects', icon: FileText },
  { id: 'monthly', label: 'Monthly Tracking', icon: Calendar },
  { id: 'trends', label: 'Monthly Trends', icon: TrendingUp },
  { id: 'export', label: 'Export & Templates', icon: Download }
];

export type TabId = 'dashboard' | 'rigs' | 'projects' | 'monthly' | 'trends' | 'export';

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