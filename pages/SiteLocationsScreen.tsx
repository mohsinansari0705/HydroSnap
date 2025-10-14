import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { useSiteLocations } from '../hooks/useMonitoringSites';
import { MonitoringSite } from '../services/monitoringSitesService';

interface SiteLocationsScreenProps {
  onNavigateToSite: (siteId: string) => void;
  onBack: () => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

const SiteLocationsScreen: React.FC<SiteLocationsScreenProps> = ({
  onNavigateToSite,
  onBack,
  userLocation,
}) => {
  const { locations, loading, error, refresh } = useSiteLocations(userLocation);

  const renderSiteItem = ({ item }: { item: MonitoringSite }) => (
    <TouchableOpacity
      style={[styles.siteItem, createNeumorphicCard({ size: 'medium' })]}
      onPress={() => onNavigateToSite(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.siteHeader}>
        <View style={styles.siteInfo}>
          <Text style={styles.siteName}>{item.name}</Text>
          <Text style={styles.siteLocation}>
            📍 {item.location}
          </Text>
          {item.river_name && (
            <Text style={styles.riverName}>
              🌊 {item.river_name}
            </Text>
          )}
        </View>
        
        <View style={styles.siteDetails}>
          {item.distanceFromUser && (
            <Text style={styles.distance}>
              📏 {Math.round(item.distanceFromUser / 1000 * 10) / 10} km
            </Text>
          )}
          <View style={styles.siteTypeBadge}>
            <Text style={styles.siteTypeText}>
              {item.site_type?.toUpperCase() || 'MONITORING'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.siteFooter}>
        <Text style={styles.organization}>
          🏢 {item.organization}
        </Text>
        
        <View style={styles.levelsInfo}>
          <Text style={styles.levelText}>
            ⚠️ Warning: {item.warning_level}cm
          </Text>
          <Text style={styles.levelText}>
            🚨 Danger: {item.danger_level}cm
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🗺️</Text>
      <Text style={styles.emptyTitle}>No Sites Found</Text>
      <Text style={styles.emptyText}>
        {userLocation 
          ? 'No monitoring sites found in your area' 
          : 'Enable location services to find nearby sites'}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to Load Sites</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={refresh} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Locations</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {error ? (
          renderErrorState()
        ) : (
          <FlatList
            data={locations}
            renderItem={renderSiteItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={loading} 
                onRefresh={refresh}
                colors={[Colors.aquaTechBlue]}
                tintColor={Colors.aquaTechBlue}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={loading ? null : renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Stats Footer */}
      <View style={styles.statsFooter}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{locations.length}</Text>
          <Text style={styles.statLabel}>Sites Found</Text>
        </View>
        
        {userLocation && (
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {locations.filter(site => (site.distanceFromUser || 0) <= 10000).length}
            </Text>
            <Text style={styles.statLabel}>Within 10km</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.softLightGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.deepSecurityBlue,
  },
  headerTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 20,
    color: Colors.deepSecurityBlue,
  },
  refreshButton: {
    padding: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.softLightGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 18,
    color: Colors.deepSecurityBlue,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Space for stats footer
  },
  siteItem: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  siteInfo: {
    flex: 1,
    marginRight: 16,
  },
  siteName: {
    ...NeumorphicTextStyles.heading,
    fontSize: 18,
    color: Colors.deepSecurityBlue,
    marginBottom: 6,
  },
  siteLocation: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  riverName: {
    ...NeumorphicTextStyles.caption,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
  },
  siteDetails: {
    alignItems: 'flex-end',
  },
  distance: {
    ...NeumorphicTextStyles.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  siteTypeBadge: {
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  siteTypeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
  siteFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightShadow,
    paddingTop: 12,
  },
  organization: {
    ...NeumorphicTextStyles.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  levelsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelText: {
    ...NeumorphicTextStyles.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    marginTop: 40,
    marginHorizontal: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 18,
    color: Colors.alertRed,
    marginBottom: 8,
  },
  errorText: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.deepSecurityBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.lightShadow,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.aquaTechBlue,
    marginBottom: 4,
  },
  statLabel: {
    ...NeumorphicTextStyles.caption,
    color: Colors.textSecondary,
  },
});

export default SiteLocationsScreen;