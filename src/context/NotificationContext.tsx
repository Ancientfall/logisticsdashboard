// src/context/NotificationContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { 
  Notification, 
  NotificationState, 
  NotificationSettings,
  NotificationSubType
} from '../types/notification';
import { 
  createNotification, 
  groupNotifications, 
  sortNotifications,
  cleanOldNotifications,
  limitNotifications
} from '../utils/notificationHelpers';
import { logisticsDB } from '../utils/storage/indexedDBManager';
import { v4 as uuidv4 } from 'uuid';

// Action types
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined };

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  groups: [],
  maxNotifications: 100,
  isLoading: false,
  error: undefined
};

// Default settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  enableSound: false,
  enableDesktopNotifications: false,
  autoDismissInfo: true,
  autoDismissSuccess: true,
  maxNotifications: 100,
  retentionDays: 30
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications];
      const limited = limitNotifications(newNotifications, state.maxNotifications);
      const sorted = sortNotifications(limited);
      return {
        ...state,
        notifications: sorted,
        unreadCount: sorted.filter(n => !n.isRead).length,
        groups: groupNotifications(sorted)
      };
    }

    case 'REMOVE_NOTIFICATION': {
      const filtered = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filtered,
        unreadCount: filtered.filter(n => !n.isRead).length,
        groups: groupNotifications(filtered)
      };
    }

    case 'MARK_AS_READ': {
      const updated = state.notifications.map(n =>
        n.id === action.payload ? { ...n, isRead: true } : n
      );
      return {
        ...state,
        notifications: updated,
        unreadCount: updated.filter(n => !n.isRead).length,
        groups: groupNotifications(updated)
      };
    }

    case 'MARK_ALL_AS_READ': {
      const updated = state.notifications.map(n => ({ ...n, isRead: true }));
      return {
        ...state,
        notifications: updated,
        unreadCount: 0,
        groups: groupNotifications(updated)
      };
    }

    case 'CLEAR_ALL': {
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
        groups: []
      };
    }

    case 'SET_NOTIFICATIONS': {
      const sorted = sortNotifications(action.payload);
      return {
        ...state,
        notifications: sorted,
        unreadCount: sorted.filter(n => !n.isRead).length,
        groups: groupNotifications(sorted)
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload
      };
    }

    default:
      return state;
  }
}

// Context
interface NotificationContextValue {
  state: NotificationState;
  settings: NotificationSettings;
  addNotification: (subType: NotificationSubType, data?: Record<string, any>, overrides?: Partial<Notification>) => void;
  addCustomNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const [settings, setSettings] = React.useState<NotificationSettings>(defaultSettings);
  const autoDismissTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load notifications from IndexedDB
  const loadNotifications = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const stored = await logisticsDB.notifications.toArray();
      const notifications = stored.map(n => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notifications' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Save notifications to IndexedDB
  const saveNotifications = useCallback(async () => {
    try {
      await logisticsDB.notifications.clear();
      await logisticsDB.notifications.bulkAdd(state.notifications);
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [state.notifications]);

  // Load settings from IndexedDB
  const loadSettings = async () => {
    try {
      const stored = await logisticsDB.notificationSettings.toArray();
      if (stored.length > 0) {
        setSettings(stored[0]);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  // Save settings to IndexedDB
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      await logisticsDB.notificationSettings.clear();
      await logisticsDB.notificationSettings.add(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }, []);

  // Cleanup old notifications
  const cleanupNotifications = useCallback(() => {
    const cleaned = cleanOldNotifications(state.notifications, settings.retentionDays);
    if (cleaned.length < state.notifications.length) {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: cleaned });
    }
  }, [state.notifications, settings.retentionDays]);

  // Add notification
  const addNotification = useCallback((
    subType: NotificationSubType, 
    data: Record<string, any> = {},
    overrides: Partial<Notification> = {}
  ) => {
    if (!settings.enabled) return;

    const notification = createNotification(subType, data, overrides);
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-dismiss if enabled
    if (notification.isAutoDismiss && notification.autoDismissAfter) {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
        autoDismissTimers.current.delete(notification.id);
      }, notification.autoDismissAfter);
      
      autoDismissTimers.current.set(notification.id, timer);
    }

    // Play sound if enabled
    if (settings.enableSound && notification.priority !== 'info') {
      // Play notification sound (implement audio playing logic)
    }

    // Show desktop notification if enabled
    if (settings.enableDesktopNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/bp-logo.png'
        });
      }
    }
  }, [settings]);

  // Add custom notification
  const addCustomNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (!settings.enabled) return;

    const fullNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date()
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  }, [settings]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    
    // Clear any auto-dismiss timer
    const timer = autoDismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimers.current.delete(id);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    // Clear all timers
    autoDismissTimers.current.forEach(timer => clearTimeout(timer));
    autoDismissTimers.current.clear();
    
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated).catch(console.error);
    
    // Update max notifications if changed
    if (newSettings.maxNotifications !== undefined) {
      const limited = limitNotifications(state.notifications, newSettings.maxNotifications);
      if (limited.length < state.notifications.length) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: limited });
      }
    }
  }, [settings, state.notifications, saveSettings]);

  // Load notifications from IndexedDB on mount
  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  // Save notifications to IndexedDB when they change
  useEffect(() => {
    if (!state.isLoading) {
      saveNotifications();
    }
  }, [state.notifications, state.isLoading, saveNotifications]);

  // Clean old notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupNotifications();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [settings.retentionDays, cleanupNotifications]);

  const value: NotificationContextValue = {
    state,
    settings,
    addNotification,
    addCustomNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};