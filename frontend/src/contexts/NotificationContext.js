// 🔔 NOTIFICATION CONTEXT - ENTERPRISE EDITION
// Professional notification state management with real-time capabilities

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({
    // 📊 Data
    notifications: [],
    unreadCount: 0,
    recentNotifications: [],
    stats: {},

    // 🔧 UI State
    loading: false,
    error: null,
    
    // 📄 Pagination
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      hasNext: false,
      hasPrev: false
    },

    // 🔍 Filters
    filters: {
      type: null,
      category: null,
      isRead: null,
      priority: null,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    },

    // 📋 Meta Data
    categories: [],
    types: [],
    priorities: []
  });

  // 🔄 Real-time updates control
  const intervalRef = useRef(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const REFRESH_INTERVAL = 30000; // 30 seconds

  // 🚀 Initialize notification system
  useEffect(() => {
    if (user?.id) {
      initializeNotifications();
      notificationService.initializeSocket(user.id);
      
      // Start auto-refresh
      if (autoRefresh) {
        startAutoRefresh();
      }
    }

    return () => {
      stopAutoRefresh();
      notificationService.cleanup();
    };
  }, [user, autoRefresh, initializeNotifications, startAutoRefresh, stopAutoRefresh]);

  // 🔄 Auto-refresh management
  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      refreshUnreadCount();
    }, REFRESH_INTERVAL);
  }, [refreshUnreadCount]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 🏗️ Initialize notifications
  const initializeNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load meta data in parallel
      const [categoriesRes, typesRes, prioritiesRes, unreadCountRes] = await Promise.all([
        notificationService.getCategories(),
        notificationService.getTypes(),
        notificationService.getPriorities(),
        notificationService.getUnreadCount()
      ]);

      setState(prev => ({
        ...prev,
        categories: categoriesRes.success ? categoriesRes.categories : [],
        types: typesRes.success ? typesRes.types : [],
        priorities: prioritiesRes.success ? prioritiesRes.priorities : [],
        unreadCount: unreadCountRes.success ? unreadCountRes.count : 0,
        loading: false
      }));

    } catch (error) {
      console.error('❌ Bildirim sistemi başlatma hatası:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Bildirim sistemi başlatılamadı'
      }));
    }
  }, []);

  // 📊 Load notifications with filters
  const loadNotifications = useCallback(async (options = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = {
        ...state.filters,
        ...options
      };

      const result = await notificationService.getNotifications(params);

      if (result.success) {
        setState(prev => ({
          ...prev,
          notifications: result.notifications,
          pagination: result.pagination,
          filters: { ...prev.filters, ...result.filters },
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.message
        }));
      }

    } catch (error) {
      console.error('❌ Bildirimler yükleme hatası:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Bildirimler yüklenemedi'
      }));
    }
  }, [state.filters]);

  // 🔔 Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await notificationService.getUnreadCount();
      if (result.success) {
        setState(prev => ({
          ...prev,
          unreadCount: result.count
        }));
      }
    } catch (error) {
      console.error('❌ Okunmamış sayı yenileme hatası:', error);
    }
  }, []);

  // 🔄 Load recent notifications (for header dropdown)
  const loadRecentNotifications = useCallback(async (limit = 5) => {
    try {
      const result = await notificationService.getRecentNotifications(limit);
      if (result.success) {
        setState(prev => ({
          ...prev,
          recentNotifications: result.notifications
        }));
      }
    } catch (error) {
      console.error('❌ Son bildirimler yükleme hatası:', error);
    }
  }, []);

  // 📈 Load notification stats
  const loadStats = useCallback(async () => {
    try {
      const result = await notificationService.getStats();
      if (result.success) {
        setState(prev => ({
          ...prev,
          stats: result.stats
        }));
      }
    } catch (error) {
      console.error('❌ İstatistik yükleme hatası:', error);
    }
  }, []);

  // ✅ Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
          ),
          recentNotifications: prev.recentNotifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));

        return { success: true, message: result.message };
      }

      return { success: false, message: result.message };

    } catch (error) {
      console.error('❌ Okundu işaretleme hatası:', error);
      return { success: false, message: 'İşaretleme başarısız' };
    }
  }, []);

  // ✅ Mark all notifications as read
  const markAllAsRead = useCallback(async (filters = {}) => {
    try {
      const result = await notificationService.markAllAsRead(filters);
      
      if (result.success) {
        // Refresh data
        await Promise.all([
          loadNotifications(),
          refreshUnreadCount(),
          loadRecentNotifications()
        ]);

        return { success: true, message: result.message };
      }

      return { success: false, message: result.message };

    } catch (error) {
      console.error('❌ Toplu okundu işaretleme hatası:', error);
      return { success: false, message: 'Toplu işaretleme başarısız' };
    }
  }, [loadNotifications, refreshUnreadCount, loadRecentNotifications]);

  // 🗑️ Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const result = await notificationService.deleteNotification(notificationId);
      
      if (result.success) {
        // Remove from local state
        setState(prev => {
          const notification = prev.notifications.find(n => n.id === notificationId);
          const wasUnread = notification && !notification.isRead;

          return {
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== notificationId),
            recentNotifications: prev.recentNotifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount
          };
        });

        return { success: true, message: result.message };
      }

      return { success: false, message: result.message };

    } catch (error) {
      console.error('❌ Silme hatası:', error);
      return { success: false, message: 'Silme başarısız' };
    }
  }, []);

  // 🗑️ Bulk delete notifications
  const bulkDelete = useCallback(async (options = {}) => {
    try {
      const result = await notificationService.bulkDelete(options);
      
      if (result.success) {
        // Refresh all data
        await Promise.all([
          loadNotifications(),
          refreshUnreadCount(),
          loadRecentNotifications()
        ]);

        return { success: true, message: result.message };
      }

      return { success: false, message: result.message };

    } catch (error) {
      console.error('❌ Toplu silme hatası:', error);
      return { success: false, message: 'Toplu silme başarısız' };
    }
  }, [loadNotifications, refreshUnreadCount, loadRecentNotifications]);

  // 🔍 Update filters
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  // 🔄 Reset filters
  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {
        type: null,
        category: null,
        isRead: null,
        priority: null,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    }));
  }, []);

  // 🔄 Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadNotifications(),
      refreshUnreadCount(),
      loadRecentNotifications(),
      loadStats()
    ]);
  }, [loadNotifications, refreshUnreadCount, loadRecentNotifications, loadStats]);

  // 🎯 Context value
  const contextValue = {
    // Data
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    recentNotifications: state.recentNotifications,
    stats: state.stats,

    // UI State
    loading: state.loading,
    error: state.error,

    // Pagination
    pagination: state.pagination,

    // Filters
    filters: state.filters,

    // Meta Data
    categories: state.categories,
    types: state.types,
    priorities: state.priorities,

    // Actions
    loadNotifications,
    loadRecentNotifications,
    loadStats,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDelete,
    updateFilters,
    resetFilters,
    refreshAll,

    // Settings
    autoRefresh,
    setAutoRefresh: (enabled) => {
      setAutoRefresh(enabled);
      if (enabled) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    },

    // Helpers
    getTypeColor: notificationService.getTypeColor,
    getTypeIcon: notificationService.getTypeIcon,
    getPriorityColor: notificationService.getPriorityColor,
    formatRelativeTime: notificationService.formatRelativeTime
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 