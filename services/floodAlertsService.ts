import { supabase } from '../lib/supabase';

export interface FloodAlert {
  id: string;
  monitoring_site_id: string;
  reading_id?: string;
  alert_type: 'danger' | 'warning' | 'missed_reading' | 'normal' | 'prepared';
  water_level?: number;
  threshold_level?: number;
  site_name: string;
  site_location?: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_read: boolean;
  is_notified: boolean;
  user_id: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface CreateAlertParams {
  monitoring_site_id: string;
  reading_id?: string;
  alert_type: FloodAlert['alert_type'];
  water_level?: number;
  threshold_level?: number;
  site_name: string;
  site_location?: string;
  message: string;
  severity: FloodAlert['severity'];
  user_id: string;
  metadata?: any;
  expires_at?: string;
}

class FloodAlertsService {
  /**
   * Create a new flood alert
   */
  async createAlert(params: CreateAlertParams): Promise<FloodAlert | null> {
    try {
      const { data, error } = await supabase
        .from('flood_alerts')
        .insert({
          ...params,
          is_read: false,
          is_notified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  /**
   * Get all alerts for a user
   */
  async getUserAlerts(userId: string, unreadOnly: boolean = false): Promise<FloodAlert[]> {
    try {
      let query = supabase
        .from('flood_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      return [];
    }
  }

  /**
   * Get alerts by severity
   */
  async getAlertsBySeverity(
    userId: string,
    severity: FloodAlert['severity']
  ): Promise<FloodAlert[]> {
    try {
      const { data, error } = await supabase
        .from('flood_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('severity', severity)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching alerts by severity:', error);
      return [];
    }
  }

  /**
   * Get alerts for a specific site
   */
  async getSiteAlerts(siteId: string, userId: string): Promise<FloodAlert[]> {
    try {
      const { data, error } = await supabase
        .from('flood_alerts')
        .select('*')
        .eq('monitoring_site_id', siteId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching site alerts:', error);
      return [];
    }
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flood_alerts')
        .update({
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }

  /**
   * Mark multiple alerts as read
   */
  async markMultipleAsRead(alertIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flood_alerts')
        .update({
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', alertIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking alerts as read:', error);
      return false;
    }
  }

  /**
   * Mark alert as notified
   */
  async markAsNotified(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('flood_alerts')
        .update({
          is_notified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking alert as notified:', error);
      return false;
    }
  }

  /**
   * Get unread alerts count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('flood_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Delete old alerts (cleanup)
   */
  async deleteExpiredAlerts(): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('flood_alerts')
        .delete()
        .lt('expires_at', now);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting expired alerts:', error);
      return false;
    }
  }

  /**
   * Generate alert for water level reading
   */
  async generateWaterLevelAlert(params: {
    siteId: string;
    siteName: string;
    siteLocation: string;
    readingId: string;
    waterLevel: number;
    dangerLevel: number;
    warningLevel: number;
    userId: string;
    latitude?: number;
    longitude?: number;
  }): Promise<FloodAlert | null> {
    const {
      siteId,
      siteName,
      siteLocation,
      readingId,
      waterLevel,
      dangerLevel,
      warningLevel,
      userId,
      latitude,
      longitude,
    } = params;

    let alertType: FloodAlert['alert_type'] = 'normal';
    let severity: FloodAlert['severity'] = 'low';
    let message = '';
    let thresholdLevel = 0;

    // Determine alert type and severity
    if (waterLevel >= dangerLevel) {
      alertType = 'danger';
      severity = 'critical';
      thresholdLevel = dangerLevel;
      message = `🚨 CRITICAL ALERT: Water level at ${siteName} has reached DANGER level!\n\n` +
        `Current Level: ${waterLevel.toFixed(2)}m\n` +
        `Danger Threshold: ${dangerLevel.toFixed(2)}m\n` +
        `Location: ${siteLocation}\n\n` +
        `⚠️ IMMEDIATE ACTION REQUIRED: Evacuate if necessary and follow emergency protocols.`;
    } else if (waterLevel >= warningLevel) {
      alertType = 'warning';
      severity = 'high';
      thresholdLevel = warningLevel;
      message = `⚠️ WARNING: Water level at ${siteName} has reached WARNING level.\n\n` +
        `Current Level: ${waterLevel.toFixed(2)}m\n` +
        `Warning Threshold: ${warningLevel.toFixed(2)}m\n` +
        `Danger Level: ${dangerLevel.toFixed(2)}m\n` +
        `Location: ${siteLocation}\n\n` +
        `📋 Stay alert and monitor the situation closely.`;
    } else if (waterLevel >= warningLevel * 0.9) {
      // Preparedness alert when approaching warning level
      alertType = 'prepared';
      severity = 'medium';
      thresholdLevel = warningLevel;
      message = `📢 PREPARE: Water level at ${siteName} is approaching warning level.\n\n` +
        `Current Level: ${waterLevel.toFixed(2)}m\n` +
        `Warning Threshold: ${warningLevel.toFixed(2)}m\n` +
        `Location: ${siteLocation}\n\n` +
        `🔔 Be prepared and keep monitoring updates.`;
    } else {
      // Normal level - only create if requested or for records
      return null; // Don't create alert for normal levels
    }

    // Set expiry time (alerts expire after 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return await this.createAlert({
      monitoring_site_id: siteId,
      reading_id: readingId,
      alert_type: alertType,
      water_level: waterLevel,
      threshold_level: thresholdLevel,
      site_name: siteName,
      site_location: siteLocation,
      message,
      severity,
      user_id: userId,
      metadata: {
        danger_level: dangerLevel,
        warning_level: warningLevel,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      },
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Generate missed reading alert
   */
  async generateMissedReadingAlert(params: {
    siteId: string;
    siteName: string;
    siteLocation: string;
    userId: string;
    lastReadingDate?: string;
  }): Promise<FloodAlert | null> {
    const { siteId, siteName, siteLocation, userId, lastReadingDate } = params;

    const message = `📋 REMINDER: Missed water level reading for ${siteName}\n\n` +
      `Location: ${siteLocation}\n` +
      (lastReadingDate
        ? `Last Reading: ${new Date(lastReadingDate).toLocaleDateString()}\n`
        : '') +
      `\n⏰ Please submit today's water level reading as soon as possible.`;

    // Set expiry time (missed reading alerts expire after 12 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    return await this.createAlert({
      monitoring_site_id: siteId,
      alert_type: 'missed_reading',
      site_name: siteName,
      site_location: siteLocation,
      message,
      severity: 'medium',
      user_id: userId,
      metadata: {
        last_reading_date: lastReadingDate,
        reminder_date: new Date().toISOString(),
      },
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Subscribe to real-time alert updates
   */
  subscribeToAlerts(
    userId: string,
    callback: (alert: FloodAlert) => void
  ): (() => void) {
    const subscription = supabase
      .channel('flood_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flood_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as FloodAlert);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }
}

export default new FloodAlertsService();
