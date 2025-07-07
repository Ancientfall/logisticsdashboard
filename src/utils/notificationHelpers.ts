// src/utils/notificationHelpers.ts
// Notification helper functions and utilities

import type { 
  Notification, 
  NotificationType, 
  NotificationSubType, 
  NotificationPriority,
  NotificationTemplate,
  NotificationGroup
} from '../types/notification';
import { v4 as uuidv4 } from 'uuid';

// Notification templates for common scenarios
export const NOTIFICATION_TEMPLATES: Record<NotificationSubType, NotificationTemplate> = {
  // Data Quality Alerts
  'missing-vessel-info': {
    type: 'data-quality',
    subType: 'missing-vessel-info',
    priority: 'warning',
    titleTemplate: 'Missing Vessel Information',
    messageTemplate: '{count} voyage events have missing vessel information that may affect analytics accuracy.',
    autoDismiss: false
  },
  'duplicate-records': {
    type: 'data-quality',
    subType: 'duplicate-records',
    priority: 'warning',
    titleTemplate: 'Duplicate Records Detected',
    messageTemplate: 'Found {count} duplicate {recordType} records. Review and resolve to ensure data accuracy.',
    autoDismiss: false
  },
  'zero-hour-events': {
    type: 'data-quality',
    subType: 'zero-hour-events',
    priority: 'info',
    titleTemplate: 'Zero-Hour Events Found',
    messageTemplate: '{count} events have zero hours recorded. These events will be excluded from time-based calculations.',
    autoDismiss: true,
    autoDismissAfter: 10000
  },
  'missing-locations': {
    type: 'data-quality',
    subType: 'missing-locations',
    priority: 'warning',
    titleTemplate: 'Missing Location Data',
    messageTemplate: '{count} events are missing location information. Location-based analytics may be incomplete.',
    autoDismiss: false
  },

  // Processing Updates
  'upload-success': {
    type: 'processing-update',
    subType: 'upload-success',
    priority: 'success',
    titleTemplate: 'File Upload Successful',
    messageTemplate: 'Successfully uploaded {fileName}. Processing {recordCount} records.',
    autoDismiss: true,
    autoDismissAfter: 5000
  },
  'processing-complete': {
    type: 'processing-update',
    subType: 'processing-complete',
    priority: 'success',
    titleTemplate: 'Data Processing Complete',
    messageTemplate: 'Processed {totalRecords} records in {duration}. Dashboard data has been updated.',
    autoDismiss: true,
    autoDismissAfter: 7000
  },
  'incremental-update': {
    type: 'processing-update',
    subType: 'incremental-update',
    priority: 'info',
    titleTemplate: 'Incremental Update Applied',
    messageTemplate: 'Added {newRecords} new records and updated {updatedRecords} existing records.',
    autoDismiss: true,
    autoDismissAfter: 7000
  },
  'refresh-reminder': {
    type: 'processing-update',
    subType: 'refresh-reminder',
    priority: 'info',
    titleTemplate: 'Data Refresh Recommended',
    messageTemplate: 'Your data was last updated {daysAgo} days ago. Consider refreshing for the latest insights.',
    autoDismiss: false
  },

  // Threshold Alerts
  'high-cost': {
    type: 'threshold-alert',
    subType: 'high-cost',
    priority: 'warning',
    titleTemplate: 'High Cost Alert',
    // eslint-disable-next-line no-useless-concat
    messageTemplate: '{entity} has exceeded the cost threshold by {percentage}%. Current: $' + '{current}, Threshold: $' + '{threshold}',
    autoDismiss: false
  },
  'unusual-voyage-duration': {
    type: 'threshold-alert',
    subType: 'unusual-voyage-duration',
    priority: 'warning',
    titleTemplate: 'Unusual Voyage Duration',
    messageTemplate: 'Voyage {voyageId} duration ({duration} hours) is {percentage}% above average for this route.',
    autoDismiss: false
  },
  'vessel-utilization': {
    type: 'threshold-alert',
    subType: 'vessel-utilization',
    priority: 'info',
    titleTemplate: 'Low Vessel Utilization',
    messageTemplate: '{vesselName} utilization is at {utilization}%, below the target of {target}%.',
    autoDismiss: false
  },
  'budget-warning': {
    type: 'threshold-alert',
    subType: 'budget-warning',
    priority: 'error',
    titleTemplate: 'Budget Warning',
    messageTemplate: '{department} department has used {percentage}% of monthly budget with {daysRemaining} days remaining.',
    autoDismiss: false
  },

  // System Notifications
  'export-complete': {
    type: 'system',
    subType: 'export-complete',
    priority: 'success',
    titleTemplate: 'Export Complete',
    messageTemplate: 'Your {exportType} export is ready. File: {fileName}',
    autoDismiss: true,
    autoDismissAfter: 10000
  },
  'storage-warning': {
    type: 'system',
    subType: 'storage-warning',
    priority: 'warning',
    titleTemplate: 'Storage Space Low',
    messageTemplate: 'Local storage is {percentage}% full. Consider clearing old data or increasing storage limit.',
    autoDismiss: false
  },
  'new-feature': {
    type: 'system',
    subType: 'new-feature',
    priority: 'info',
    titleTemplate: 'New Feature Available',
    messageTemplate: '{featureName} is now available. {description}',
    autoDismiss: false
  },
  'system-update': {
    type: 'system',
    subType: 'system-update',
    priority: 'info',
    titleTemplate: 'System Update',
    messageTemplate: 'Dashboard has been updated to version {version}. See changelog for details.',
    autoDismiss: false
  },
  'data-cleared': {
    type: 'system',
    subType: 'data-cleared',
    priority: 'warning',
    titleTemplate: 'All Data Cleared',
    messageTemplate: 'Successfully cleared all data from database. Total: {total} records removed. You can now re-upload your Excel files.',
    autoDismiss: false
  },
  'system-error': {
    type: 'system',
    subType: 'system-error',
    priority: 'error',
    titleTemplate: 'System Error',
    messageTemplate: '{message}',
    autoDismiss: false
  },

  // Platform Updates & Announcements
  'dashboard-enhancement': {
    type: 'system',
    subType: 'dashboard-enhancement',
    priority: 'info',
    titleTemplate: 'Dashboard Enhancement',
    messageTemplate: '{message}',
    autoDismiss: false
  },
  'new-dashboard': {
    type: 'system',
    subType: 'new-dashboard',
    priority: 'success',
    titleTemplate: 'New Dashboard Available',
    messageTemplate: '{message}',
    autoDismiss: false
  },
  'feature-improvement': {
    type: 'system',
    subType: 'feature-improvement',
    priority: 'info',
    titleTemplate: 'Feature Improvement',
    messageTemplate: '{message}',
    autoDismiss: false
  },
  'data-source-added': {
    type: 'system',
    subType: 'data-source-added',
    priority: 'success',
    titleTemplate: 'New Data Source Available',
    messageTemplate: '{message}',
    autoDismiss: false
  },
  'platform-announcement': {
    type: 'system',
    subType: 'platform-announcement',
    priority: 'info',
    titleTemplate: 'Platform Announcement',
    messageTemplate: '{message}',
    autoDismiss: false
  },
  'maintenance-notice': {
    type: 'system',
    subType: 'maintenance-notice',
    priority: 'warning',
    titleTemplate: 'Maintenance Notice',
    messageTemplate: '{message}',
    autoDismiss: false
  },

  // Operational Insights
  'efficiency-improvement': {
    type: 'operational-insight',
    subType: 'efficiency-improvement',
    priority: 'success',
    titleTemplate: 'Efficiency Improvement Detected',
    messageTemplate: '{metric} has improved by {percentage}% compared to last {period}.',
    autoDismiss: true,
    autoDismissAfter: 15000
  },
  'cost-optimization': {
    type: 'operational-insight',
    subType: 'cost-optimization',
    priority: 'info',
    titleTemplate: 'Cost Optimization Opportunity',
    // eslint-disable-next-line no-useless-concat
    messageTemplate: 'Consolidating {route} voyages could save approximately $' + '{savings} per month.',
    autoDismiss: false
  },
  'anomaly-detected': {
    type: 'operational-insight',
    subType: 'anomaly-detected',
    priority: 'warning',
    titleTemplate: 'Anomaly Detected',
    messageTemplate: 'Unusual pattern detected in {metric}: {description}',
    autoDismiss: false
  },
  'monthly-comparison': {
    type: 'operational-insight',
    subType: 'monthly-comparison',
    priority: 'info',
    titleTemplate: 'Monthly Performance Update',
    messageTemplate: '{month} performance: {summary}. Key highlight: {highlight}',
    autoDismiss: false
  }
};

