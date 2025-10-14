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
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Profile } from '../types/profile';
import Card from '../components/Card';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { useMonitoringSites } from '../hooks/useMonitoringSites';
import { MonitoringSite } from '../services/monitoringSitesService';
import { DebugUtils } from '../services/debugUtils';

interface HomeScreenProps {
  profile: Profile;
  onNavigateToSite: (siteId: string) => void;
  onNavigateToNewReading: (siteId: string) => void;
  onNavigateToMyReadings: () => void;
  onNavigateToSiteLocations: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
}



// Flood alerts data
const floodAlerts = [
  {
    id: 'flood_1',
    title: 'High Water Level Alert',
    description: 'Water level approaching danger mark at gauge station',
    location: 'Brahmaputra River - Guwahati',
    date: '2025-10-14',
    type: 'flood_alert' as const,
    severity: 'high' as const,
    waterLevel: 142.5,
    dangerLevel: 145.0,
  },
  {
    id: 'flood_2',
    title: 'Rising Water Levels',
    description: 'Steady increase in water level due to upstream rainfall',
    location: 'Ganges River - Patna',
    date: '2025-10-14',
    type: 'flood_alert' as const,
    severity: 'medium' as const,
    waterLevel: 48.2,
    dangerLevel: 50.0,
  },
];

