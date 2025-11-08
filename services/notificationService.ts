import { Alert, NotificationMessage } from '../types/alerts';
import * as admin from 'firebase-admin';
const twilio: any = require('twilio');
import * as nodemailer from 'nodemailer';

class NotificationService {
  private static instance: NotificationService;
  private firebaseAdmin: typeof admin;
  private twilioClient: any;
  private emailTransporter: nodemailer.Transporter;

  private constructor() {
    // Initialize Firebase Admin
    const firebaseOptions: admin.AppOptions = {
      credential: admin.credential.applicationDefault(),
      ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {})
    };
    admin.initializeApp(firebaseOptions);
    this.firebaseAdmin = admin;

    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Initialize Nodemailer
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private createNotificationMessage(alert: Alert): NotificationMessage {
    const severityEmoji = {
      warning: '⚠️',
      danger: '🚨',
      critical: '🆘'
    };

    const message: NotificationMessage = {
      title: `${severityEmoji[alert.severity]} Flood Alert - ${alert.siteName}`,
      body: `Current water level: ${alert.waterLevel}m\n` +
            `Threshold: ${alert.threshold}m\n` +
            `Weather: ${alert.weatherConditions}\n` +
            `Time: ${alert.timestamp.toLocaleString()}`,
      data: alert
    };

    return message;
  }

  public async sendPushNotification(recipients: string[], alert: Alert): Promise<void> {
    const message = this.createNotificationMessage(alert);

    const notifications = recipients.map(token => 
      this.firebaseAdmin.messaging().send({
        token,
        notification: {
          title: message.title,
          body: message.body
        },
        data: {
          alertId: alert.id,
          siteId: alert.siteId,
          severity: alert.severity,
          timestamp: alert.timestamp.toISOString()
        }
      })
    );

    try {
      await Promise.all(notifications);
      console.log(`Successfully sent push notifications for alert ${alert.id}`);
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw error;
    }
  }

  public async sendSMS(phoneNumbers: string[], alert: Alert): Promise<void> {
    const message = this.createNotificationMessage(alert);
    const smsText = `${message.title}\n${message.body}`;

    const notifications = phoneNumbers.map(phoneNumber =>
      this.twilioClient.messages.create({
        body: smsText,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })
    );

    try {
      await Promise.all(notifications);
      console.log(`Successfully sent SMS notifications for alert ${alert.id}`);
    } catch (error) {
      console.error('Error sending SMS notifications:', error);
      throw error;
    }
  }

  public async sendEmail(emailAddresses: string[], alert: Alert): Promise<void> {
    const message = this.createNotificationMessage(alert);

    const mailOptions = {
      from: process.env.SMTP_FROM_ADDRESS,
      subject: message.title,
      html: `
        <h1>${message.title}</h1>
        <p><strong>Water Level:</strong> ${alert.waterLevel}m</p>
        <p><strong>Threshold:</strong> ${alert.threshold}m</p>
        <p><strong>Weather:</strong> ${alert.weatherConditions}</p>
        <p><strong>Location:</strong> ${alert.location.latitude}, ${alert.location.longitude}</p>
        <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
        <p>Please take necessary precautions and follow local emergency guidelines.</p>
      `
    };

    const notifications = emailAddresses.map(email =>
      this.emailTransporter.sendMail({
        ...mailOptions,
        to: email
      })
    );

    try {
      await Promise.all(notifications);
      console.log(`Successfully sent email notifications for alert ${alert.id}`);
    } catch (error) {
      console.error('Error sending email notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;