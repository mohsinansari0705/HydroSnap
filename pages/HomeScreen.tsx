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

interface MonitoringSite {
  id: string;
  name: string;
  location: string;
  status: 'normal' | 'warning' | 'danger' | 'reading_due';
  lastReading?: {
    waterLevel: number;
    timestamp: string;
    operator: string;
  };
  distanceFromUser?: number; // in meters
  isAccessible: boolean;
  qrCode: string;
}

interface HomeScreenProps {
  profile: Profile;
  onNavigateToSite: (siteId: string) => void;
  onNavigateToNewReading: (siteId: string) => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
}

const mockSites: MonitoringSite[] = [
  {
    id: 'site_1',
    name: 'Yamuna River - Palla',
    location: 'Delhi, India',
    status: 'normal',
    lastReading: {
      waterLevel: 142.5,
      timestamp: '2 hours ago',
      operator: 'Field Officer',
    },
    distanceFromUser: 1200,
    isAccessible: true,
    qrCode: 'YAM_PAL_001',
  },
  {
    id: 'site_2',
    name: 'Ganga River - Ganga Canal',
    location: 'Muradnagar, UP',
    status: 'reading_due',
    lastReading: {
      waterLevel: 156.8,
      timestamp: '6 hours ago',
      operator: 'System Auto',
    },
    distanceFromUser: 850,
    isAccessible: true,
    qrCode: 'GAN_MUR_002',
  },
  {
    id: 'site_3',
    name: 'Hindon River',
    location: 'Ghaziabad, UP',
    status: 'danger',
    lastReading: {
      waterLevel: 178.2,
      timestamp: 'Just now',
      operator: 'Emergency Team',
    },
    distanceFromUser: 2100,
    isAccessible: false,
    qrCode: 'HIN_GHA_003',
  },
  {
    id: 'site_4',
    name: 'Gomti Barrage',
    location: 'Lucknow, UP',
    status: 'normal',
    lastReading: {
      waterLevel: 134.7,
      timestamp: 'Just now',
      operator: 'Auto Sensor',
    },
    distanceFromUser: 450,
    isAccessible: true,
    qrCode: '4CAF130',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  onNavigateToSite,
  onNavigateToNewReading,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [sites] = useState<MonitoringSite[]>(mockSites);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // TODO: Get user location and fetch nearby sites
    fetchUserLocation();
    fetchMonitoringSites();
  }, []);

  const fetchUserLocation = async () => {
    // TODO: Implement location fetching
    console.log('Fetching user location...');
  };

  const fetchMonitoringSites = async () => {
    // TODO: Fetch sites from API based on user role and location
    console.log('Fetching monitoring sites...');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMonitoringSites();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
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
    return site.isAccessible && (site.distanceFromUser ?? 0) <= 500; // Within 500 meters
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
          <Text style={styles.statusText}>{getStatusText(site.status)}</Text>
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

  const renderHeader = () => (
    <View style={[styles.header, createNeumorphicCard({ size: 'medium' })]}>
      <View style={styles.headerContent}>
        <View>
          <Text style={[styles.greeting, NeumorphicTextStyles.heading]}>
            Hello, {profile.full_name.split(' ')[0]} 👋
          </Text>
          <Text style={[styles.roleLabel, NeumorphicTextStyles.caption]}>
            {profile.role.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, createNeumorphicCard({ size: 'small' })]}
            onPress={onNavigateToProfile}
          >
            <Text style={styles.headerButtonIcon}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, createNeumorphicCard({ size: 'small' })]}
            onPress={onNavigateToSettings}
          >
            <Text style={styles.headerButtonIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderQuickStats = () => {
    const totalSites = sites.length;
    const dangerSites = sites.filter(s => s.status === 'danger').length;
    const overdueSites = sites.filter(s => s.status === 'reading_due').length;

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, NeumorphicTextStyles.heading]}>{totalSites}</Text>
          <Text style={[styles.statLabel, NeumorphicTextStyles.caption]}>Total Sites</Text>
        </View>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, NeumorphicTextStyles.heading, { color: Colors.alertRed }]}>
            {dangerSites}
          </Text>
          <Text style={[styles.statLabel, NeumorphicTextStyles.caption]}>High Alert</Text>
        </View>
        <View style={[styles.statCard, createNeumorphicCard({ size: 'small' })]}>
          <Text style={[styles.statValue, NeumorphicTextStyles.heading, { color: Colors.warning }]}>
            {overdueSites}
          </Text>
          <Text style={[styles.statLabel, NeumorphicTextStyles.caption]}>Overdue</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderQuickStats()}
        
        <Text style={[styles.sectionTitle, NeumorphicTextStyles.heading]}>
          Monitoring Sites
        </Text>
        
        {sites.map(renderSiteCard)}
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
  roleLabel: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
    marginBottom: 16,
    marginLeft: 4,
  },
  siteCard: {
    padding: 20,
    marginBottom: 16,
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
  statusText: {
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
});

export default HomeScreen;