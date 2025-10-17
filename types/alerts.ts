export interface WaterLevelThreshold {
  siteId: string;
  siteName: string;
  warningLevel: number;
  dangerLevel: number;
  criticalLevel: number;
}

export interface AlertConfig {
  enableSMS: boolean;
  enableEmail: boolean;
  enablePushNotifications: boolean;
  recipients: {
    sms: string[];
    email: string[];
    pushTokens: string[];
  };
}

export type AlertSeverity = 'warning' | 'danger' | 'critical';

export interface Alert {
  id: string;
  siteId: string;
  siteName: string;
  waterLevel: number;
  threshold: number;
  severity: AlertSeverity;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  weatherConditions: string;
}

export interface NotificationMessage {
  title: string;
  body: string;
  data: Alert;
}