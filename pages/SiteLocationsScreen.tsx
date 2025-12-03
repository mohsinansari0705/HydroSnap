import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '../lib/colors';
import { NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { useMonitoringSites } from '../hooks/useMonitoringSites';
import { MonitoringSite } from '../services/monitoringSitesService';
import SafeScreen from '../components/SafeScreen';
import { useBackHandler } from '../hooks/useBackHandler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'status'>('distance');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // Enable back handler
  useBackHandler(() => {
    onBack();
    return true;
  });
  
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

  // Pagination logic
  const totalPages = Math.ceil(sortedSites.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSites = sortedSites.slice(startIndex, endIndex);

  // Reset to first page when filter or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, sortBy, searchQuery]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleFilterSelect = (value: typeof selectedFilter) => {
    setSelectedFilter(value);
    setShowFilterDropdown(false);
    setShowSortDropdown(false);
  };

  const handleSortSelect = (value: typeof sortBy) => {
    setSortBy(value);
    setShowSortDropdown(false);
    setShowFilterDropdown(false);
  };

  const getStatusColor = (status: MonitoringSite['status']) => {
    switch (status) {
      case 'normal': return Colors.validationGreen;
      case 'warning': return Colors.warning;
      case 'danger': return Colors.alertRed;
      case 'reading_due': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderSiteItem = ({ item }: { item: MonitoringSite }) => (
    <TouchableOpacity
      style={styles.siteItem}
      onPress={() => onNavigateToSite(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.siteHeader}>
        <View style={styles.siteInfo}>
          <Text style={styles.siteName}>{item.name}</Text>
          <View style={styles.siteLocationRow}>
            <Ionicons name="location" size={14} color={Colors.textSecondary} />
            <Text style={styles.siteLocation}>{item.location}</Text>
          </View>
          {item.river_name && (
            <View style={styles.riverNameRow}>
              <MaterialCommunityIcons name="waves" size={14} color={Colors.aquaTechBlue} />
              <Text style={styles.riverName}>{item.river_name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.siteDetails}>
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status === 'reading_due' ? 'Reading Due' : item.status.toUpperCase()}
              </Text>
            </View>
          )}
          {item.distanceFromUser && (
            <View style={styles.distanceRow}>
              <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.distance}>
                {Math.round(item.distanceFromUser / 1000 * 10) / 10} km
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.siteMiddle}>
        <View style={styles.siteTypeBadge}>
          <Text style={styles.siteTypeText}>
            {item.site_type?.toUpperCase() || 'MONITORING'}
          </Text>
        </View>
        <View style={styles.organizationRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.organization}>{item.organization}</Text>
        </View>
      </View>
      
      <View style={styles.siteFooter}>
        <View style={styles.levelsInfo}>
          <View style={styles.levelRow}>
            <Ionicons name="warning" size={12} color={Colors.warning} />
            <Text style={styles.levelText}>
              Warning: {item.warning_level}cm
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Ionicons name="alert-circle" size={12} color={Colors.alertRed} />
            <Text style={styles.levelText}>
              Danger: {item.danger_level}cm
            </Text>
          </View>
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
      <Ionicons name="map-outline" size={64} color={Colors.textSecondary} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Sites Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || selectedFilter !== 'all'
          ? 'Try adjusting your filters or search criteria'
          : userLocation 
            ? 'No monitoring sites found in your area' 
            : 'Enable location services to find nearby sites'}
      </Text>
      {(searchQuery || selectedFilter !== 'all') && (
        <TouchableOpacity 
          onPress={() => {
            setSearchQuery('');
            setSelectedFilter('all');
          }} 
          style={styles.resetButton}
        >
          <Text style={styles.resetButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="warning" size={64} color={Colors.alertRed} style={styles.errorIcon} />
      <Text style={styles.errorTitle}>Failed to Load Sites</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={refresh} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const filterOptions = [
    { label: 'All Sites', value: 'all' as const, iconName: 'business' as const },
    { label: 'Rivers', value: 'river' as const, iconName: 'water' as const },
    { label: 'Reservoirs', value: 'reservoir' as const, iconName: 'water-outline' as const },
    { label: 'Canals', value: 'canal' as const, iconName: 'git-merge' as const },
    { label: 'Lakes', value: 'lake' as const, iconName: 'boat' as const },
  ];

  const sortOptions = [
    { label: 'Distance', value: 'distance' as const, iconName: 'navigate' as const },
    { label: 'Name', value: 'name' as const, iconName: 'text' as const },
    { label: 'Status', value: 'status' as const, iconName: 'alert-circle' as const },
  ];

  const selectedFilterOption = filterOptions.find(opt => opt.value === selectedFilter);
  const selectedSortOption = sortOptions.find(opt => opt.value === sortBy);

  return (
    <SafeScreen edges={['top', 'left', 'right', 'bottom']} backgroundColor={Colors.white}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.deepSecurityBlue} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Site Locations</Text>
            <Text style={styles.headerSubtitle}>{sortedSites.length} sites found</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error ? (
            renderErrorState()
          ) : loading && allSites.length === 0 ? (
            renderLoadingState()
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={refresh}
                  colors={[Colors.aquaTechBlue]}
                  tintColor={Colors.aquaTechBlue}
                />
              }
              onScrollBeginDrag={() => {
                setShowFilterDropdown(false);
                setShowSortDropdown(false);
              }}
            >
              {/* Search Bar */}
              <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search sites..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={Colors.textSecondary}
                      returnKeyType="search"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchQuery !== '' && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filter and Sort Row */}
                  <View style={styles.filterSortRow}>
                    {/* Filter Dropdown */}
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity 
                        style={styles.dropdownButton}
                        onPress={() => {
                          setShowFilterDropdown(!showFilterDropdown);
                          setShowSortDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownLabelContainer}>
                          <Ionicons name={selectedFilterOption?.iconName || 'business'} size={16} color={Colors.deepSecurityBlue} style={styles.dropdownIcon} />
                          <Text style={styles.dropdownLabel}>{selectedFilterOption?.label}</Text>
                        </View>
                        <Ionicons name={showFilterDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      
                      {showFilterDropdown && (
                        <>
                          <TouchableOpacity 
                            style={styles.dropdownBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowFilterDropdown(false)}
                          />
                          <View style={styles.dropdownMenu}>
                            {filterOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                style={[
                                  styles.dropdownItem,
                                  selectedFilter === option.value && styles.dropdownItemActive
                                ]}
                                onPress={() => handleFilterSelect(option.value)}
                              >
                                <Ionicons name={option.iconName} size={18} color={selectedFilter === option.value ? Colors.deepSecurityBlue : Colors.textSecondary} style={styles.dropdownItemIcon} />
                                <Text style={[
                                  styles.dropdownItemText,
                                  selectedFilter === option.value && styles.dropdownItemTextActive
                                ]}>
                                  {option.label}
                                </Text>
                                {selectedFilter === option.value && (
                                  <Ionicons name="checkmark" size={20} color={Colors.aquaTechBlue} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </View>

                    {/* Sort Dropdown */}
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity 
                        style={styles.dropdownButton}
                        onPress={() => {
                          setShowSortDropdown(!showSortDropdown);
                          setShowFilterDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownLabelContainer}>
                          <Ionicons name={selectedSortOption?.iconName || 'navigate'} size={16} color={Colors.deepSecurityBlue} style={styles.dropdownIcon} />
                          <Text style={styles.dropdownLabel}>{selectedSortOption?.label}</Text>
                        </View>
                        <Ionicons name={showSortDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      
                      {showSortDropdown && (
                        <>
                          <TouchableOpacity 
                            style={styles.dropdownBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowSortDropdown(false)}
                          />
                          <View style={[styles.dropdownMenu, styles.dropdownMenuRight]}>
                            {sortOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                style={[
                                  styles.dropdownItem,
                                  sortBy === option.value && styles.dropdownItemActive
                                ]}
                                onPress={() => handleSortSelect(option.value)}
                              >
                                <Ionicons name={option.iconName} size={18} color={sortBy === option.value ? Colors.deepSecurityBlue : Colors.textSecondary} style={styles.dropdownItemIcon} />
                                <Text style={[
                                  styles.dropdownItemText,
                                  sortBy === option.value && styles.dropdownItemTextActive
                                ]}>
                                  {option.label}
                                </Text>
                                {sortBy === option.value && (
                                  <Ionicons name="checkmark" size={20} color={Colors.aquaTechBlue} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                </View>

              {/* Site List */}
              {paginatedSites.length === 0 ? (
                renderEmptyState()
              ) : (
                <View style={styles.sitesContainer}>
                  {paginatedSites.map((item, index) => (
                    <View key={item.id}>
                      {renderSiteItem({ item })}
                      {index < paginatedSites.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              )}

              {/* Pagination Controls */}
              {sortedSites.length > ITEMS_PER_PAGE && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === 1 && styles.paginationButtonDisabled
                    ]}
                    onPress={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={20} 
                      color={currentPage === 1 ? Colors.textSecondary : Colors.deepSecurityBlue} 
                    />
                    <Text style={[
                      styles.paginationButtonText,
                      currentPage === 1 && styles.paginationButtonTextDisabled
                    ]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                      Page {currentPage} of {totalPages}
                    </Text>
                    <Text style={styles.paginationSubtext}>
                      {startIndex + 1}-{Math.min(endIndex, sortedSites.length)} of {sortedSites.length}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === totalPages && styles.paginationButtonDisabled
                    ]}
                    onPress={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={[
                      styles.paginationButtonText,
                      currentPage === totalPages && styles.paginationButtonTextDisabled
                    ]}>
                      Next
                    </Text>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={currentPage === totalPages ? Colors.textSecondary : Colors.deepSecurityBlue} 
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom spacing for stats footer */}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>

        {/* Stats Footer */}
        <View style={styles.statsFooter}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sortedSites.length}</Text>
            <Text style={styles.statLabel}>Sites</Text>
          </View>

          {userLocation && (
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {sortedSites.filter((site: MonitoringSite) => (site.distanceFromUser || 0) <= 10000).length}
              </Text>
              <Text style={styles.statLabel}>Nearby</Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {sortedSites.filter((site: MonitoringSite) => site.status === 'danger' || site.status === 'warning').length}
            </Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
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
  content: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  sitesContainer: {
    marginBottom: 8,
  },
  siteItem: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.lightShadow + '40',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  siteInfo: {
    flex: 1,
    marginRight: 12,
  },
  siteName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginBottom: 6,
  },
  siteLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  siteLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  riverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riverName: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
  },
  siteDetails: {
    alignItems: 'flex-end',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  distance: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
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
  organizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  organization: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  levelsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    height: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIcon: {
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
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  errorIcon: {
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
  resetButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.aquaTechBlue,
  },
  resetButtonText: {
    color: Colors.aquaTechBlue,
    fontWeight: '600',
    fontSize: 14,
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
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  // Search Bar Styles
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  // Filter and Sort Row
  filterSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 16,
    zIndex: 100,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.lightShadow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 6,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 50,
    left: -1000,
    right: -1000,
    bottom: -2000,
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightShadow,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownMenuRight: {
    left: 0,
    right: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightShadow,
  },
  dropdownItemActive: {
    backgroundColor: Colors.softLightGrey,
  },
  dropdownItemIcon: {
    marginRight: 10,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: Colors.deepSecurityBlue,
    fontWeight: '700',
  },
  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.deepSecurityBlue,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  paginationButtonDisabled: {
    backgroundColor: Colors.softLightGrey,
    borderColor: Colors.lightShadow,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepSecurityBlue,
  },
  paginationButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    marginBottom: 2,
  },
  paginationSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Updated Site Item Styles
  siteMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
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