import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import SafeScreen from '../components/SafeScreen';
import { useNavigation } from '../lib/NavigationContext';
import { useBackHandler } from '../hooks/useBackHandler';
import floodAlertsService, { FloodAlert } from '../services/floodAlertsService';
import { Profile } from '../types/profile';

interface FloodAlertsScreenProps {
  profile: Profile | null;
}

const FloodAlertsScreen: React.FC<FloodAlertsScreenProps> = ({ profile }) => {
  const { navigateBack, navigateToAlertDetails } = useNavigation();
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);

  // Handle Android back button
  useBackHandler(() => {
    navigateBack();
    return true;
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!profile?.id) {
        setError('User not authenticated');
        return;
      }

      const fetchedAlerts = await floodAlertsService.getUserAlerts(profile.id);
      setAlerts(fetchedAlerts);
      console.log('✅ Fetched', fetchedAlerts.length, 'flood alerts');
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const handleAlertPress = (alert: FloodAlert) => {
    // Navigate to alert details screen
    navigateToAlertDetails(alert.id);
  };

  const getAlertIcon = (type: FloodAlert['alert_type']) => {
    switch (type) {
      case 'danger':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'prepared':
        return 'information-circle';
      case 'missed_reading':
        return 'time';
      default:
        return 'checkmark-circle';
    }
  };

  const getAlertColor = (type: FloodAlert['alert_type']) => {
    switch (type) {
      case 'danger':
        return Colors.criticalRed;
      case 'warning':
        return Colors.warningOrange;
      case 'prepared':
        return Colors.aquaTechBlue;
      case 'missed_reading':
        return Colors.warning;
      default:
        return Colors.successGreen;
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
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderAlertCard = (alert: FloodAlert) => {
    const alertColor = getAlertColor(alert.alert_type);
    const alertIcon = getAlertIcon(alert.alert_type);
    
    return (
      <TouchableOpacity
        key={alert.id}
        style={styles.modernCard}
        onPress={() => handleAlertPress(alert)}
        activeOpacity={0.7}
      >
        {!alert.is_read && <View style={styles.unreadBadge} />}
        
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: alertColor }]}>
            <Ionicons name={alertIcon as any} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.siteName} numberOfLines={1}>
              {alert.site_name}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.siteLocation} numberOfLines={1}>
                {alert.site_location || 'Location not specified'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.messageText} numberOfLines={2}>
          {alert.message}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.tagGroup}>
            {alert.water_level && (
              <View style={[styles.infoTag, { borderColor: alertColor + '40' }]}>
                <MaterialCommunityIcons name="waves" size={12} color={alertColor} />
                <Text style={[styles.tagLabel, { color: alertColor }]}>
                  {alert.water_level.toFixed(2)}m
                </Text>
              </View>
            )}
            <View style={[styles.infoTag, styles.filledTag, { backgroundColor: alertColor, borderColor: alertColor }]}>
              <Text style={styles.filledTagText}>
                {alert.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {formatDate(alert.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.alertRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            onPress={fetchAlerts} 
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alerts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons 
            name="checkmark-circle" 
            size={64} 
            color={Colors.textSecondary} 
            style={{ opacity: 0.5 }} 
          />
          <Text style={styles.emptyText}>No alerts yet</Text>
          <Text style={styles.emptySubtext}>
            Alerts will appear here when water levels change
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.alertsList}
        contentContainerStyle={styles.alertsListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.aquaTechBlue]}
            tintColor={Colors.aquaTechBlue}
          />
        }
      >
        {alerts.map(alert => renderAlertCard(alert))}
      </ScrollView>
    );
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flood Alerts</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.container}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.criticalRed }]}>
              {alerts.filter(a => a.alert_type === 'danger').length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.aquaTechBlue }]}>
              {alerts.filter(a => !a.is_read).length}
            </Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
        </View>

        {renderContent()}
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.aquaTechBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.alertRed,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  alertsList: {
    flex: 1,
  },
  alertsListContent: {
    padding: 20,
    gap: 12,
  },
  modernCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.aquaTechBlue,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  siteLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 14,
    opacity: 0.75,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 4,
    borderWidth: 1,
    backgroundColor: 'rgba(245, 246, 250, 0.5)',
  },
  filledTag: {
    borderWidth: 0,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filledTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default FloodAlertsScreen;