// Recent readings data
const recentReadings = [
  {
    id: 'reading_1',
    title: 'Latest Water Level Reading',
    description: 'Automated reading captured via HydroSnap mobile app',
    location: 'Narmada River - Bhopal',
    date: '2025-10-14',
    type: 'reading' as const,
    severity: 'low' as const,
    waterLevel: 35.8,
    fieldPersonnel: 'Rajesh Kumar',
  },
  {
    id: 'reading_2',
    title: 'Manual Site Inspection',
    description: 'Field verification and water level measurement',
    location: 'Yamuna River - Agra',
    date: '2025-10-14',
    type: 'reading' as const,
    severity: 'low' as const,
    waterLevel: 28.4,
    fieldPersonnel: 'Priya Sharma',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  onNavigateToSite,
  onNavigateToNewReading,
  onNavigateToMyReadings,
  onNavigateToSiteLocations,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'capture' | 'readings' | 'dashboard' | 'sites' | 'profile'>('dashboard');
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | undefined>();

  // Use the monitoring sites hook with optimized settings
  const {
    sites,
    loading,
    error,
    refreshing,
    todaysReadingsCount,
    floodAlertsCount,
    refresh,
  } = useMonitoringSites({
    ...(userLocation && { userLocation }),
    userId: profile.id,
    userRole: profile.role,
    autoRefresh: false, // Disable auto-refresh on startup to improve performance
    refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes instead of 5
  });

  useEffect(() => {
    // Delay location fetching to improve initial load time
    const timer = setTimeout(() => {
      fetchUserLocation();
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, []);

  const fetchUserLocation = async () => {
    try {
      // TODO: Implement proper location fetching with permissions
      // For now, we'll use a mock location (Delhi)
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.2090
      });
    } catch (error) {
      console.log('Could not fetch user location:', error);
    }
  };

  const onRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    }
  };

  const runDebugTests = async () => {
    console.log('🐛 Running debug tests from HomeScreen...');
    try {
      await DebugUtils.runAllTests();
      Alert.alert('Debug Complete', 'Check the console for detailed debug information.');
    } catch (error) {
      console.error('Debug tests failed:', error);
      Alert.alert('Debug Failed', 'Debug tests encountered an error. Check console for details.');
    }
  };

  const getStatusColor = (status: MonitoringSite['status']) => {
    switch (status) {
      case 'normal':
        return Colors.validationGreen;
      case 'warning':
        return Colors.warning;
      case 'danger':
        return Colors.alertRed;
      case 'reading_due':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: MonitoringSite['status']) => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'warning':
        return 'Warning';
      case 'danger':
        return 'Danger';
      case 'reading_due':
        return 'Reading Due';
      default:
        return 'Unknown';
    }
  };

  const canTakeReading = (site: MonitoringSite) => {
    return (site.isAccessible ?? true) && (site.distanceFromUser ?? 0) <= 500; // Within 500 meters
  };

  const handleTabPress = (tab: 'capture' | 'readings' | 'dashboard' | 'sites' | 'profile') => {
    setActiveTab(tab);
    switch (tab) {
      case 'capture':
        onNavigateToNewReading('capture');
        break;
      case 'readings':
        onNavigateToMyReadings();
        break;
      case 'dashboard':
        // Already on dashboard - do nothing
        break;
      case 'sites':
        onNavigateToSiteLocations();
        break;
      case 'profile':
        onNavigateToProfile();
        break;
    }
  };

  const handleNavbarAction = (action: 'qr' | 'notifications' | 'profile' | 'settings') => {
    switch (action) {
      case 'qr':
        console.log('QR Scanner will open');
        Alert.alert('QR Scanner', 'QR code scanning functionality will be implemented here.');
        break;
      case 'notifications':
        console.log('Notifications will open');
        Alert.alert('Notifications', 'Notification center will be implemented here.');
        break;
      case 'profile':
        onNavigateToProfile();
        break;
      case 'settings':
        onNavigateToSettings();
        break;
    }
  };

  const renderSiteCard = (site: MonitoringSite) => (
    <TouchableOpacity
      key={site.id}
      style={[styles.siteCard, createNeumorphicCard({ size: 'medium' })]}
      onPress={() => onNavigateToSite(site.id)}
    >
      <View style={styles.siteHeader}>
        <View style={styles.siteInfo}>
          <Text style={[styles.siteName, NeumorphicTextStyles.heading]}>{site.name}</Text>
          <Text style={[styles.siteLocation, NeumorphicTextStyles.caption]}>
            📍 {site.location}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(site.status) }]}>
          <Text style={styles.statusBadgeText}>{getStatusText(site.status)}</Text>
        </View>
      </View>

      {site.lastReading && (
        <View style={styles.readingInfo}>
          <Text style={[styles.waterLevel, NeumorphicTextStyles.subheading]}>
            {site.lastReading.waterLevel} cm
          </Text>
          <Text style={[styles.readingTime, NeumorphicTextStyles.caption]}>
            Last Reading: {site.lastReading.timestamp}
          </Text>
        </View>
      )}

      <View style={styles.siteFooter}>
        <Text style={[styles.distance, NeumorphicTextStyles.caption]}>
          📏 {site.distanceFromUser ? `${site.distanceFromUser}m away` : 'Distance unknown'}
        </Text>
        
        {canTakeReading(site) && (
          <TouchableOpacity
            style={[styles.newReadingButton, createNeumorphicCard({ size: 'small' })]}
            onPress={() => onNavigateToNewReading(site.id)}
          >
            <Text style={styles.newReadingButtonText}>New Reading</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeroSection = () => {
    const currentHour = new Date().getHours();
    const getGreeting = () => {
      if (currentHour < 12) return 'Good Morning';
      if (currentHour < 17) return 'Good Afternoon';
      return 'Good Evening';
    };

    const getCurrentDate = () => {
      const today = new Date();
      return today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const getWaterLevelStatus = () => {
      const warningSites = sites.filter(site => site.status === 'warning').length;
      const dangerSites = sites.filter(site => site.status === 'danger').length;
      
      if (dangerSites > 0) {
        return { status: 'Critical', color: Colors.alertRed, icon: '🚨' };
      } else if (warningSites > 0) {
        return { status: 'Monitoring', color: Colors.warning, icon: '⚠️' };
      } else {
        return { status: 'Normal', color: Colors.validationGreen, icon: '✅' };
      }
    };

    const totalSites = sites.length;
    const currentFloodAlerts = floodAlertsCount;
    const waterStatus = getWaterLevelStatus();

    return (
      <View style={[styles.heroContainer, createNeumorphicCard({ size: 'large', borderRadius: 24 })]}>
        {/* Header Section */}
        <View style={styles.heroHeader}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}, {profile.full_name.split(' ')[0]}</Text>
            <View style={styles.statusContainer}>
              <Text style={styles.statusIcon}>{waterStatus.icon}</Text>
              <Text style={[styles.statusText, { color: waterStatus.color }]}>
                Water Level Status: {waterStatus.status}
              </Text>
            </View>
            <Text style={styles.date}>{getCurrentDate()}</Text>
          </View>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📍</Text>
            <Text style={styles.statNumber}>{totalSites}</Text>
            <Text style={styles.statLabel}>Active Sites</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statNumber}>{todaysReadingsCount}</Text>
            <Text style={styles.statLabel}>Today's Readings</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⚠️</Text>
            <Text style={styles.statNumber}>{currentFloodAlerts}</Text>
            <Text style={styles.statLabel}>Flood Alerts</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onNavigateToNewReading('capture')}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionText}>Capture Reading</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => console.log('View Sites')}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>View Sites</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFloodAlerts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🚨 Flood Alert Status</Text>
        <Text style={styles.sectionSubtitle}>Real-time water level monitoring</Text>
      </View>
      {floodAlerts.map(alert => (
        <Card
          key={alert.id}
          type={alert.type}
          severity={alert.severity}
          title={alert.title}
          description={alert.description}
          location={alert.location}
          date={alert.date}
          waterLevel={alert.waterLevel}
          dangerLevel={alert.dangerLevel}
          onPress={() => console.log(`Flood alert ${alert.id} pressed`)}
        />
      ))}
    </View>
  );

  const renderRecentReadings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📊 Recent Water Level Readings</Text>
        <Text style={styles.sectionSubtitle}>Latest data collection</Text>
      </View>
      {recentReadings.map(reading => (
        <Card
          key={reading.id}
          type={reading.type}
          severity={reading.severity}
          title={reading.title}
          description={reading.description}
          location={reading.location}
          date={reading.date}
          waterLevel={reading.waterLevel}
          fieldPersonnel={reading.fieldPersonnel}
          onPress={() => console.log(`Reading ${reading.id} pressed`)}
        />
      ))}
    </View>
  );

  const renderAIInsights = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🤖 AI Flood Prediction</Text>
        <Text style={styles.sectionSubtitle}>Machine learning analysis</Text>
      </View>
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Flood Risk Assessment</Text>
        <Text style={styles.insightText}>
          AI model predicts 68% chance of moderate flooding in Brahmaputra basin within next 48 hours based on upstream precipitation data and current water levels.
        </Text>
        <View style={styles.riskIndicator}>
          <Text style={styles.riskLabel}>Risk Level: </Text>
          <Text style={styles.riskMedium}>MEDIUM</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Navbar 
        onQRScanPress={() => handleNavbarAction('qr')}
        onNotificationPress={() => handleNavbarAction('notifications')}
        onProfilePress={() => handleNavbarAction('profile')}
        onSettingsPress={() => handleNavbarAction('settings')}
      />

      {renderHeroSection()}
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Monitoring Sites Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View>
              <Text style={styles.sectionTitle}>🏗️ Monitoring Sites</Text>
              <Text style={styles.sectionSubtitle}>Overview • History • Map</Text>
            </View>
            {sites.length > 5 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => handleTabPress('sites')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {loading && sites.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading monitoring sites...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load sites: {error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={runDebugTests} style={[styles.retryButton, { backgroundColor: Colors.warning, marginTop: 10 }]}>
                <Text style={styles.retryButtonText}>Run Debug Tests</Text>
              </TouchableOpacity>
            </View>
          ) : sites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No monitoring sites found in your area</Text>
              <Text style={styles.emptySubtext}>Trying to load sites...</Text>
            </View>
          ) : (
            // Only show first 5 sites on home screen
            sites.slice(0, 5).map(renderSiteCard)
          )}
        </View>

        {/* Flood Alerts Section */}
        {renderFloodAlerts()}

        {/* Recent Readings Section */}
        {renderRecentReadings()}

        {/* AI Insights Section */}
        {renderAIInsights()}
      </ScrollView>
      
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
    paddingTop: 0, // Remove top padding since navbar handles it
  },
  scrollContainer: {
    paddingBottom: 100, // Add bottom padding to prevent collision with bottom navigation
  },
  // Hero Section Styles
  heroContainer: {
    margin: 20,
    marginBottom: 10,
    padding: 24,
    borderRadius: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusText: {
    ...NeumorphicTextStyles.subheading,
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    ...NeumorphicTextStyles.bodySecondary,
    fontSize: 14,
  },
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    flex: 1,
    padding: 18,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.aquaTechBlue,
    marginBottom: 6,
  },
  statLabel: {
    ...NeumorphicTextStyles.caption,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 16 }),
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: Colors.deepSecurityBlue,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  // Content Section
  content: {
    flex: 1,
  },
  section: {
    margin: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 22,
    marginBottom: 6,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    ...NeumorphicTextStyles.bodySecondary,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Site Card Styles
  siteCard: {
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  siteInfo: {
    flex: 1,
    marginRight: 12,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  readingInfo: {
    marginBottom: 12,
  },
  waterLevel: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.aquaTechBlue,
    marginBottom: 4,
  },
  readingTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  siteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  newReadingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.deepSecurityBlue,
  },
  newReadingButtonText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  // AI Insights Styles
  insightCard: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: Colors.warning || '#FFA726',
    marginHorizontal: 4,
  },
  insightTitle: {
    ...NeumorphicTextStyles.subheading,
    marginBottom: 12,
    color: Colors.textPrimary,
  },
  insightText: {
    ...NeumorphicTextStyles.body,
    lineHeight: 24,
    marginBottom: 16,
    color: Colors.textSecondary,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskLabel: {
    ...NeumorphicTextStyles.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  riskMedium: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.warning || '#FFA726',
    backgroundColor: (Colors.warning || '#FFA726') + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Loading, Error, and Empty States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    marginHorizontal: 4,
  },
  loadingText: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    marginHorizontal: 4,
  },
  errorText: {
    ...NeumorphicTextStyles.body,
    color: Colors.alertRed,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.deepSecurityBlue,
    borderRadius: 20,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    marginHorizontal: 4,
  },
  emptyText: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...NeumorphicTextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  // Section Header with Action
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  viewAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.aquaTechBlue,
    borderRadius: 20,
  },
  viewAllButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;