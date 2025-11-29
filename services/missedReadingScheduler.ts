import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';
import floodAlertsService from './floodAlertsService';
import notificationService from './notificationService';

const MISSED_READING_TASK = 'MISSED_READING_CHECK_TASK';

/**
 * Check for missed readings and create alerts
 */
async function checkAndCreateMissedReadingAlerts(userId: string): Promise<void> {
  try {
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
      .eq('user_id', userId);

    if (!assignments || assignments.length === 0) {
      console.log('No site assignments found');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    for (const assignment of assignments) {
      const siteData = assignment.monitoring_sites as any;
      if (!siteData || Array.isArray(siteData)) continue;
      
      const site = siteData as { id: string; name: string; location_name: string; latitude: number; longitude: number };

      // Check if user has submitted a reading today
      const { data: todayReadings, error: readingError } = await supabase
        .from('water_level_readings')
        .select('id, created_at')
        .eq('monitoring_site_id', site.id)
        .eq('user_id', userId)
        .gte('created_at', todayISO)
        .limit(1);

      if (readingError) {
        console.error('Error checking readings:', readingError);
        continue;
      }

      // If no reading today, check for existing alert
      if (!todayReadings || todayReadings.length === 0) {
        const { data: existingAlert, error: alertError } = await supabase
          .from('flood_alerts')
          .select('id')
          .eq('monitoring_site_id', site.id)
          .eq('user_id', userId)
          .eq('alert_type', 'missed_reading')
          .gte('created_at', todayISO)
          .limit(1);

        if (alertError) {
          console.error('Error checking alerts:', alertError);
          continue;
        }

        // Create alert if one doesn't exist
        if (!existingAlert || existingAlert.length === 0) {
          // Get last reading date
          const { data: lastReading } = await supabase
            .from('water_level_readings')
            .select('created_at')
            .eq('monitoring_site_id', site.id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

          const alert = await floodAlertsService.generateMissedReadingAlert({
            siteId: site.id,
            siteName: site.name,
            siteLocation: site.location_name || `${site.latitude}, ${site.longitude}`,
            userId: userId,
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
}

class MissedReadingScheduler {
  private isTaskDefined = false;

  /**
   * Ensure task is defined before registering
   */
  private async ensureTaskDefined(): Promise<void> {
    if (this.isTaskDefined) return;

    try {
      const isDefined = TaskManager.isTaskDefined(MISSED_READING_TASK);
      if (!isDefined) {
        TaskManager.defineTask(MISSED_READING_TASK, async () => {
          try {
            console.log('⏰ Background task: Checking for missed readings...');
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.log('No authenticated user');
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }

            await checkAndCreateMissedReadingAlerts(user.id);
            
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (error) {
            console.error('Error in background task:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }
      this.isTaskDefined = true;
    } catch (error) {
      console.warn('Could not define task:', error);
    }
  }

  /**
   * Register background task for missed reading checks
   */
  async registerBackgroundTask(): Promise<void> {
    try {
      // Ensure task is defined first
      await this.ensureTaskDefined();

      const isRegistered = await TaskManager.isTaskRegisteredAsync(MISSED_READING_TASK);
      
      if (isRegistered) {
        console.log('Background task already registered');
        return;
      }

      await BackgroundFetch.registerTaskAsync(MISSED_READING_TASK, {
        minimumInterval: 6 * 60 * 60, // Run every 6 hours
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('✅ Background task registered successfully');
    } catch (error) {
      console.error('Error registering background task:', error);
    }
  }

  /**
   * Unregister background task
   */
  async unregisterBackgroundTask(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(MISSED_READING_TASK);
      console.log('✅ Background task unregistered');
    } catch (error) {
      console.error('Error unregistering background task:', error);
    }
  }

  /**
   * Check background task status
   */
  async getStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      return status;
    } catch (error) {
      console.error('Error getting background fetch status:', error);
      return null;
    }
  }

  /**
   * Manually trigger missed reading check
   */
  async checkNow(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user');
        return;
      }

      await checkAndCreateMissedReadingAlerts(user.id);
      console.log('✅ Manual missed reading check completed');
    } catch (error) {
      console.error('Error in manual check:', error);
    }
  }
}

export default new MissedReadingScheduler();
