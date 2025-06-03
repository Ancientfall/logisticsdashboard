import { Drill, Wrench, Anchor, BarChart3, Settings, Users } from 'lucide-react';

export const PROJECT_TYPE_CONFIG = {
  'Drilling': { icon: Drill, colorClass: 'blue' },
  'Completions': { icon: Wrench, colorClass: 'green' },
  'P&A': { icon: Anchor, colorClass: 'red' },
  'Production': { icon: BarChart3, colorClass: 'purple' },
  'Maintenance': { icon: Settings, colorClass: 'orange' },
  'Operator Sharing': { icon: Users, colorClass: 'indigo' },
  'Other': { icon: BarChart3, colorClass: 'gray' }
} as const;

export type ProjectType = keyof typeof PROJECT_TYPE_CONFIG;

export const detectProjectType = (
  description?: string, 
  costElement?: string, 
  _lcNumber?: string, 
  projectType?: string
): ProjectType => {
  // First priority: Use the explicit Project Type from the data if available
  if (projectType && projectType in PROJECT_TYPE_CONFIG) {
    return projectType as ProjectType;
  }
  
  // Fallback: Analyze description and cost element
  const text = `${description || ''} ${costElement || ''}`.toLowerCase();
  
  // P&A Operations
  if (text.includes('p&a') || text.includes('abandon') || text.includes('plug')) {
    return 'P&A';
  }
  
  // Completions (more specific patterns)
  if (text.includes('completion') || text.includes('fracturing') || text.includes('perforation') ||
      text.includes('workover') || text.includes('stimulation') || text.includes('acidizing')) {
    return 'Completions';
  }
  
  // Drilling (broad patterns)
  if (text.includes('drill') || text.includes('spud') || text.includes('cementing') ||
      text.includes('casing') || text.includes('mud') || text.includes('logging') ||
      text.includes('wireline') || text.includes('bha')) {
    return 'Drilling';
  }
  
  // Production
  if (text.includes('production') || text.includes('facility') || text.includes('platform') ||
      text.includes('processing') || text.includes('separation') || text.includes('export')) {
    return 'Production';
  }
  
  // Maintenance
  if (text.includes('maintenance') || text.includes('repair') || text.includes('inspection') ||
      text.includes('overhaul') || text.includes('upgrade')) {
    return 'Maintenance';
  }
  
  // Operator Sharing
  if (text.includes('operator') || text.includes('sharing') || text.includes('joint') ||
      text.includes('partner') || text.includes('alliance')) {
    return 'Operator Sharing';
  }
  
  return 'Other';
};

export const getProjectIcon = (projectType: string) => {
  return PROJECT_TYPE_CONFIG[projectType as ProjectType]?.icon || BarChart3;
};

export const getProjectColorClasses = (projectType: string) => {
  const colorClass = PROJECT_TYPE_CONFIG[projectType as ProjectType]?.colorClass || 'gray';
  
  // Return predefined Tailwind classes based on color
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconBg: 'bg-blue-200',
      iconText: 'text-blue-700'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      iconBg: 'bg-green-200',
      iconText: 'text-green-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconBg: 'bg-red-200',
      iconText: 'text-red-700'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      iconBg: 'bg-purple-200',
      iconText: 'text-purple-700'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      iconBg: 'bg-orange-200',
      iconText: 'text-orange-700'
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-800',
      iconBg: 'bg-indigo-200',
      iconText: 'text-indigo-700'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      iconBg: 'bg-gray-200',
      iconText: 'text-gray-700'
    }
  };
  
  return colorMap[colorClass as keyof typeof colorMap] || colorMap.gray;
};