// Create a notification from template
export function createNotification(
  subType: NotificationSubType,
  data: Record<string, any> = {},
  overrides: Partial<Notification> = {}
): Notification {
  const template = NOTIFICATION_TEMPLATES[subType];
  
  return {
    id: uuidv4(),
    type: template.type,
    subType: template.subType,
    priority: template.priority,
    title: formatTemplate(template.titleTemplate, data),
    message: formatTemplate(template.messageTemplate, data),
    timestamp: new Date(),
    isRead: false,
    isAutoDismiss: template.autoDismiss,
    autoDismissAfter: template.autoDismissAfter,
    data,
    ...overrides
  };
}

// Format template string with data
function formatTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key]?.toString() || match;
  }).replace(/\$(\w+)/g, (match, key) => {
    // Handle dollar sign placeholders for currency values
    const value = data[key];
    if (value !== undefined) {
      return `$${value}`;
    }
    return match;
  });
}

// Group notifications by type
export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups: Record<NotificationType, NotificationGroup> = {
    'data-quality': {
      id: 'data-quality',
      type: 'data-quality',
      title: 'Data Quality',
      notifications: [],
      unreadCount: 0
    },
    'processing-update': {
      id: 'processing-update',
      type: 'processing-update',
      title: 'Processing Updates',
      notifications: [],
      unreadCount: 0
    },
    'threshold-alert': {
      id: 'threshold-alert',
      type: 'threshold-alert',
      title: 'Threshold Alerts',
      notifications: [],
      unreadCount: 0
    },
    'system': {
      id: 'system',
      type: 'system',
      title: 'System',
      notifications: [],
      unreadCount: 0
    },
    'operational-insight': {
      id: 'operational-insight',
      type: 'operational-insight',
      title: 'Operational Insights',
      notifications: [],
      unreadCount: 0
    }
  };

  notifications.forEach(notification => {
    const group = groups[notification.type];
    if (group) {
      group.notifications.push(notification);
      if (!notification.isRead) {
        group.unreadCount++;
      }
    }
  });

  return Object.values(groups).filter(group => group.notifications.length > 0);
}

