import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../lib/colors';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { useMonitoringSites } from '../hooks/useMonitoringSites';
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
  console.log('SiteLocationsScreen: Component loaded');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'river' | 'reservoir' | 'canal' | 'lake'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'status'>('name');
  
  const {
    sites: allSites,
    loading,
    error,
    refreshing,
    refresh,
  } = useMonitoringSites({
    ...(userLocation && { userLocation }),
    autoRefresh: false,
  });

  // Filter and search sites
  const filteredSites = allSites.filter(site => {
    // Search query filter
    const matchesSearch = searchQuery === '' || 
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (site.river_name && site.river_name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Site type filter
    const matchesFilter = selectedFilter === 'all' || site.site_type === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  // Sort sites
  const sortedSites = filteredSites.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'distance':
        return (a.distanceFromUser || 0) - (b.distanceFromUser || 0);
      case 'status':
        const statusOrder = { danger: 0, warning: 1, reading_due: 2, normal: 3 };
        return statusOrder[a.status || 'normal'] - statusOrder[b.status || 'normal'];
      default:
        return 0;
    }
  });

  const getStatusColor = (status: MonitoringSite['status']) => {
    switch (status) {
      case 'normal': return Colors.validationGreen;
      case 'warning': return Colors.warning;
      case 'danger': return Colors.alertRed;
      case 'reading_due': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderFilterChip = (label: string, value: typeof selectedFilter, icon: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.filterChip,
        selectedFilter === value && styles.filterChipActive
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={styles.filterChipIcon}>{icon}</Text>
      <Text style={[
        styles.filterChipText,
        selectedFilter === value && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          )}
          {item.distanceFromUser && (
            <Text style={styles.distance}>
              📏 {Math.round(item.distanceFromUser / 1000 * 10) / 10} km
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.siteMiddle}>
        <View style={styles.siteTypeBadge}>
          <Text style={styles.siteTypeText}>
            {item.site_type?.toUpperCase() || 'MONITORING'}
          </Text>
        </View>
        <Text style={styles.organization}>
          🏢 {item.organization}
        </Text>
      </View>
      
      <View style={styles.siteFooter}>
        <View style={styles.levelsInfo}>
          <Text style={styles.levelText}>
            ⚠️ Warning: {item.warning_level}cm
          </Text>
          <Text style={styles.levelText}>
            🚨 Danger: {item.danger_level}cm
          </Text>
        </View>
        {item.lastReading && (
          <Text style={styles.lastReading}>
            Last: {item.lastReading.waterLevel}cm ({item.lastReading.timestamp})
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
      <Text style={styles.loadingTitle}>Loading Sites...</Text>
      <Text style={styles.loadingText}>
        Fetching monitoring sites from database
      </Text>
    </View>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Locations ({sortedSites.length})</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {error ? (
          renderErrorState()
        ) : loading && allSites.length === 0 ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={sortedSites}
            renderItem={renderSiteItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={refresh}
                colors={[Colors.aquaTechBlue]}
                tintColor={Colors.aquaTechBlue}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListHeaderComponent={
              <>
                {/* Search and Filters - now scrollable */}
                <View style={styles.searchSection}>
                  {/* Search Bar */}
                  <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search sites by name, location, or river..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={Colors.textSecondary}
                      numberOfLines={1}
                    />
                    {searchQuery !== '' && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={styles.clearIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filter Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
                    {renderFilterChip('All Sites', 'all', '🏗️')}
                    {renderFilterChip('Rivers', 'river', '🌊')}
                    {renderFilterChip('Reservoirs', 'reservoir', '🏞️')}
                    {renderFilterChip('Canals', 'canal', '🚰')}
                    {renderFilterChip('Lakes', 'lake', '🏔️')}
                  </ScrollView>

                  {/* Sort Options */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContainer}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <TouchableOpacity
                      style={[styles.sortChip, sortBy === 'name' && styles.sortChipActive]}
                      onPress={() => setSortBy('name')}
                    >
                      <Text style={[styles.sortChipText, sortBy === 'name' && styles.sortChipTextActive]}>
                        Name
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortChip, sortBy === 'distance' && styles.sortChipActive]}
                      onPress={() => setSortBy('distance')}
                    >
                      <Text style={[styles.sortChipText, sortBy === 'distance' && styles.sortChipTextActive]}>
                        Distance
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortChip, sortBy === 'status' && styles.sortChipActive]}
                      onPress={() => setSortBy('status')}
                    >
                      <Text style={[styles.sortChipText, sortBy === 'status' && styles.sortChipTextActive]}>
                        Status
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
                <View style={{ height: 16 }} />
              </>
            }
          />
        )}
      </View>

      {/* Stats Footer */}
      <View style={styles.statsFooter}>
        <View style={styles.statItem}>
          <View style={styles.statCircle}>
            <Text style={styles.statNumber}>{sortedSites.length}</Text>
          </View>
          <Text style={styles.statLabel}>Sites Found</Text>
        </View>

        {userLocation && (
          <View style={styles.statItem}>
            <View style={styles.statCircle}>
              <Text style={styles.statNumber}>
                {sortedSites.filter((site: MonitoringSite) => (site.distanceFromUser || 0) <= 10000).length}
              </Text>
            </View>
            <Text style={styles.statLabel}>Within 10km</Text>
          </View>
        )}

        <View style={styles.statItem}>
          <View style={styles.statCircle}>
            <Text style={styles.statNumber}>
              {sortedSites.filter((site: MonitoringSite) => site.status === 'danger' || site.status === 'warning').length}
            </Text>
          </View>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    backButton: {
      padding: 8,
      marginRight: 8,
      borderRadius: 8,
      backgroundColor: Colors.softLightGrey,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      backgroundColor: Colors.softLightGrey,
    },
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
    paddingTop: 40, // Account for status bar
  },
  // Removed duplicate header style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.deepSecurityBlue,
    fontWeight: 'bold',
    textShadowColor: Colors.deepSecurityBlue,
    textShadowRadius: 2,
    marginTop: -6,
  },
  headerTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 20,
    color: Colors.deepSecurityBlue,
    marginLeft: 8,
  },
  // Removed refreshButton and refreshIcon styles
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  levelsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelText: {
    ...NeumorphicTextStyles.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    ...createNeumorphicCard({ size: 'large', borderRadius: 20 }),
    marginTop: 40,
    marginHorizontal: 20,
  },
  loadingTitle: {
    ...NeumorphicTextStyles.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
    ...NeumorphicTextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  statCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: Colors.deepSecurityBlue,
    shadowColor: Colors.lightShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  statLabel: {
    ...NeumorphicTextStyles.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  // Search and Filter Styles
  searchSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  clearIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
    padding: 4,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.aquaTechBlue,
    borderColor: Colors.deepSecurityBlue,
  },
  filterChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginRight: 12,
  },
  sortChip: {
    backgroundColor: Colors.softLightGrey,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: Colors.deepSecurityBlue,
    borderColor: Colors.aquaTechBlue,
  },
  sortChipText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  // Updated Site Item Styles
  siteMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
  lastReading: {
    ...NeumorphicTextStyles.caption,
    fontSize: 11,
    color: Colors.aquaTechBlue,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default SiteLocationsScreen;