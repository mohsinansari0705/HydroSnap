import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Profile } from '../types/profile';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import SafeScreen from '../components/SafeScreen';
import { useMonitoringSites } from '../hooks/useMonitoringSites';
import { MonitoringSite, MonitoringSitesService } from '../services/monitoringSitesService';
import { WaterLevelReading } from '../services/waterLevelReadingsService';
import { supabase } from '../lib/supabase';
import { useSiteCache } from '../lib/SiteCacheContext';
import { useNavigation } from '../lib/NavigationContext';
import { useNotifications, useMissedReadingScheduler } from '../hooks/useNotifications';
import notificationService from '../services/notificationService';
import missedReadingScheduler from '../services/missedReadingScheduler';
import floodAlertsService, { FloodAlert } from '../services/floodAlertsService';

interface HomeScreenProps {
  profile: Profile | null;
  onNavigateToSite: (siteId: string) => void;
  onNavigateToNewReading: (siteId: string) => void;
  onNavigateToMyReadings: () => void;
  onNavigateToSiteLocations: () => void;
  onNavigateToSettings: () => void;
}

// Format role names for display
const formatRole = (role: string): string => {
  switch (role) {
    case 'field_personnel':
      return 'Field Personnel';
    case 'central_analyst':
      return 'Central Analyst';
    case 'supervisor':
      return 'Supervisor';
    case 'public':
      return 'Public User';
    default:
      return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

// Utility function to shuffle array (Fisher-Yates algorithm)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};



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
  // notification visibility moved to global navigation context
  const { toggleNotifications, navigateToProfile, navigateToMap, navigateToAllReadings, navigateToReadingDetails, navigateToFloodAlerts, navigateToAlertDetails } = useNavigation();

  // State for recent water level readings
  const [recentReadings, setRecentReadings] = useState<WaterLevelReading[]>([]);
  const [loadingReadings, setLoadingReadings] = useState<boolean>(true);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[userId: string]: string}>({});
  
  // State for instant site rendering and random display
  const [displaySitesShuffled, setDisplaySitesShuffled] = useState<MonitoringSite[]>([]);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);

  // State for flood alerts
  const [floodAlerts, setFloodAlerts] = useState<FloodAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Initialize notification system
  const { unreadCount } = useNotifications();
  useMissedReadingScheduler(true); // Enable daily missed reading checks

  // Use the site cache to prevent repeated fetching
  const { sites: cachedSites, setCachedSites, isCacheValid, clearCache } = useSiteCache();

  // Use the monitoring sites hook with optimized settings and caching
  const {
    sites,
    loading,
    error,
    refreshing,
    todaysReadingsCount,
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
  
  // Instantly show sites in random order for better UX
  useEffect(() => {
    if (displaySites.length > 0) {
      // Show cached sites immediately with random shuffle
      const shuffled = shuffleArray(displaySites);
      setDisplaySitesShuffled(shuffled);
      console.log(`[HomeScreen] 🎲 Displaying ${shuffled.length} sites in random order for better UX`);
    }
  }, [displaySites]);

  useEffect(() => {
    // Delay location fetching to improve initial load time
    const timer = setTimeout(() => {
      fetchUserLocation();
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, []);

  // Initialize notification permissions and background tasks
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Request notification permissions
        await notificationService.registerForPushNotifications();
        
        // Register background task for missed readings
        await missedReadingScheduler.registerBackgroundTask();
        
        console.log('✅ Notification system initialized');
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Helper function to fetch user profiles
  const fetchUserProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (error) {
        console.error('❌ Error fetching user profiles:', error);
        return {};
      }

      // Map user IDs to full names, similar to how profile?.full_name is used in Hero section
      const profileMap: {[userId: string]: string} = {};
      data?.forEach((profile: any) => {
        profileMap[profile.id] = profile.full_name || 'Unknown User';
      });

      return profileMap;
    } catch (error) {
      console.error('❌ Error fetching user profiles:', error);
      return {};
    }
  };

  // Fetch recent water level readings (optimized with limit)
  useEffect(() => {
    const fetchRecentReadings = async () => {
      try {
        setLoadingReadings(true);
        setReadingsError(null);
        console.log('📊 Fetching recent water level readings...');
        
        // Fetch only 5 most recent readings for home screen
        const readings = await MonitoringSitesService.getAllReadings(5, 0) as WaterLevelReading[];
        setRecentReadings(readings);
        console.log('✅ Fetched', readings.length, 'recent readings');

        // Fetch user profiles for the readings
        if (readings.length > 0) {
          const uniqueUserIds = [...new Set(readings.map(r => r.user_id))];
          const profiles = await fetchUserProfiles(uniqueUserIds);
          setUserProfiles(profiles);
          console.log('✅ Fetched profiles for', Object.keys(profiles).length, 'users');
        }
      } catch (error) {
        console.error('❌ Error fetching recent readings:', error);
        setReadingsError('Failed to load recent readings');
      } finally {
        setLoadingReadings(false);
      }
    };

    // Delay fetching to improve initial load time
    const timer = setTimeout(() => {
      fetchRecentReadings();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Fetch flood alerts
  useEffect(() => {
    const fetchFloodAlerts = async () => {
      try {
        setLoadingAlerts(true);
        setAlertsError(null);
        console.log('📊 Fetching flood alerts...');
        
        if (!profile?.id) {
          setLoadingAlerts(false);
          return;
        }

        // Fetch recent alerts (limit to 5 for home screen)
        const alerts = await floodAlertsService.getUserAlerts(profile.id);
        const recentAlerts = alerts.slice(0, 5);
        setFloodAlerts(recentAlerts);
        console.log('✅ Fetched', recentAlerts.length, 'flood alerts');
      } catch (error) {
        console.error('❌ Error fetching flood alerts:', error);
        setAlertsError('Failed to load flood alerts');
      } finally {
        setLoadingAlerts(false);
      }
    };

    // Delay fetching to improve initial load time
    const timer = setTimeout(() => {
      fetchFloodAlerts();
    }, 800);

    return () => clearTimeout(timer);
  }, [profile?.id]);

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
      setIsEnriching(true);
      console.log('[HomeScreen] Cleared cache for fresh data refresh');
      
      // Refresh sites, readings, and alerts
      await Promise.all([
        refresh(),
        (async () => {
          try {
            setLoadingReadings(true);
            const readings = await MonitoringSitesService.getAllReadings(5) as WaterLevelReading[];
            setRecentReadings(readings);
            console.log('✅ Refreshed recent readings');
            
            // Fetch user profiles
            if (readings.length > 0) {
              const uniqueUserIds = [...new Set(readings.map(r => r.user_id))];
              const profiles = await fetchUserProfiles(uniqueUserIds);
              setUserProfiles(profiles);
            }
          } catch (error) {
            console.error('❌ Error refreshing readings:', error);
          } finally {
            setLoadingReadings(false);
          }
        })(),
        (async () => {
          try {
            setLoadingAlerts(true);
            if (profile?.id) {
              const alerts = await floodAlertsService.getUserAlerts(profile.id);
              setFloodAlerts(alerts.slice(0, 5));
              console.log('✅ Refreshed flood alerts');
            }
          } catch (error) {
            console.error('❌ Error refreshing alerts:', error);
          } finally {
            setLoadingAlerts(false);
          }
        })()
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setIsEnriching(false);
    }
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
        navigateToProfile();
        break;
    }
  };

  const handleNavbarAction = (action: 'notifications' | 'profile' | 'settings') => {
    switch (action) {
      case 'notifications':
        toggleNotifications();
        break;
      case 'profile':
        navigateToProfile();
        break;
      case 'settings':
        console.log('Settings button pressed, calling onNavigateToSettings');
        onNavigateToSettings();
        break;
    }
  };

  const renderSiteCard = (site: MonitoringSite) => {
    const hasReading = !!site.lastReading;
    const isReadingDue = site.status === 'reading_due';
    
    return (
      <TouchableOpacity
        key={site.id}
        style={styles.genZCard}
        onPress={() => onNavigateToSite(site.id)}
        activeOpacity={0.6}
      >
        {/* Header Row - Title with Reading Status Badge */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.siteTitleText} numberOfLines={1}>
            {site.name}
          </Text>
          {/* Reading Status Badge */}
          {isReadingDue ? (
            <View style={styles.topDueBadge}>
              <Ionicons name="alert-circle" size={10} color={Colors.warning} />
              <Text style={styles.topDueBadgeText}>Due</Text>
            </View>
          ) : hasReading ? (
            <View style={styles.topCompleteBadge}>
              <Ionicons name="checkmark-circle" size={10} color={Colors.successGreen} />
              <Text style={styles.topCompleteBadgeText}>Updated</Text>
            </View>
          ) : (
            <View style={styles.topDueBadge}>
              <Ionicons name="alert-circle" size={10} color={Colors.warning} />
              <Text style={styles.topDueBadgeText}>Due</Text>
            </View>
          )}
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumnLayout}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {/* Location */}
            <View style={styles.infoRow}>
              <Ionicons name="location" size={12} color={Colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {site.location}
              </Text>
            </View>
            
            {/* River Name (if available) */}
            {site.river_name && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="waves" size={12} color={Colors.aquaTechBlue} />
                <Text style={styles.riverText} numberOfLines={1}>
                  {site.river_name}
                </Text>
              </View>
            )}
            
            {/* Distance */}
            <View style={styles.infoRow}>
              <Ionicons name="navigate" size={12} color={Colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {site.distanceFromUser ? (site.distanceFromUser < 500 ? `${Math.round(site.distanceFromUser)}m` : `${(site.distanceFromUser / 1000).toFixed(1)}km`) : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Right Column - Water Level */}
          <View style={styles.rightColumn}>
            {hasReading && site.lastReading ? (
              <>
                <View style={styles.levelDisplay}>
                  <Text style={styles.levelValue}>{site.lastReading.waterLevel}</Text>
                  <Text style={styles.levelUnit}>cm</Text>
                </View>
                <Text style={styles.timestampText} numberOfLines={1}>
                  {site.lastReading.timestamp}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.noDataValue}>—</Text>
                <Text style={styles.noDataLabel}>No data</Text>
              </>
            )}
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  const renderCompactHeader = () => {
    const currentHour = new Date().getHours();
    const getGreeting = () => {
      if (currentHour < 12) return 'Good Morning';
      if (currentHour < 17) return 'Good Afternoon';
      return 'Good Evening';
    };

    // Water level status check - can be used for dashboard indicators if needed
    /*
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
    */

    return (
      <View style={styles.compactHeader}>
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            {/* Avatar / Profile Photo */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGradient}>
                {profile?.profile_image_url ? (
                  <Image 
                    source={{ uri: profile.profile_image_url }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {(profile?.full_name || 'User')
                      .split(' ')
                      .map(n => n?.[0] ?? '')
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </Text>
                )}
              </View>
            </View>

            {/* Greeting + Name + subtitle */}
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingLabel}>{getGreeting()},</Text>
              <Text numberOfLines={1} style={styles.userName}>{(profile?.full_name || 'User')}</Text>
              {(profile?.role) && (<Text style={styles.userRole}>{formatRole(profile.role)}</Text>)}
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
          <TouchableOpacity 
            style={styles.quickStatItem}
            onPress={() => toggleNotifications()}
          >
            <View style={styles.alertBadgeContainer}>
              <Text style={styles.quickStatNumber}>{unreadCount}</Text>
              {unreadCount > 0 && <View style={styles.alertDot} />}
            </View>
            <Text style={styles.quickStatLabel}>Alerts</Text>
          </TouchableOpacity>
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
        <View style={styles.actionIconContainer}>
          <Ionicons name="camera" size={24} color={Colors.white} />
        </View>
        <Text style={styles.primaryActionText}>Capture Reading</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.secondaryActionButton}
        onPress={() => navigateToMap()}
      >
        <View style={styles.actionIconContainer}>
          <Ionicons name="map" size={24} color={Colors.white} />
        </View>
        <Text style={styles.secondaryActionText}>Map View</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFloodAlerts = () => {
    const getAlertDescription = (alert: FloodAlert) => {
      const firstLine = alert.message.split('\n')[0];
      return firstLine.replace(/[🚨⚠️📢📋⏰📊💧🌊📍]/g, '').trim();
    };

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderWithAction}>
          <View style={styles.sectionTitleContainer}>
            <View style={[styles.sectionIconContainer, { backgroundColor: Colors.alertRed + '15' }]}>
              <Ionicons name="alert-circle" size={22} color={Colors.alertRed} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Flood Alerts</Text>
              <Text style={styles.sectionSubtitle}>Real-time monitoring</Text>
            </View>
          </View>
          {!loadingAlerts && floodAlerts.length > 0 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => {
                console.log('Navigating to flood alerts');
                navigateToFloodAlerts();
              }}
            >
              <Text style={styles.viewAllButtonText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingAlerts ? (
          <View style={styles.modernLoadingContainer}>
            <ActivityIndicator size="large" color={Colors.alertRed} />
            <Text style={styles.modernLoadingText}>Loading alerts...</Text>
          </View>
        ) : alertsError ? (
          <View style={styles.modernErrorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.alertRed} />
            <Text style={styles.modernErrorText}>{alertsError}</Text>
            <TouchableOpacity 
              onPress={async () => {
                try {
                  setLoadingAlerts(true);
                  if (profile?.id) {
                    const alerts = await floodAlertsService.getUserAlerts(profile.id);
                    setFloodAlerts(alerts.slice(0, 5));
                    setAlertsError(null);
                  }
                } catch (error) {
                  setAlertsError('Failed to load flood alerts');
                } finally {
                  setLoadingAlerts(false);
                }
              }} 
              style={styles.modernRetryButton}
            >
              <Ionicons name="refresh" size={18} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.modernRetryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : floodAlerts.length === 0 ? (
          <View style={styles.modernEmptyContainer}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.successGreen} style={{ opacity: 0.5 }} />
            <Text style={styles.modernEmptyText}>All Clear!</Text>
            <Text style={styles.modernEmptySubtext}>No active flood alerts at this time</Text>
          </View>
        ) : (
          floodAlerts.slice(0, 5).map(alert => {
            const alertColor = alert.alert_type === 'danger' ? Colors.criticalRed : 
                               alert.alert_type === 'warning' ? Colors.warningOrange : Colors.aquaTechBlue;
            return (
              <TouchableOpacity
                key={alert.id}
                style={styles.genZCard}
                onPress={() => navigateToAlertDetails(alert.id)}
                activeOpacity={0.6}
              >
                {/* Header */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.siteTitleText} numberOfLines={1}>
                    {alert.site_name}
                  </Text>
                  {!alert.is_read && (
                    <View style={[styles.topCompleteBadge, { backgroundColor: alertColor + '20' }]}>
                      <View style={[styles.unreadDot, { backgroundColor: alertColor }]} />
                      <Text style={[styles.topCompleteBadgeText, { color: alertColor }]}>New</Text>
                    </View>
                  )}
                </View>

                {/* Two Column Layout */}
                <View style={styles.twoColumnLayout}>
                  {/* Left Column */}
                  <View style={styles.leftColumn}>
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={12} color={Colors.textSecondary} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {alert.site_location || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {(() => {
                          const date = new Date(alert.created_at);
                          const now = new Date();
                          const diffHours = Math.floor((now.getTime() - date.getTime()) / 3600000);
                          if (diffHours < 1) return 'Just now';
                          if (diffHours < 24) return `${diffHours}h ago`;
                          return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        })()}
                      </Text>
                    </View>
                    {alert.water_level && (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="waves" size={12} color={alertColor} />
                        <Text style={[styles.riverText, { color: alertColor }]} numberOfLines={1}>
                          {alert.water_level.toFixed(2)}m
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Right Column */}
                  <View style={styles.rightColumn}>
                    <View style={[styles.alertSeverityBox, { backgroundColor: alertColor + '15' }]}>
                      <Text style={[styles.alertSeverityText, { color: alertColor }]}>
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Alert Message */}
                {getAlertDescription(alert) && (
                  <Text style={styles.alertMessage} numberOfLines={2}>
                    {getAlertDescription(alert)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  const getReadingStatusColor = (status?: string) => {
    switch (status) {
      case 'safe': return Colors.successGreen;
      case 'warning': return Colors.warningOrange;
      case 'danger': return Colors.criticalRed;
      case 'critical': return Colors.darkRed;
      default: return Colors.aquaTechBlue;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderRecentReadings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderWithAction}>
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIconContainer, { backgroundColor: Colors.aquaTechBlue + '20' }]}>
            <Ionicons name="water" size={24} color={Colors.aquaTechBlue} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            <Text style={styles.sectionSubtitle}>Latest submissions from field</Text>
          </View>
        </View>
        {!loadingReadings && recentReadings.length > 0 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => {
              console.log('Navigating to all readings');
              navigateToAllReadings();
            }}
          >
            <Text style={styles.viewAllButtonText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loadingReadings ? (
        <View style={styles.modernLoadingContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.modernLoadingText}>Loading readings...</Text>
        </View>
      ) : readingsError ? (
        <View style={styles.modernErrorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.alertRed} />
          <Text style={styles.modernErrorText}>{readingsError}</Text>
          <TouchableOpacity 
            onPress={async () => {
              try {
                setLoadingReadings(true);
                const readings = await MonitoringSitesService.getAllReadings(5) as WaterLevelReading[];
                setRecentReadings(readings);
                setReadingsError(null);
                
                if (readings.length > 0) {
                  const uniqueUserIds = [...new Set(readings.map(r => r.user_id))];
                  const profiles = await fetchUserProfiles(uniqueUserIds);
                  setUserProfiles(profiles);
                }
              } catch (error) {
                setReadingsError('Failed to load recent readings');
              } finally {
                setLoadingReadings(false);
              }
            }} 
            style={styles.modernRetryButton}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.modernRetryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : recentReadings.length === 0 ? (
        <View style={styles.modernEmptyContainer}>
          <Ionicons name="document-text-outline" size={56} color={Colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={styles.modernEmptyText}>No readings yet</Text>
          <Text style={styles.modernEmptySubtext}>Readings will appear here once submitted</Text>
        </View>
      ) : (
        recentReadings.slice(0, 5).map((reading) => {
          const statusColor = getReadingStatusColor(reading.water_level_status);
          return (
            <TouchableOpacity
              key={reading.id}
              style={styles.genZCard}
              activeOpacity={0.6}
              onPress={() => {
                console.log('Navigating to reading details:', reading.id);
                navigateToReadingDetails(reading.id);
              }}
            >
              {/* Header */}
              <View style={styles.cardHeaderRow}>
                <Text style={styles.siteTitleText} numberOfLines={1}>
                  {reading.site_name || 'Unknown Site'}
                </Text>
                {reading.water_level_status && (
                  <View style={[styles.topCompleteBadge, { backgroundColor: statusColor + '20' }]}>
                    <View style={[styles.unreadDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.topCompleteBadgeText, { color: statusColor }]}>
                      {reading.water_level_status.charAt(0).toUpperCase() + reading.water_level_status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Two Column Layout */}
              <View style={styles.twoColumnLayout}>
                {/* Left Column */}
                <View style={styles.leftColumn}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-circle-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {userProfiles[reading.user_id] || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {formatTimestamp(reading.submission_timestamp)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={12} color={Colors.textSecondary} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {reading.distance_from_site ? `${reading.distance_from_site.toFixed(0)}m away` : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Right Column */}
                <View style={styles.rightColumn}>
                  <View style={styles.levelDisplay}>
                    <Text style={styles.levelValue}>
                      {reading.predicted_water_level?.toFixed(1) || '—'}
                    </Text>
                    <Text style={styles.levelUnit}>m</Text>
                  </View>
                  <Text style={styles.noDataLabel}>Water Level</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
          onNotificationPress={() => handleNavbarAction('notifications')}
          onSettingsPress={() => handleNavbarAction('settings')}
        />

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
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="water-pump" size={24} color={Colors.deepSecurityBlue} />
                {isEnriching && (
                  <View style={styles.enrichingIndicator}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.sectionTitle}>Monitoring Sites</Text>
                <Text style={styles.sectionSubtitle}>
                  {isEnriching ? 'Updating live data...' : 'Overview • History • Map'}
                </Text>
              </View>
            </View>
            {displaySitesShuffled.length > 5 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => handleTabPress('sites')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {loading && displaySitesShuffled.length === 0 ? (
            <View style={styles.modernLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.deepSecurityBlue} />
              <Text style={styles.modernLoadingText}>Loading monitoring sites...</Text>
            </View>
          ) : error ? (
            <View style={styles.modernErrorContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.alertRed} />
              <Text style={styles.modernErrorText}>Failed to load sites: {error}</Text>
              <TouchableOpacity onPress={refresh} style={styles.modernRetryButton}>
                <Ionicons name="refresh" size={18} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.modernRetryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displaySitesShuffled.length === 0 ? (
            <View style={styles.modernEmptyContainer}>
              <Ionicons name="location-outline" size={56} color={Colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.modernEmptyText}>No monitoring sites found</Text>
              <Text style={styles.modernEmptySubtext}>Sites will appear here when available</Text>
            </View>
          ) : (
            // Show first 5 sites in random order for better UX
            displaySitesShuffled.slice(0, 5).map(renderSiteCard)
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    ...NeumorphicTextStyles.bodySecondary,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Gen Z Minimalist Card Styles with 2-Column Layout
  genZCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  siteTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  // Top Corner Badges
  topDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: Colors.warning + '15',
    borderRadius: 6,
  },
  topDueBadgeText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: Colors.successGreen + '15',
    borderRadius: 6,
  },
  topCompleteBadgeText: {
    fontSize: 10,
    color: Colors.successGreen,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Two Column Layout
  twoColumnLayout: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  leftColumn: {
    flex: 1,
    gap: 6,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  riverText: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
    flex: 1,
  },
  // Right Column - Water Level
  levelDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 3,
  },
  levelValue: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1.2,
  },
  levelUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  timestampText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
  },
  noDataValue: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textSecondary,
    opacity: 0.25,
    marginBottom: 3,
  },
  noDataLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Bottom Row - Button Only
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  captureBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  // Alert Specific Styles
  alertSeverityBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertSeverityText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 8,
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
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    maxWidth: '70%',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.deepSecurityBlue + '15',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  enrichingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.aquaTechBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.aquaTechBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.aquaTechBlue + '12',
    borderRadius: 8,
    marginLeft: 8,
    gap: 2,
  },
  viewAllButtonText: {
    color: Colors.aquaTechBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  // Compact Header Styles
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 10,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: Colors.deepSecurityBlue,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  alertBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dangerOrange,
    borderWidth: 2,
    borderColor: Colors.primary,
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
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryActionButton: {
    ...createNeumorphicCard({ size: 'medium', borderRadius: 16 }),
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.aquaTechBlue,
    shadowColor: Colors.aquaTechBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },

  // Modern State Container Styles
  modernLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  modernLoadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  modernErrorContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  modernErrorText: {
    color: Colors.alertRed,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    fontSize: 15,
    fontWeight: '500',
  },
  modernRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.aquaTechBlue,
    borderRadius: 12,
    elevation: 2,
    shadowColor: Colors.aquaTechBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modernRetryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  modernEmptyContainer: {
    padding: 50,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  modernEmptyText: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  modernEmptySubtext: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },

});

export default HomeScreen;
