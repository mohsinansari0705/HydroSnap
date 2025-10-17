import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Alert } from '../types/alerts';
import { Colors } from '../lib/colors';

interface NotificationPanelProps {
  notifications: Alert[];
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose }) => {
  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return Colors.criticalRed;
      case 'danger':
        return Colors.dangerOrange;
      case 'warning':
        return Colors.warningYellow;
      default:
        return Colors.textSecondary;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flood Alerts</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close notifications">
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.notificationList}>
        {notifications.length === 0 ? (
          <Text style={styles.noAlertsText}>No active alerts</Text>
        ) : (
          notifications.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertItem,
                { borderLeftColor: getSeverityColor(alert.severity) }
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.siteName}>{alert.siteName}</Text>
                <Text style={[styles.severity, { color: getSeverityColor(alert.severity) }]}>
                  {alert.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.waterLevel}>
                Water Level: {alert.waterLevel}m (Threshold: {alert.threshold}m)
              </Text>
              <Text style={styles.weather}>{alert.weatherConditions}</Text>
              <Text style={styles.timestamp}>{formatDate(alert.timestamp)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 300,
    maxHeight: 400,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: Colors.softLightGrey,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  notificationList: {
    maxHeight: 340,
  },
  alertItem: {
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: Colors.white,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  severity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  waterLevel: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  weather: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  noAlertsText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});

export default NotificationPanel;