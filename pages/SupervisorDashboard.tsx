import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors } from '../lib/colors';
import { useTranslation } from 'react-i18next';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Profile } from '../types/profile';

interface SupervisorDashboardProps {
  profile: Profile;
  onNavigateToSite: (siteId: string) => void;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
}

interface DashboardStats {
  totalSites: number;
  activeSites: number;
  alertSites: number;
  todayReadings: number;
  pendingReviews: number;
  dataAccuracy: number;
}

interface SiteAlert {
  id: string;
  siteId: string;
  siteName: string;
  type: 'danger_level' | 'missed_reading' | 'tamper_detected' | 'system_error';
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface RecentActivity {
  id: string;
  siteId: string;
  siteName: string;
  action: string;
  operator: string;
  timestamp: string;
  waterLevel?: number;
  status: 'success' | 'warning' | 'error';
}

const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  profile,
  onNavigateToSite,
  onNavigateToSettings,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalSites: 0,
    activeSites: 0,
    alertSites: 0,
    todayReadings: 0,
    pendingReviews: 0,
    dataAccuracy: 0,
  });
  const [alerts, setAlerts] = useState<SiteAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'alerts' | 'activity'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      setStats({
        totalSites: 24,
        activeSites: 22,
        alertSites: 3,
        todayReadings: 156,
        pendingReviews: 8,
        dataAccuracy: 98.5,
      });

      setAlerts([
        {
          id: '1',
          siteId: 'site_3',
          siteName: 'Hindon River - Ghaziabad',
          type: 'danger_level',
          message: 'Water level exceeded danger mark (178.2 cm)',
          severity: 'high',
          timestamp: '2025-10-05T11:45:00Z',
        },
        {
          id: '2',
          siteId: 'site_7',
          siteName: 'Yamuna River - Mathura',
          type: 'missed_reading',
          message: 'No reading received for 8 hours',
          severity: 'medium',
          timestamp: '2025-10-05T10:00:00Z',
        },
        {
          id: '3',
          siteId: 'site_12',
          siteName: 'Ganga Canal - Haridwar',
          type: 'tamper_detected',
          message: 'Multiple failed geolocation attempts detected',
          severity: 'high',
          timestamp: '2025-10-05T09:30:00Z',
        },
      ]);

      setRecentActivity([
        {
          id: '1',
          siteId: 'site_1',
          siteName: 'Yamuna River - Palla',
          action: 'Reading Submitted',
          operator: 'Ram Kumar',
          timestamp: '2025-10-05T11:30:00Z',
          waterLevel: 142.5,
          status: 'success',
        },
        {
          id: '2',
          siteId: 'site_5',
          siteName: 'Gomti Barrage - Lucknow',
          action: 'Photo Verified',
          operator: 'System Auto',
          timestamp: '2025-10-05T11:15:00Z',
          status: 'success',
        },
        {
          id: '3',
          siteId: 'site_8',
          siteName: 'Ganges - Kanpur',
          action: 'Location Validation Failed',
          operator: 'Priya Singh',
          timestamp: '2025-10-05T11:00:00Z',
          status: 'error',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      Alert.alert(t('supervisor.error'), t('supervisor.failedToLoad'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      Alert.alert(t('supervisor.error'), t('supervisor.failedToRefresh'));
    } finally {
      setRefreshing(false);
    }
  };

  const getAlertColor = (severity: SiteAlert['severity']) => {
    switch (severity) {
      case 'high':
        return Colors.alertRed;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.aquaTechBlue;
      default:
        return Colors.textSecondary;
    }
  };

  const getActivityStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success':
        return Colors.validationGreen;
      case 'warning':
        return Colors.warning;
      case 'error':
        return Colors.alertRed;
      default:
        return Colors.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return t('supervisor.hoursAgo', { hours: diffHours });
    } else if (diffMinutes > 0) {
      return t('supervisor.minutesAgo', { minutes: diffMinutes });
    } else {
      return t('supervisor.justNow');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, createNeumorphicCard({ size: 'medium' })]}>
      <View style={styles.headerContent}>
        <View>
          <Text style={[styles.greeting, NeumorphicTextStyles.heading]}>
            {t('supervisor.supervisorDashboard')}
          </Text>
          <Text style={[styles.welcomeText, NeumorphicTextStyles.caption]}>
            {t('supervisor.welcomeBack', { name: profile.full_name.split(' ')[0] })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, createNeumorphicCard({ size: 'small' })]}
            onPress={onNavigateToSettings}
          >
            <Text style={styles.headerButtonIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, createNeumorphicCard({ size: 'small' })]}
            onPress={onSignOut}
          >
            <Text style={styles.headerButtonIcon}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.deepSecurityBlue }]}>
            {stats.totalSites}
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.totalSites')}</Text>
        </View>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.validationGreen }]}>
            {stats.activeSites}
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.activeSites')}</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.alertRed }]}>
            {stats.alertSites}
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.alerts')}</Text>
        </View>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.aquaTechBlue }]}>
            {stats.todayReadings}
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.todayReadings')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>
            {stats.pendingReviews}
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.pendingReviews')}</Text>
        </View>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, { color: Colors.validationGreen }]}>
            {stats.dataAccuracy}%
          </Text>
          <Text style={styles.statLabel}>{t('supervisor.dataAccuracy')}</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={[styles.tabContainer, createNeumorphicCard({ size: 'small' })]}>
      {(['overview', 'alerts', 'activity'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            selectedView === tab && styles.activeTab,
          ]}
          onPress={() => setSelectedView(tab)}
        >
          <Text style={[
            styles.tabText,
            selectedView === tab && styles.activeTabText,
          ]}>
            {tab === 'overview' && t('supervisor.overview')}
            {tab === 'alerts' && t('supervisor.alerts')}
            {tab === 'activity' && t('supervisor.activity')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAlerts = () => (
    <View style={[styles.alertsCard, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.cardTitle, NeumorphicTextStyles.subheading]}>
        {t('supervisor.criticalAlerts')}
      </Text>
      
      {alerts.length > 0 ? (
        alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            style={styles.alertItem}
            onPress={() => onNavigateToSite(alert.siteId)}
          >
            <View style={styles.alertHeader}>
              <View style={[
                styles.alertSeverity,
                { backgroundColor: getAlertColor(alert.severity) }
              ]} />
              <Text style={styles.alertSiteName}>{alert.siteName}</Text>
              <Text style={styles.alertTime}>{formatTimestamp(alert.timestamp)}</Text>
            </View>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>{t('supervisor.noActiveAlerts')}</Text>
      )}
    </View>
  );

  const renderActivity = () => (
    <View style={[styles.activityCard, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.cardTitle, NeumorphicTextStyles.subheading]}>
        {t('supervisor.recentActivity')}
      </Text>
      
      {recentActivity.length > 0 ? (
        recentActivity.map((activity) => (
          <TouchableOpacity
            key={activity.id}
            style={styles.activityItem}
            onPress={() => onNavigateToSite(activity.siteId)}
          >
            <View style={styles.activityHeader}>
              <View style={[
                styles.activityStatus,
                { backgroundColor: getActivityStatusColor(activity.status) }
              ]} />
              <Text style={styles.activitySite}>{activity.siteName}</Text>
              <Text style={styles.activityTime}>{formatTimestamp(activity.timestamp)}</Text>
            </View>
            <Text style={styles.activityAction}>{activity.action}</Text>
            <Text style={styles.activityOperator}>{t('supervisor.by', { operator: activity.operator })}</Text>
            {activity.waterLevel && (
              <Text style={styles.activityLevel}>{t('supervisor.waterLevel', { level: activity.waterLevel })}</Text>
            )}
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>{t('supervisor.noRecentActivity')}</Text>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (selectedView) {
      case 'overview':
        return (
          <>
            {renderStatsCards()}
            {renderAlerts()}
          </>
        );
      case 'alerts':
        return renderAlerts();
      case 'activity':
        return renderActivity();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.deepSecurityBlue,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  alertsCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 16,
  },
  alertItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertSeverity: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  alertSiteName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  alertTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  alertMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 20,
    lineHeight: 18,
  },
  activityCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activitySite: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityAction: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 20,
    marginBottom: 2,
  },
  activityOperator: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 20,
  },
  activityLevel: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    marginLeft: 20,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});

export default SupervisorDashboard;