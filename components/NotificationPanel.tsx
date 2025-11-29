import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { useNotifications } from '../hooks/useNotifications';
import { FloodAlert } from '../services/floodAlertsService';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead, refreshAlerts } = useNotifications();

  // Refresh alerts when panel opens
  useEffect(() => {
    refreshAlerts();
  }, []);

  const getSeverityColor = (severity: FloodAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return Colors.criticalRed;
      case 'high':
        return Colors.dangerOrange;
      case 'medium':
        return Colors.warningYellow;
      case 'low':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  const getAlertIcon = (alertType: FloodAlert['alert_type']) => {
    switch (alertType) {
      case 'danger':
        return 'warning';
      case 'warning':
        return 'alert-circle';
      case 'missed_reading':
        return 'clipboard';
      case 'prepared':
        return 'notifications';
      default:
        return 'information-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleAlertPress = async (alert: FloodAlert) => {
    if (!alert.is_read) {
      await markAsRead(alert.id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close notifications">
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.notificationList}>
          {alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={48} color={Colors.textSecondary} />
              <Text style={styles.noAlertsText}>No notifications</Text>
              <Text style={styles.noAlertsSubtext}>You're all caught up!</Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                onPress={() => handleAlertPress(alert)}
                style={[
                  styles.alertItem,
                  { borderLeftColor: getSeverityColor(alert.severity) },
                  !alert.is_read && styles.unreadAlert,
                ]}
              >
                <View style={styles.alertIconContainer}>
                  <Ionicons
                    name={getAlertIcon(alert.alert_type)}
                    size={24}
                    color={getSeverityColor(alert.severity)}
                  />
                </View>
                
                <View style={styles.alertContent}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.siteName, !alert.is_read && styles.unreadText]}>
                      {alert.site_name}
                    </Text>
                    <Text style={styles.timestamp}>{formatDate(alert.created_at)}</Text>
                  </View>

                  <View style={styles.severityContainer}>
                    <Text style={[styles.severity, { color: getSeverityColor(alert.severity) }]}>
                      {alert.severity.toUpperCase()}
                    </Text>
                    <Text style={styles.alertType}>• {alert.alert_type.replace('_', ' ')}</Text>
                  </View>

                  {alert.water_level && (
                    <Text style={styles.waterLevel}>
                      Water Level: {alert.water_level.toFixed(2)}m
                      {alert.threshold_level && ` (Threshold: ${alert.threshold_level.toFixed(2)}m)`}
                    </Text>
                  )}

                  <Text style={styles.message} numberOfLines={3}>
                    {alert.message}
                  </Text>

                  {alert.site_location && (
                    <Text style={styles.location}>
                      📍 {alert.site_location}
                    </Text>
                  )}
                </View>

                {!alert.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 380,
    maxHeight: 550,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 30,
    zIndex: 3000,
    pointerEvents: 'auto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.dangerOrange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.softLightGrey,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    backgroundColor: Colors.softLightGrey,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationList: {
    maxHeight: 480,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAlertsText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  noAlertsSubtext: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 14,
    borderLeftWidth: 4,
    backgroundColor: Colors.white,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadAlert: {
    backgroundColor: '#F0F8FF',
  },
  alertIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  severity: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  alertType: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  waterLevel: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 6,
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});

export default NotificationPanel;