import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../lib/colors';
import { useNotifications } from '../hooks/useNotifications';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import { Ionicons } from '@expo/vector-icons';

interface NotificationsScreenProps {
  onBack: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const {
    alerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Handle Android back button
  useSimpleBackHandler(onBack);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return Colors.alertRed;
      case 'high':
        return '#FF6B35';
      case 'medium':
        return '#FFB627';
      case 'low':
        return '#4ECDC4';
      default:
        return Colors.deepSecurityBlue;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'medium':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'danger':
        return 'DANGER';
      case 'warning':
        return 'WARNING';
      case 'missed_reading':
        return 'MISSED READING';
      case 'prepared':
        return 'PREPAREDNESS';
      case 'normal':
        return 'NORMAL';
      default:
        return type.toUpperCase();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleNotificationPress = async (alertId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(alertId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.deepSecurityBlue} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.deepSecurityBlue} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-off-outline"
            size={80}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! We'll notify you when there are important updates.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unread Count Badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBanner}>
              <Text style={styles.unreadBannerText}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Notification List */}
          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.notificationCard,
                !alert.is_read && styles.unreadCard,
              ]}
              onPress={() => handleNotificationPress(alert.id, alert.is_read)}
              activeOpacity={0.7}
            >
              {/* Unread Indicator */}
              {!alert.is_read && <View style={styles.unreadDot} />}

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getSeverityColor(alert.severity) + '15' },
                ]}
              >
                <Ionicons
                  name={getSeverityIcon(alert.severity) as any}
                  size={24}
                  color={getSeverityColor(alert.severity)}
                />
              </View>

              {/* Content */}
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View
                    style={[
                      styles.alertTypeBadge,
                      { backgroundColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <Text style={styles.alertTypeText}>
                      {getAlertTypeLabel(alert.alert_type)}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(alert.created_at)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.notificationMessage,
                    !alert.is_read && styles.unreadMessage,
                  ]}
                  numberOfLines={3}
                >
                  {alert.message}
                </Text>

                {/* Site Info */}
                {alert.site_name && (
                  <View style={styles.siteInfo}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.siteText} numberOfLines={1}>
                      {alert.site_name}
                      {alert.site_location && ` • ${alert.site_location}`}
                    </Text>
                  </View>
                )}

                {/* Water Level Info */}
                {alert.water_level !== null && alert.water_level !== undefined && (
                  <View style={styles.waterLevelInfo}>
                    <Text style={styles.waterLevelLabel}>Water Level:</Text>
                    <Text
                      style={[
                        styles.waterLevelValue,
                        { color: getSeverityColor(alert.severity) },
                      ]}
                    >
                      {alert.water_level.toFixed(2)} m
                    </Text>
                    {alert.threshold_level !== null && alert.threshold_level !== undefined && (
                      <Text style={styles.thresholdText}>
                        (Threshold: {alert.threshold_level.toFixed(2)} m)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.softLightGrey,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.deepSecurityBlue + '10',
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  unreadBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.deepSecurityBlue + '10',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.deepSecurityBlue,
  },
  unreadBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.deepSecurityBlue,
    backgroundColor: Colors.white,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.deepSecurityBlue,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alertTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.deepSecurityBlue,
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  siteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  waterLevelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  waterLevelLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  waterLevelValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  thresholdText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 24,
  },
});