// Sort notifications by priority and timestamp
export function sortNotifications(notifications: Notification[]): Notification[] {
  const priorityOrder: Record<NotificationPriority, number> = {
    error: 0,
    warning: 1,
    success: 2,
    info: 3
  };

  return [...notifications].sort((a, b) => {
    // First sort by read status (unread first)
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    
    // Then by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Finally by timestamp (newest first)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
}

// Filter notifications
export function filterNotifications(
  notifications: Notification[],
  filter: {
    types?: NotificationType[];
    priorities?: NotificationPriority[];
    isRead?: boolean;
    searchTerm?: string;
  }
): Notification[] {
  return notifications.filter(notification => {
    if (filter.types && !filter.types.includes(notification.type)) {
      return false;
    }
    
    if (filter.priorities && !filter.priorities.includes(notification.priority)) {
      return false;
    }
    
    if (filter.isRead !== undefined && notification.isRead !== filter.isRead) {
      return false;
    }
    
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
}

// Get notification icon based on priority
export function getNotificationIcon(priority: NotificationPriority): string {
  switch (priority) {
    case 'error':
      return '⚠️';
    case 'warning':
      return '⚡';
    case 'success':
      return '✅';
    case 'info':
    default:
      return 'ℹ️';
  }
}

// Get notification color classes based on priority
export function getNotificationColorClasses(priority: NotificationPriority): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (priority) {
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600'
      };
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600'
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600'
      };
  }
}

// Clean old notifications based on retention settings
export function cleanOldNotifications(
  notifications: Notification[],
  retentionDays: number
): Notification[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  return notifications.filter(notification => {
    // Keep unread notifications regardless of age
    if (!notification.isRead) {
      return true;
    }
    
    // Keep notifications newer than cutoff date
    return notification.timestamp > cutoffDate;
  });
}

// Limit notifications to maximum count
export function limitNotifications(
  notifications: Notification[],
  maxCount: number
): Notification[] {
  return notifications
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxCount);
}

// Helper function to create platform announcements
export function createPlatformAnnouncement(
  type: 'dashboard-enhancement' | 'new-dashboard' | 'feature-improvement' | 'data-source-added' | 'platform-announcement' | 'maintenance-notice',
  title: string,
  message: string,
  priority: NotificationPriority = 'info'
): Notification {
  return {
    id: uuidv4(),
    type: 'system',
    subType: type,
    priority,
    title,
    message,
    timestamp: new Date(),
    isRead: false,
    isAutoDismiss: false
  };
}