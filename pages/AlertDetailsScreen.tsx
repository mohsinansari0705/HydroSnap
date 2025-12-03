import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import SafeScreen from '../components/SafeScreen';
import { useNavigation } from '../lib/NavigationContext';
import { useBackHandler } from '../hooks/useBackHandler';
import floodAlertsService, { FloodAlert } from '../services/floodAlertsService';
import { MonitoringSite, MonitoringSitesService } from '../services/monitoringSitesService';
import { WaterLevelReading } from '../services/waterLevelReadingsService';

interface AlertDetailsScreenProps {
  alertId: string;
  profile: any;
}

const AlertDetailsScreen: React.FC<AlertDetailsScreenProps> = ({ alertId, profile }) => {
  const { navigateBack } = useNavigation();
  const [alert, setAlert] = useState<FloodAlert | null>(null);

  // Handle Android back button
  useBackHandler(() => {
    navigateBack();
    return true;
  });
  const [site, setSite] = useState<MonitoringSite | null>(null);
  const [recentReadings, setRecentReadings] = useState<WaterLevelReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlertDetails();
  }, [alertId]);

  const fetchAlertDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.id) {
        setError('User not authenticated');
        return;
      }

      // Fetch alert details
      const alerts = await floodAlertsService.getUserAlerts(profile.id);
      const foundAlert = alerts.find(a => a.id === alertId);
      
      if (!foundAlert) {
        setError('Alert not found');
        return;
      }

      setAlert(foundAlert);

      // Mark as read
      if (!foundAlert.is_read) {
        await floodAlertsService.markAsRead(alertId);
      }

      // Fetch site details
      const siteDetails = await MonitoringSitesService.getSiteById(foundAlert.monitoring_site_id);
      if (siteDetails) {
        setSite(siteDetails);
      }

      // Fetch recent readings for the site to show trend
      const readings = await MonitoringSitesService.getSiteReadings(
        foundAlert.monitoring_site_id,
        10
      ) as WaterLevelReading[];
      setRecentReadings(readings);

      console.log('✅ Loaded alert details successfully');
    } catch (error) {
      console.error('❌ Error fetching alert details:', error);
      setError('Failed to load alert details');
    } finally {
      setLoading(false);
    }
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'safe': return Colors.successGreen;
      case 'warning': return Colors.warningOrange;
      case 'danger': return Colors.criticalRed;
      case 'critical': return Colors.darkRed;
      default: return Colors.aquaTechBlue;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  const calculateTrend = () => {
    if (recentReadings.length < 2) return null;
    
    const latest = recentReadings[0]?.predicted_water_level || 0;
    const previous = recentReadings[1]?.predicted_water_level || 0;
    const change = latest - previous;
    
    return {
      direction: change > 0 ? 'rising' : change < 0 ? 'falling' : 'stable',
      change: Math.abs(change),
      percentage: previous !== 0 ? (Math.abs(change) / previous * 100) : 0
    };
  };

  const renderHeader = () => {
    if (!alert) return null;
    
    const alertColor = getAlertColor(alert.alert_type);
    const alertIcon = getAlertIcon(alert.alert_type);
    
    return (
      <View style={[styles.alertHeader, { backgroundColor: alertColor + '10' }]}>
        <View style={[styles.headerIconContainer, { backgroundColor: alertColor + '20' }]}>
          <Ionicons name={alertIcon as any} size={48} color={alertColor} />
        </View>
        <Text style={styles.alertHeaderTitle}>{alert.site_name}</Text>
        <Text style={styles.headerSubtitle}>{alert.site_location}</Text>
        <View style={[styles.severityBadge, { backgroundColor: alertColor }]}>
          <Text style={styles.severityBadgeText}>
            {alert.alert_type.toUpperCase().replace('_', ' ')} - {alert.severity.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const renderWaterLevelInfo = () => {
    if (!alert || !site) return null;
    if (alert.alert_type === 'missed_reading') return null;

    const currentLevel = alert.water_level || 0;
    const dangerLevel = site.danger_level || 0;
    const warningLevel = site.warning_level || 0;

    const maxLevel = Math.max(dangerLevel, currentLevel) * 1.2;
    const dangerPercent = (dangerLevel / maxLevel) * 100;
    const warningPercent = (warningLevel / maxLevel) * 100;
    const currentPercent = (currentLevel / maxLevel) * 100;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Water Level Status</Text>
        
        <View style={styles.levelVisualization}>
          <View style={styles.levelBar}>
            <View style={[styles.levelFill, { 
              height: `${currentPercent}%`,
              backgroundColor: getAlertColor(alert.alert_type)
            }]} />
            <View style={[styles.levelMarker, { bottom: `${dangerPercent}%` }]}>
              <View style={[styles.markerLine, { backgroundColor: Colors.criticalRed }]} />
              <Text style={styles.markerLabel}>Danger: {dangerLevel.toFixed(2)}m</Text>
            </View>
            <View style={[styles.levelMarker, { bottom: `${warningPercent}%` }]}>
              <View style={[styles.markerLine, { backgroundColor: Colors.warningOrange }]} />
              <Text style={styles.markerLabel}>Warning: {warningLevel.toFixed(2)}m</Text>
            </View>
          </View>
          
          <View style={styles.levelStats}>
            <View style={styles.levelStatItem}>
              <Text style={styles.levelStatValue}>{currentLevel.toFixed(2)}m</Text>
              <Text style={styles.levelStatLabel}>Current Level</Text>
            </View>
            <View style={styles.levelStatDivider} />
            <View style={styles.levelStatItem}>
              <Text style={[styles.levelStatValue, { color: Colors.criticalRed }]}>
                {dangerLevel.toFixed(2)}m
              </Text>
              <Text style={styles.levelStatLabel}>Danger Threshold</Text>
            </View>
            <View style={styles.levelStatDivider} />
            <View style={styles.levelStatItem}>
              <Text style={[styles.levelStatValue, { color: Colors.warningOrange }]}>
                {(dangerLevel - currentLevel).toFixed(2)}m
              </Text>
              <Text style={styles.levelStatLabel}>Buffer Zone</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTrendAnalysis = () => {
    if (recentReadings.length < 2) return null;
    
    const trend = calculateTrend();
    if (!trend) return null;

    const trendColor = trend.direction === 'rising' 
      ? Colors.criticalRed 
      : trend.direction === 'falling' 
      ? Colors.successGreen 
      : Colors.textSecondary;

    const trendIcon = trend.direction === 'rising'
      ? 'trending-up'
      : trend.direction === 'falling'
      ? 'trending-down'
      : 'remove';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trend Analysis</Text>
        
        <View style={styles.trendCard}>
          <View style={[styles.trendIconContainer, { backgroundColor: trendColor + '15' }]}>
            <Ionicons name={trendIcon as any} size={32} color={trendColor} />
          </View>
          <View style={styles.trendInfo}>
            <Text style={[styles.trendDirection, { color: trendColor }]}>
              {trend.direction.toUpperCase()}
            </Text>
            <Text style={styles.trendChange}>
              {trend.change.toFixed(2)}m ({trend.percentage.toFixed(1)}%)
            </Text>
            <Text style={styles.trendDescription}>
              Water level is {trend.direction} compared to previous reading
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecentReadings = () => {
    if (recentReadings.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Readings</Text>
        
        {recentReadings.slice(0, 5).map((reading) => (
          <View key={reading.id} style={styles.readingItem}>
            <View style={styles.readingContent}>
              <View style={[styles.readingIndicator, { 
                backgroundColor: getStatusColor(reading.water_level_status) 
              }]} />
              <View style={styles.readingInfo}>
                <Text style={styles.readingValue}>
                  {reading.predicted_water_level?.toFixed(2) || 'N/A'} m
                </Text>
                <Text style={styles.readingDate}>
                  {formatShortDate(reading.submission_timestamp || new Date().toISOString())}
                </Text>
              </View>
            </View>
            <View style={[styles.readingStatus, { 
              backgroundColor: getStatusColor(reading.water_level_status) + '15'
            }]}>
              <Text style={[styles.readingStatusText, { color: getStatusColor(reading.water_level_status) }]}>
                {reading.water_level_status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderAlertMessage = () => {
    if (!alert) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Message</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{alert.message}</Text>
          <View style={styles.messageMeta}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.messageDate}>
              {formatDate(alert.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSiteInfo = () => {
    if (!site) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Site Information</Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color={Colors.aquaTechBlue} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{site.location}</Text>
            </View>
          </View>
          
          {site.river_name && (
            <View style={styles.infoItem}>
              <Ionicons name="water" size={20} color={Colors.aquaTechBlue} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>River</Text>
                <Text style={styles.infoValue}>{site.river_name}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <Ionicons name="business" size={20} color={Colors.aquaTechBlue} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Organization</Text>
              <Text style={styles.infoValue}>{site.organization}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="analytics" size={20} color={Colors.aquaTechBlue} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Site Type</Text>
              <Text style={styles.infoValue}>
                {site.site_type?.toUpperCase() || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionNotice}>
          <Ionicons name="information-circle" size={20} color={Colors.aquaTechBlue} />
          <Text style={styles.actionNoticeText}>
            All available site information is displayed above
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alert Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (error || !alert) {
    return (
      <SafeScreen>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alert Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.alertRed} />
          <Text style={styles.errorText}>{error || 'Alert not found'}</Text>
          <TouchableOpacity 
            onPress={fetchAlertDetails} 
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {renderHeader()}
        {renderAlertMessage()}
        {renderWaterLevelInfo()}
        {renderTrendAnalysis()}
        {renderRecentReadings()}
        {renderSiteInfo()}
      </ScrollView>
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
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.softLightGrey,
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
  alertHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  severityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  severityBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 12,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  levelVisualization: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelBar: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.softLightGrey,
    borderRadius: 12,
    position: 'relative',
    marginBottom: 20,
    overflow: 'hidden',
  },
  levelFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
    opacity: 0.7,
  },
  levelMarker: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  markerLine: {
    height: 2,
    width: '100%',
    opacity: 0.8,
  },
  markerLabel: {
    position: 'absolute',
    right: 8,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  levelStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  levelStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.aquaTechBlue,
    marginBottom: 4,
  },
  levelStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  levelStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.softLightGrey,
  },
  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trendInfo: {
    flex: 1,
  },
  trendDirection: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  trendChange: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  trendDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  readingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  readingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  readingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readingInfo: {
    flex: 1,
  },
  readingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  readingDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  readingStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
  },
  readingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoGrid: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.aquaTechBlue + '10',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionNoticeText: {
    fontSize: 14,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
  },
});

export default AlertDetailsScreen;
