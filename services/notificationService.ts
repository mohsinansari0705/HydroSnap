import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FloodAlert } from './floodAlertsService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notifications and request permissions
   */
  private async initializeNotifications() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('flood-alerts', {
          name: 'Flood Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('water-level-warnings', {
          name: 'Water Level Warnings',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA500',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reading Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      await this.registerForPushNotifications();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      // Check notification permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        console.log('Notification permission not granted. User should grant it during onboarding.');
        return null;
      }

      // Get projectId from expo config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.warn('No projectId found. Push notifications will work locally but may not work for remote notifications.');
        // Still allow local notifications to work
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      console.log('Push token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Send local notification for flood alert
   */
  async sendLocalNotification(alert: FloodAlert): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: this.getNotificationTitle(alert),
          body: alert.message,
          data: {
            alertId: alert.id,
            siteId: alert.monitoring_site_id,
            alertType: alert.alert_type,
            severity: alert.severity,
          },
          sound: true,
          priority: alert.severity === 'critical' ? 
            Notifications.AndroidNotificationPriority.MAX : 
            Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Immediate notification
      });

      console.log('Local notification sent for alert:', alert.id);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Get notification title based on alert
   */
  private getNotificationTitle(alert: FloodAlert): string {
    const emoji = {
      danger: '🚨',
      warning: '⚠️',
      missed_reading: '📋',
      prepared: '📢',
      normal: 'ℹ️',
    };

    const prefix = emoji[alert.alert_type] || 'ℹ️';
    
    switch (alert.alert_type) {
      case 'danger':
        return `${prefix} CRITICAL: ${alert.site_name}`;
      case 'warning':
        return `${prefix} WARNING: ${alert.site_name}`;
      case 'missed_reading':
        return `${prefix} Reading Reminder`;
      case 'prepared':
        return `${prefix} PREPARE: ${alert.site_name}`;
      default:
        return `${prefix} ${alert.site_name}`;
    }
  }

  /**
   * Schedule daily reminder for missed readings
   * Note: Uses 24-hour interval instead of specific time due to Expo API limitations
   */
  async scheduleDailyReminder(_hour: number = 18, _minute: number = 0): Promise<string> {
    try {
      // Schedule notification to repeat every 24 hours
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Daily Reading Reminder',
          body: 'Have you submitted your water level readings today?',
          data: { type: 'daily_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 86400, // 24 hours
          repeats: true,
        },
      });

      console.log('Daily reminder scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

    // Listen for notification interactions
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    // Return cleanup function
    return () => {
      if (this.notificationListener) {
        this.notificationListener.remove();
      }
      if (this.responseListener) {
        this.responseListener.remove();
      }
    };
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Check notification permissions status
   */
  async getPermissionsStatus(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}

export default NotificationService.getInstance();