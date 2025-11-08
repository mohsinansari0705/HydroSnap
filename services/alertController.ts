import AlertService from './alertService';
import NotificationService from './notificationService';
import { Alert } from '../types/alerts';

class AlertController {
  private static instance: AlertController;
  private alertService: AlertService;
  private notificationService: NotificationService;

  private constructor() {
    this.alertService = AlertService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): AlertController {
    if (!AlertController.instance) {
      AlertController.instance = new AlertController();
    }
    return AlertController.instance;
  }

  public async processWaterLevelReading(
    siteId: string,
    siteName: string,
    waterLevel: number,
    latitude: number,
    longitude: number,
    weatherConditions: string
  ): Promise<void> {
    // Check if water level exceeds thresholds
    const alert = this.alertService.checkWaterLevel(
      siteId,
      siteName,
      waterLevel,
      latitude,
      longitude,
      weatherConditions
    );

    if (alert) {
      await this.handleAlert(alert);
    }
  }

  private async handleAlert(alert: Alert): Promise<void> {
    // Save alert to database
    await this.alertService.saveAlert(alert);

    // Get notification configuration
    const config = this.alertService.getAlertConfig();
    const notifications: Promise<void>[] = [];

    // Send notifications based on configuration
    if (config.enablePushNotifications && config.recipients.pushTokens.length > 0) {
      notifications.push(
        this.notificationService.sendPushNotification(config.recipients.pushTokens, alert)
      );
    }

    if (config.enableSMS && config.recipients.sms.length > 0) {
      notifications.push(
        this.notificationService.sendSMS(config.recipients.sms, alert)
      );
    }

    if (config.enableEmail && config.recipients.email.length > 0) {
      notifications.push(
        this.notificationService.sendEmail(config.recipients.email, alert)
      );
    }

    // Wait for all notifications to be sent
    try {
      await Promise.all(notifications);
      console.log(`Successfully processed alert ${alert.id}`);
    } catch (error) {
      console.error('Error processing alert:', error);
      throw error;
    }
  }

  // Example usage method for processing new water level readings
  public async processNewReading(reading: {
    site_id: string;
    site_name: string;
    water_level: number;
    latitude: number;
    longitude: number;
    weather_conditions: string;
  }): Promise<void> {
    await this.processWaterLevelReading(
      reading.site_id,
      reading.site_name,
      reading.water_level,
      reading.latitude,
      reading.longitude,
      reading.weather_conditions
    );
  }
}

export default AlertController;

// Example: Process a new water level reading (for demonstration)
// You can call this function from your app logic when a new reading is received
async function exampleProcessReading() {
  const alertController = AlertController.getInstance();
  await alertController.processNewReading({
    site_id: "CWC-GNG-001",
    site_name: "Old Railway Bridge Gauge",
    water_level: 685.50,
    latitude: 29.945872,
    longitude: 78.163981,
    weather_conditions: "Clear sky"
  });
}

// Uncomment to test
exampleProcessReading();