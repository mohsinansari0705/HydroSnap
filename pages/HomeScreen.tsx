import React, { useState, useEffect } from 'react';
import { QRScanner } from '../components/QRScanner';
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
import SafeScreen from '../components/SafeScreen';
import { useMonitoringSites } from '../hooks/useMonitoringSites';
import { MonitoringSite } from '../services/monitoringSitesService';
import { DebugUtils } from '../services/debugUtils';
import { useSiteCache } from '../lib/SiteCacheContext';
import { useNavigation } from '../lib/NavigationContext';

interface HomeScreenProps {
  profile: Profile | null;
  onNavigateToSite: (siteId: string) => void;
  onNavigateToNewReading: (siteId: string) => void;
  onNavigateToMyReadings: () => void;
  onNavigateToSiteLocations: () => void;
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
    severity: 'critical' as const,
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
    severity: 'warning' as const,
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
  onNavigateToSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'capture' | 'readings' | 'home' | 'sites' | 'profile'>('home');
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | undefined>();
  const [qrScannerVisible, setQRScannerVisible] = useState(false);
  // notification visibility moved to global navigation context
  const { toggleNotifications, setCurrentScreen } = useNavigation();

  // Use the site cache to prevent repeated fetching
  const { sites: cachedSites, setCachedSites, isCacheValid, clearCache } = useSiteCache();

