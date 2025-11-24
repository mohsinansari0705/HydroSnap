import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import SafeScreen from '../components/SafeScreen';

interface SiteDetailsScreenProps {
  siteId: string;
  onNavigateBack: () => void;
  onNavigateToNewReading: (siteId: string) => void;
}

interface SiteDetails {
  id: string;
  name: string;
  location: string;
  coordinates: { latitude: number; longitude: number };
  status: 'normal' | 'warning' | 'danger' | 'reading_due';
  currentWaterLevel?: number;
  dangerLevel: number;
  warningLevel: number;
  safeLevel: number;
  lastReading?: {
    waterLevel: number;
    timestamp: string;
    operator: string;
    photoUrl?: string;
  };
  qrCode: string;
  geofenceRadius: number;
}

interface ReadingHistory {
  id: string;
  waterLevel: number;
  timestamp: string;
  operator: string;
  status: 'normal' | 'warning' | 'danger';
}

const SiteDetailsScreen: React.FC<SiteDetailsScreenProps> = ({
  siteId,
  onNavigateBack,
  onNavigateToNewReading,
}) => {
  const [siteDetails, setSiteDetails] = useState<SiteDetails | null>(null);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'map'>('overview');

  useEffect(() => {
    fetchSiteDetails();
    fetchReadingHistory();
  }, [siteId]);

  const fetchSiteDetails = async () => {
    // TODO: Replace with actual API call
    const mockSiteDetails: SiteDetails = {
      id: siteId,
      name: 'Yamuna River - Palla',
      location: 'Delhi, India',
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      status: 'normal',
      currentWaterLevel: 142.5,
      dangerLevel: 145.0,
      warningLevel: 140.0,
      safeLevel: 135.0,
      lastReading: {
        waterLevel: 142.5,
        timestamp: '2025-10-05T10:30:00Z',
        operator: 'Field Officer Ram Kumar',
      },
      qrCode: 'YAM_PAL_001',
      geofenceRadius: 125,
    };
    setSiteDetails(mockSiteDetails);
  };

  const fetchReadingHistory = async () => {
    // TODO: Replace with actual API call
    const mockHistory: ReadingHistory[] = [
      {
        id: '1',
        waterLevel: 142.5,
        timestamp: '2025-10-05T10:30:00Z',
        operator: 'Field Officer Ram Kumar',
        status: 'normal',
      },
      {
        id: '2',
        waterLevel: 141.2,
        timestamp: '2025-10-05T06:00:00Z',
        operator: 'Auto Sensor',
        status: 'normal',
      },
      {
        id: '3',
        waterLevel: 143.8,
        timestamp: '2025-10-04T18:00:00Z',
        operator: 'Field Officer Priya Singh',
        status: 'warning',
      },
      {
        id: '4',
        waterLevel: 139.5,
        timestamp: '2025-10-04T12:00:00Z',
        operator: 'Auto Sensor',
        status: 'normal',
      },
    ];
    setReadingHistory(mockHistory);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchSiteDetails(), fetchReadingHistory()]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getWaterLevelStatus = (level: number) => {
    if (!siteDetails) return 'normal';
    if (level >= siteDetails.dangerLevel) return 'danger';
    if (level >= siteDetails.warningLevel) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'danger':
        return Colors.alertRed;
      case 'warning':
        return Colors.warning;
      case 'normal':
      default:
        return Colors.validationGreen;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHeader = () => (
    <View style={[styles.header, createNeumorphicCard({ size: 'medium' })]}>
      <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, NeumorphicTextStyles.heading]}>
          {siteDetails?.name}
        </Text>
        <Text style={[styles.headerSubtitle, NeumorphicTextStyles.caption]}>
          📍 {siteDetails?.location}
        </Text>
      </View>
    </View>
  );

  const renderCurrentStatus = () => {
    if (!siteDetails?.currentWaterLevel) return null;

    const status = getWaterLevelStatus(siteDetails.currentWaterLevel);
    const statusColor = getStatusColor(status);

    return (
      <View style={[styles.statusCard, createNeumorphicCard({ size: 'medium' })]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusTitle, NeumorphicTextStyles.subheading]}>
            Current Water Level
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.waterLevelDisplay, { color: statusColor }]}>
          {siteDetails.currentWaterLevel} cm
        </Text>

        <View style={styles.levelsInfo}>
          <View style={styles.levelItem}>
            <View style={[styles.levelIndicator, { backgroundColor: Colors.alertRed }]} />
            <Text style={styles.levelText}>Danger: {siteDetails.dangerLevel} cm</Text>
          </View>
          <View style={styles.levelItem}>
            <View style={[styles.levelIndicator, { backgroundColor: Colors.warning }]} />
            <Text style={styles.levelText}>Warning: {siteDetails.warningLevel} cm</Text>
          </View>
          <View style={styles.levelItem}>
            <View style={[styles.levelIndicator, { backgroundColor: Colors.validationGreen }]} />
            <Text style={styles.levelText}>Safe: {siteDetails.safeLevel} cm</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLastReading = () => {
    if (!siteDetails?.lastReading) return null;

    return (
      <View style={[styles.lastReadingCard, createNeumorphicCard({ size: 'medium' })]}>
        <Text style={[styles.cardTitle, NeumorphicTextStyles.subheading]}>
          Last Reading Details
        </Text>
        
        <View style={styles.readingDetails}>
          <View style={styles.readingRow}>
            <Text style={styles.readingLabel}>Timestamp:</Text>
            <Text style={styles.readingValue}>
              {formatTimestamp(siteDetails.lastReading.timestamp)}
            </Text>
          </View>
          <View style={styles.readingRow}>
            <Text style={styles.readingLabel}>Operator:</Text>
            <Text style={styles.readingValue}>{siteDetails.lastReading.operator}</Text>
          </View>
          <View style={styles.readingRow}>
            <Text style={styles.readingLabel}>QR Code:</Text>
            <Text style={styles.readingValue}>{siteDetails.qrCode}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, createNeumorphicCard({ size: 'small' })]}>
      {(['overview', 'history', 'map'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            selectedTab === tab && styles.activeTab,
          ]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text style={[
            styles.tabText,
            selectedTab === tab && styles.activeTabText,
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderHistory = () => (
    <View style={[styles.historyCard, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.cardTitle, NeumorphicTextStyles.subheading]}>
        Reading History
      </Text>
      
      {readingHistory.map((reading) => (
        <View key={reading.id} style={styles.historyItem}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyLevel, { color: getStatusColor(reading.status) }]}>
              {reading.waterLevel} cm
            </Text>
            <View style={[
              styles.historyStatus,
              { backgroundColor: getStatusColor(reading.status) }
            ]}>
              <Text style={styles.historyStatusText}>
                {reading.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.historyTime}>
            {formatTimestamp(reading.timestamp)}
          </Text>
          <Text style={styles.historyOperator}>
            By: {reading.operator}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderMapView = () => (
    <View style={[styles.mapCard, createNeumorphicCard({ size: 'medium' })]}>
      <Text style={[styles.cardTitle, NeumorphicTextStyles.subheading]}>
        Location & Geofence
      </Text>
      
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>🗺️</Text>
        <Text style={styles.mapPlaceholderSubtext}>Map View Coming Soon</Text>
      </View>

      <View style={styles.locationInfo}>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Coordinates:</Text>
          <Text style={styles.locationValue}>
            {siteDetails?.coordinates.latitude.toFixed(6)}, {siteDetails?.coordinates.longitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Geofence Radius:</Text>
          <Text style={styles.locationValue}>{siteDetails?.geofenceRadius}m</Text>
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <>
            {renderCurrentStatus()}
            {renderLastReading()}
          </>
        );
      case 'history':
        return renderHistory();
      case 'map':
        return renderMapView();
      default:
        return null;
    }
  };

  if (!siteDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading site details...</Text>
      </View>
    );
  }

  return (
    <SafeScreen>
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

      {/* New Reading Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.newReadingButton, createNeumorphicCard({ size: 'medium' })]}
          onPress={() => onNavigateToNewReading(siteId)}
        >
          <Text style={styles.newReadingButtonText}>📸 Take New Reading</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    margin: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.deepSecurityBlue,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.deepSecurityBlue,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
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
  statusCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
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
  waterLevelDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  levelsInfo: {
    gap: 8,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  levelText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lastReadingCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
    marginBottom: 16,
  },
  readingDetails: {
    gap: 12,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  readingValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  historyCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  historyItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  historyOperator: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  mapCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: Colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  locationInfo: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
  },
  newReadingButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: Colors.deepSecurityBlue,
  },
  newReadingButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default SiteDetailsScreen;