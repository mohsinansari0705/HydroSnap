import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import floodAlertsService, { FloodAlert } from '../services/floodAlertsService';
import notificationService from '../services/notificationService';

interface UseNotificationsReturn {
  alerts: FloodAlert[];
  unreadCount: number;
  isLoading: boolean;
  refreshAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearBadge: () => Promise<void>;
}

/**
 * Hook to manage notifications and flood alerts
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  // Load alerts
  const loadAlerts = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const fetchedAlerts = await floodAlertsService.getUserAlerts(userId);
      setAlerts(fetchedAlerts);

      const count = await floodAlertsService.getUnreadCount(userId);
      setUnreadCount(count);
      
      // Update badge count
      await notificationService.setBadgeCount(count);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (userId) {
      loadAlerts();
    }
  }, [userId]);

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = floodAlertsService.subscribeToAlerts(userId, async (newAlert) => {
      console.log('📬 New alert received:', newAlert);
      
      // Add to alerts list
      setAlerts((prev) => [newAlert, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Update badge
      await notificationService.setBadgeCount(unreadCount + 1);
      
      // Send local notification if not already notified
      if (!newAlert.is_notified) {
        await notificationService.sendLocalNotification(newAlert);
        await floodAlertsService.markAsNotified(newAlert.id);
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId, unreadCount]);

  // Set up notification listeners
  useEffect(() => {
    const cleanup = notificationService.setupNotificationListeners(
      (notification) => {
        console.log('📨 Notification received:', notification);
        // Handle received notification (when app is in foreground)
      },
      async (response) => {
        console.log('👆 Notification tapped:', response);
        // Handle notification tap
        const data = response.notification.request.content.data;
        
        if (data.alertId) {
          // Mark alert as read when user taps notification
          await floodAlertsService.markAsRead(data.alertId as string);
          await loadAlerts();
        }
      }
    );

    return cleanup;
  }, []);

  // Refresh alerts
  const refreshAlerts = async () => {
    await loadAlerts();
  };

  // Mark single alert as read
  const markAsRead = async (alertId: string) => {
    const success = await floodAlertsService.markAsRead(alertId);
    if (success) {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationService.setBadgeCount(Math.max(0, unreadCount - 1));
    }
  };

  // Mark all alerts as read
  const markAllAsRead = async () => {
    if (!userId) return;

    const unreadAlertIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadAlertIds.length === 0) return;

    const success = await floodAlertsService.markMultipleAsRead(unreadAlertIds);
    if (success) {
      setAlerts((prev) =>
        prev.map((alert) => ({ ...alert, is_read: true }))
      );
      setUnreadCount(0);
      await notificationService.clearBadge();
    }
  };

  // Clear badge
  const clearBadge = async () => {
    await notificationService.clearBadge();
  };

  return {
    alerts,
    unreadCount,
    isLoading,
    refreshAlerts,
    markAsRead,
    markAllAsRead,
    clearBadge,
  };
};

/**
 * Hook to schedule daily missed reading checks
 */
export const useMissedReadingScheduler = (enabled: boolean = true) => {
  const [scheduledId, setScheduledId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const scheduleDailyCheck = async () => {
      try {
        // Schedule daily reminder at 6 PM
        const notificationId = await notificationService.scheduleDailyReminder(18, 0);
        setScheduledId(notificationId);
        console.log('✅ Daily reminder scheduled:', notificationId);
      } catch (error) {
        console.error('Error scheduling daily reminder:', error);
      }
    };

    scheduleDailyCheck();

    return () => {
      if (scheduledId) {
        notificationService.cancelNotification(scheduledId);
      }
    };
  }, [enabled]);

  return { scheduledId };
};

/**
 * Hook to check for missed readings and create alerts
 */
export const useMissedReadingChecker = () => {
  const checkMissedReadings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's assigned sites
      const { data: assignments } = await supabase
        .from('site_assignments')
        .select(`
          monitoring_site_id,
          monitoring_sites (
            id,
            name,
            location_name,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id);

      if (!assignments || assignments.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const assignment of assignments) {
        const siteData = assignment.monitoring_sites as any;
        if (!siteData || Array.isArray(siteData)) continue;
        
        const site = siteData as { id: string; name: string; location_name: string; latitude: number; longitude: number };

        // Check if user has submitted a reading today
        const { data: todayReadings } = await supabase
          .from('water_level_readings')
          .select('id, created_at')
          .eq('monitoring_site_id', site.id)
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString())
          .limit(1);

        // If no reading today, check for existing missed reading alert
        if (!todayReadings || todayReadings.length === 0) {
          const { data: existingAlert } = await supabase
            .from('flood_alerts')
            .select('id')
            .eq('monitoring_site_id', site.id)
            .eq('user_id', user.id)
            .eq('alert_type', 'missed_reading')
            .gte('created_at', today.toISOString())
            .limit(1);

          // Only create alert if one doesn't exist for today
          if (!existingAlert || existingAlert.length === 0) {
            // Get last reading date
            const { data: lastReading } = await supabase
              .from('water_level_readings')
              .select('created_at')
              .eq('monitoring_site_id', site.id)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const alert = await floodAlertsService.generateMissedReadingAlert({
              siteId: site.id,
              siteName: site.name,
              siteLocation: site.location_name || `${site.latitude}, ${site.longitude}`,
              userId: user.id,
              lastReadingDate: lastReading?.[0]?.created_at,
            });

            if (alert) {
              await notificationService.sendLocalNotification(alert);
              console.log('✅ Missed reading alert created for:', site.name);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking missed readings:', error);
    }
  };

  return { checkMissedReadings };
};
