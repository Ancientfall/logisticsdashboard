// src/components/notifications/NotificationPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, BellOff, Search, Clock, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import type { 
  Notification, 
  NotificationType, 
  NotificationPriority
} from '../../types/notification';
import { getNotificationColorClasses, filterNotifications } from '../../utils/notificationHelpers';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { state, settings, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter notifications
  const filteredNotifications = filterNotifications(state.notifications, {
    types: filterType === 'all' ? undefined : [filterType],
    priorities: filterPriority === 'all' ? undefined : [filterPriority],
    isRead: activeTab === 'unread' ? false : undefined,
    searchTerm
  });

  // Group notifications
  const groupedNotifications = state.groups.map(group => ({
    ...group,
    notifications: filterNotifications(group.notifications, {
      types: filterType === 'all' ? undefined : [filterType],
      priorities: filterPriority === 'all' ? undefined : [filterPriority],
      isRead: activeTab === 'unread' ? false : undefined,
      searchTerm
    })
  })).filter(group => group.notifications.length > 0);

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'error':
        return <XCircle size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'info':
      default:
        return <Info size={16} />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const renderNotification = (notification: Notification) => {
    const colors = getNotificationColorClasses(notification.priority);

    return (
      <div
        key={notification.id}
        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          !notification.isRead ? 'bg-blue-50/30' : ''
        }`}
        onClick={() => !notification.isRead && markAsRead(notification.id)}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${colors.icon}`}>
            {getPriorityIcon(notification.priority)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`text-sm font-medium ${colors.text} ${
                !notification.isRead ? 'font-semibold' : ''
              }`}>
                {notification.title}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} />
                {formatTimestamp(notification.timestamp)}
              </span>
              {notification.subType && (
                <span className="text-xs text-gray-500">
                  {notification.subType.replace(/-/g, ' ')}
                </span>
              )}
            </div>
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map(action => (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.action();
                    }}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      action.style === 'primary'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : action.style === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md">
        <div
          ref={panelRef}
          className="h-full bg-white shadow-xl flex flex-col transform transition-transform duration-300"
          style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {state.unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {state.unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={markAllAsRead}
                disabled={state.unreadCount === 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Mark all as read
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={clearAll}
                disabled={state.notifications.length === 0}
                className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-gray-200 space-y-3">
            {/* Tabs */}
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'all' 
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'unread'
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Unread ({state.unreadCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-10 pr-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-400 bg-white transition-colors"
              />
            </div>

            {/* Filter dropdowns */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
                className="flex-1 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-400 transition-colors"
              >
                <option value="all">All Types</option>
                <option value="data-quality">Data Quality</option>
                <option value="processing-update">Processing</option>
                <option value="threshold-alert">Alerts</option>
                <option value="system">System</option>
                <option value="operational-insight">Insights</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as NotificationPriority | 'all')}
                className="flex-1 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-400 transition-colors"
              >
                <option value="all">All Priorities</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <BellOff size={48} className="mb-3 text-gray-300" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm ? 'Try adjusting your search' : 'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              <div>
                {/* Grouped view */}
                {groupedNotifications.map(group => (
                  <div key={group.id}>
                    <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {group.title}
                      </h3>
                    </div>
                    {group.notifications.map(notification => renderNotification(notification))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              {settings.enabled ? (
                <span>Notifications are enabled</span>
              ) : (
                <span className="flex items-center justify-center gap-1 text-orange-600">
                  <AlertTriangle size={12} />
                  Notifications are disabled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;