  // Use the monitoring sites hook with optimized settings and caching
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
    userId: profile?.id || 'anonymous',
    userRole: profile?.role || 'user',
    autoRefresh: false, // Disable auto-refresh on startup to improve performance
    refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes instead of 5
    skipInitialFetch: cachedSites.length > 0 && isCacheValid(), // Skip initial fetch if we have valid cached data
  });

  // Cache sites when they are loaded successfully, and use cached sites if available
  const displaySites = cachedSites.length > 0 && isCacheValid() ? cachedSites : sites;
  
  useEffect(() => {
    if (sites && sites.length > 0) {
      setCachedSites(sites);
      console.log(`[HomeScreen] Cached ${sites.length} sites for better performance`);
    }
  }, [sites, setCachedSites]);

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
      // Clear cache to ensure fresh data on refresh
      clearCache();
      console.log('[HomeScreen] Cleared cache for fresh data refresh');
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

  const handleTabPress = (tab: 'capture' | 'readings' | 'home' | 'sites' | 'profile') => {
    setActiveTab(tab);
    switch (tab) {
      case 'capture':
        onNavigateToNewReading('capture');
        break;
      case 'readings':
        onNavigateToMyReadings();
        break;
      case 'home':
        // Already on home - do nothing
        break;
      case 'sites':
        console.log('Navigating to site locations');
        onNavigateToSiteLocations();
        break;
      case 'profile':
        setCurrentScreen('profile');
        break;
    }
  };

  const handleNavbarAction = (action: 'qr' | 'notifications' | 'profile' | 'settings') => {
    switch (action) {
      case 'qr':
        setQRScannerVisible(true);
        break;
      case 'notifications':
        toggleNotifications();
        break;
      case 'profile':
        setCurrentScreen('profile');
        break;
      case 'settings':
        console.log('Settings button pressed, calling onNavigateToSettings');
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
          📏 {site.distanceFromUser ? (site.distanceFromUser < 500 ? `${Math.round(site.distanceFromUser)}m away` : `${(site.distanceFromUser / 1000).toFixed(1)}km away`) : 'Distance unknown'}
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

  const renderCompactHeader = () => {
    const currentHour = new Date().getHours();
    const getGreeting = () => {
      if (currentHour < 12) return 'Good Morning';
      if (currentHour < 17) return 'Good Afternoon';
      return 'Good Evening';
    };

    const getWaterLevelStatus = () => {
      const warningSites = displaySites.filter(site => site.status === 'warning').length;
      const dangerSites = displaySites.filter(site => site.status === 'danger').length;
      
      if (dangerSites > 0) {
        return { status: 'Critical', color: Colors.alertRed, icon: '🚨' };
      } else if (warningSites > 0) {
        return { status: 'Monitoring', color: Colors.warning, icon: '⚠️' };
      } else {
        return { status: 'Normal', color: Colors.validationGreen, icon: '✅' };
      }
    };

    const waterStatus = getWaterLevelStatus();

    return (
      <View style={styles.compactHeader}>
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            {/* Avatar / Initials */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGradient}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || 'User')
                    .split(' ')
                    .map(n => n?.[0] ?? '')
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Greeting + Name + subtitle */}
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingLabel}>{getGreeting()},</Text>
              <Text numberOfLines={1} style={styles.userName}>{(profile?.full_name || 'User')}</Text>
              {(profile?.role || 'user') && (<Text style={styles.userRole}>{profile?.role || 'user'}</Text>)}
            </View>
          </View>
          
          {/* We'll format and enhance the UI of this status container later. */}
          {/* <View style={styles.compactStatusContainer}>
            <Text style={styles.compactStatusIcon}>{waterStatus.icon}</Text>
            <Text style={[styles.compactStatusText, { color: waterStatus.color }]}>
              {waterStatus.status}
            </Text>
          </View> */}
        </View>
        
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{displaySites.length}</Text>
            <Text style={styles.quickStatLabel}>Sites</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{todaysReadingsCount}</Text>
            <Text style={styles.quickStatLabel}>Readings</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{floodAlertsCount}</Text>
            <Text style={styles.quickStatLabel}>Alerts</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFixedActions = () => (
    <View style={styles.fixedActionsContainer}>
      <TouchableOpacity 
        style={styles.primaryActionButton}
        onPress={() => onNavigateToNewReading('capture')}
      >
        <Text style={styles.primaryActionIcon}>📸</Text>
        <Text style={styles.primaryActionText}>Capture Reading</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.secondaryActionButton}
        onPress={() => Alert.alert('Map View', 'Interactive map view for monitoring sites is coming soon!')}
      >
        <Text style={styles.secondaryActionIcon}>🗺️</Text>
        <Text style={styles.secondaryActionText}>Map View</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFloodAlerts = () => {
    const mapSeverityForCard = (sev: string): 'low' | 'medium' | 'high' => {
      switch (sev) {
        case 'critical':
          return 'high';
        case 'warning':
          return 'medium';
        case 'low':
          return 'low';
        case 'medium':
          return 'medium';
        case 'high':
          return 'high';
        default:
          return 'medium';
      }
    };

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚨 Flood Alert Status</Text>
          <Text style={styles.sectionSubtitle}>Real-time water level monitoring</Text>
        </View>
        {floodAlerts.map(alert => (
          <Card
            key={alert.id}
            type={alert.type}
            severity={mapSeverityForCard(alert.severity as string)}
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
  };

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

  /* Temporarily disabled AI Insights feature
  const renderAIInsights = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🤖 AI Flood Prediction</Text>
        <Text style={styles.sectionSubtitle}>Machine learning analysis</Text>
      </View>
      <View style={styles.comingSoonCard}>
        <Text style={styles.comingSoonIcon}>🚀</Text>
        <Text style={styles.comingSoonTitle}>Flood Risk Assessment</Text>
        <Text style={styles.comingSoonText}>
          Advanced AI flood prediction model is currently in development. This feature will provide real-time flood risk analysis based on weather data, water levels, and historical patterns.
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
        </View>
      </View>
    </View>
  );
  */

  return (
    <SafeScreen backgroundColor={Colors.deepSecurityBlue} statusBarStyle="light" edges={['top']}>
      <View style={styles.container}>
        <Navbar 
          onQRScanPress={() => handleNavbarAction('qr')}
          onNotificationPress={() => handleNavbarAction('notifications')}
          onSettingsPress={() => handleNavbarAction('settings')}
        />

        {/* QR Scanner Modal */}
        {qrScannerVisible && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center' }}>
            <QRScanner
              onSiteValidated={(siteData: any) => {
                setQRScannerVisible(false);
                // Navigate to site details or show info
                if (siteData && siteData.siteId) {
                  onNavigateToSite(siteData.siteId);
                } else {
                  Alert.alert('Invalid QR', 'Could not validate site data.');
                }
              }}
              onCancel={() => setQRScannerVisible(false)}
            />
          </View>
        )}

      {/* NotificationPanel rendering removed from HomeScreen to avoid duplicate panels.
          Navbar now handles displaying notifications near the bell icon. */}

      {/* Welcome heading and action buttons below */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.deepSecurityBlue}
            colors={[Colors.deepSecurityBlue, Colors.aquaTechBlue]}
            progressViewOffset={40}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Hero Section: greeting and quick actions */}
        {renderCompactHeader()}
        {renderFixedActions()}

        {/* Monitoring Sites Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View>
              <Text style={styles.sectionTitle}>🏗️ Monitoring Sites</Text>
              <Text style={styles.sectionSubtitle}>Overview • History • Map</Text>
            </View>
            {displaySites.length > 5 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => handleTabPress('sites')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {loading && displaySites.length === 0 ? (
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
          ) : displaySites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No monitoring sites found in your area</Text>
              <Text style={styles.emptySubtext}>Trying to load sites...</Text>
            </View>
          ) : (
            // Only show first 5 sites on home screen
            displaySites.slice(0, 5).map(renderSiteCard)
          )}
        </View>

        {/* Flood Alerts Section */}
        {renderFloodAlerts()}

        {/* Recent Readings Section */}
        {renderRecentReadings()}

        {/* AI Insights Section - Temporarily disabled until feature is ready */}
        {/* {renderAIInsights()} */}
      </ScrollView>
      
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  scrollContainer: {
    paddingTop: 5,
    paddingBottom: 0,
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
    ...createNeumorphicCard({ size: 'large', borderRadius: 15 }),
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
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Coming Soon Card Styles
  comingSoonCard: {
    ...createNeumorphicCard({ size: 'large', borderRadius: 15 }),
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: Colors.softLightGrey,
    borderLeftWidth: 6,
    borderLeftColor: Colors.aquaTechBlue,
  },
  comingSoonIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  comingSoonTitle: {
    ...NeumorphicTextStyles.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  comingSoonText: {
    ...NeumorphicTextStyles.body,
    lineHeight: 22,
    marginBottom: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  comingSoonBadge: {
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 1,
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
  // Compact Header Styles
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: Colors.deepSecurityBlue,
    marginBottom: 0,
  },
  greetingSection: {
    flex: 1,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 20,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  // Greeting Row Styles
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: Colors.aquaTechBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Fixed Actions Styles
  fixedActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: Colors.softLightGrey,
  },
  primaryActionButton: {
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.deepSecurityBlue,
  },
  primaryActionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryActionButton: {
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.aquaTechBlue,
  },
  secondaryActionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default HomeScreen;
