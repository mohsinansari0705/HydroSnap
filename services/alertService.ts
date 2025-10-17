import { createClient } from '@supabase/supabase-js';
import { Alert, AlertConfig, AlertSeverity, WaterLevelThreshold } from '../types/alerts';
import { v4 as uuidv4 } from 'uuid';

class AlertService {
  private static instance: AlertService;
  private thresholds: Map<string, WaterLevelThreshold>;
  private alertConfig: AlertConfig;
  private supabase;

  private constructor() {
    this.thresholds = new Map();
    this.alertConfig = {
      enableSMS: true,
      enableEmail: true,
      enablePushNotifications: true,
      recipients: {
        sms: [],
        email: [],
        pushTokens: []
      }
    };
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    this.initializeThresholds();
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  private async initializeThresholds() {
    // Load thresholds from database or configuration
    const { data: thresholds, error } = await this.supabase
      .from('monitoring_sites')
      .select('site_id, site_name, warning_level, danger_level, critical_level');

    if (error) {
      console.error('Error loading thresholds:', error);
      return;
    }

    thresholds.forEach((threshold) => {
      this.thresholds.set(threshold.site_id, {
        siteId: threshold.site_id,
        siteName: threshold.site_name,
        warningLevel: threshold.warning_level,
        dangerLevel: threshold.danger_level,
        criticalLevel: threshold.critical_level
      });
    });
  }

  public checkWaterLevel(
    siteId: string,
    siteName: string,
    waterLevel: number,
    latitude: number,
    longitude: number,
    weatherConditions: string
  ): Alert | null {
    const threshold = this.thresholds.get(siteId);
    if (!threshold) {
      console.error(`No threshold configured for site ${siteId}`);
      return null;
    }

    let severity: AlertSeverity | null = null;
    let thresholdValue: number = 0;

    if (waterLevel >= threshold.criticalLevel) {
      severity = 'critical';
      thresholdValue = threshold.criticalLevel;
    } else if (waterLevel >= threshold.dangerLevel) {
      severity = 'danger';
      thresholdValue = threshold.dangerLevel;
    } else if (waterLevel >= threshold.warningLevel) {
      severity = 'warning';
      thresholdValue = threshold.warningLevel;
    }

    if (severity) {
      const alert: Alert = {
        id: uuidv4(),
        siteId,
        siteName,
        waterLevel,
        threshold: thresholdValue,
        severity,
        timestamp: new Date(),
        location: { latitude, longitude },
        weatherConditions
      };
      return alert;
    }

    return null;
  }

  public async updateAlertConfig(config: Partial<AlertConfig>): Promise<void> {
    this.alertConfig = { ...this.alertConfig, ...config };
    // Persist configuration to database
    await this.supabase
      .from('alert_config')
      .upsert({
        config: this.alertConfig,
        updated_at: new Date().toISOString()
      });
  }

  public getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  public async saveAlert(alert: Alert): Promise<void> {
    // Save alert to database
    await this.supabase
      .from('alerts')
      .insert([{
        id: alert.id,
        site_id: alert.siteId,
        site_name: alert.siteName,
        water_level: alert.waterLevel,
        threshold: alert.threshold,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        latitude: alert.location.latitude,
        longitude: alert.location.longitude,
        weather_conditions: alert.weatherConditions
      }]);
  }
}

export default AlertService;