// src/types/notification.ts
// Notification system types for BP Logistics Dashboard

export type NotificationPriority = 'info' | 'warning' | 'error' | 'success';

export type NotificationType = 
  | 'data-quality'
  | 'processing-update'
  | 'threshold-alert'
  | 'system'
  | 'operational-insight';

export type NotificationSubType = 
  // Data Quality Alerts
  | 'missing-vessel-info'
  | 'duplicate-records'
  | 'zero-hour-events'
  | 'missing-locations'
  // Processing Updates  
  | 'upload-success'
  | 'processing-complete'
  | 'incremental-update'
  | 'refresh-reminder'
  // Threshold Alerts
  | 'high-cost'
  | 'unusual-voyage-duration'
  | 'vessel-utilization'
  | 'budget-warning'
  // System Notifications
  | 'export-complete'
  | 'storage-warning'
  | 'new-feature'
  | 'system-update'
  // Operational Insights
  | 'efficiency-improvement'
  | 'cost-optimization'
  | 'anomaly-detected'
  | 'monthly-comparison';

export interface Notification {
  id: string;
  type: NotificationType;
  subType: NotificationSubType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isAutoDismiss?: boolean;
  autoDismissAfter?: number; // milliseconds
  data?: Record<string, any>; // Additional context data
  actions?: NotificationAction[];
  groupId?: string; // For grouping related notifications
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationGroup {
  id: string;
  type: NotificationType;
  title: string;
  notifications: Notification[];
  unreadCount: number;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  groups: NotificationGroup[];
  maxNotifications: number;
  isLoading: boolean;
  error?: string;
}

export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  isRead?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Notification templates for common scenarios
export interface NotificationTemplate {
  type: NotificationType;
  subType: NotificationSubType;
  priority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  autoDismiss?: boolean;
  autoDismissAfter?: number;
}

// Notification settings
export interface NotificationSettings {
  enabled: boolean;
  enableSound: boolean;
  enableDesktopNotifications: boolean;
  autoDismissInfo: boolean;
  autoDismissSuccess: boolean;
  maxNotifications: number;
  retentionDays: number;
}