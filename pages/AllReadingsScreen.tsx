import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { MonitoringSitesService } from '../services/monitoringSitesService';
import { WaterLevelReading } from '../services/waterLevelReadingsService';
import { supabase } from '../lib/supabase';
import SafeScreen from '../components/SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';
import { useNavigation } from '../lib/NavigationContext';

interface AllReadingsScreenProps {
  onBack: () => void;
}

const AllReadingsScreen: React.FC<AllReadingsScreenProps> = ({ onBack }) => {
  // Handle Android hardware back button
  useSimpleBackHandler(onBack);
  const { navigateToReadingDetails } = useNavigation();
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readings, setReadings] = useState<WaterLevelReading[]>([]);
  const [userProfiles, setUserProfiles] = useState<{[userId: string]: string}>({});
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [allReadingsFetched, setAllReadingsFetched] = useState(false);

  // Helper function to fetch user profiles (same pattern as HomeScreen)
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

  const fetchData = useCallback(async (opts?: { isLoadMore?: boolean }) => {
    const isLoadMore = opts?.isLoadMore === true;
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingMain(true);
      }

      const currentPage = isLoadMore ? page + 1 : 0;
      const offset = currentPage * pageSize;

      console.log(`📊 Fetching readings page ${currentPage} (offset: ${offset}, limit: ${pageSize})...`);
      
      // Server-side pagination - fetch only the required page
      const paginatedReadings = await MonitoringSitesService.getAllReadings(pageSize, offset) as WaterLevelReading[];

      if (isLoadMore) {
        setReadings(prev => [...prev, ...paginatedReadings]);
        setPage(prev => prev + 1);
      } else {
        setReadings(paginatedReadings);
        setPage(0);
      }

      // Check if we've fetched all readings (less than pageSize means we're at the end)
      if (paginatedReadings.length < pageSize) {
        setAllReadingsFetched(true);
      } else {
        setAllReadingsFetched(false);
      }

      console.log(`✅ Fetched ${paginatedReadings.length} readings (page ${currentPage})`);

      // Fetch user profiles for the readings (same pattern as HomeScreen)
      const allCurrentReadings = isLoadMore ? [...readings, ...paginatedReadings] : paginatedReadings;
      if (allCurrentReadings.length > 0) {
        const uniqueUserIds = [...new Set(allCurrentReadings.map(r => r.user_id))];
        const profiles = await fetchUserProfiles(uniqueUserIds);
        setUserProfiles(prevProfiles => ({ ...prevProfiles, ...profiles }));
        console.log('✅ Fetched profiles for', Object.keys(profiles).length, 'users');
      }

    } catch (error) {
      console.error('❌ Error fetching readings:', error);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoadingMain(false);
      }
    }
  }, [page, readings]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setAllReadingsFetched(false);
    fetchData();
  };

  const handleLoadMore = () => {
    if (!loadingMore && !allReadingsFetched) {
      fetchData({ isLoadMore: true });
    }
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

  const renderReading = ({ item }: { item: WaterLevelReading }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.readingCard}
      activeOpacity={0.7}
      onPress={() => navigateToReadingDetails(item.id)}
    >
      <View style={styles.readingCardHeader}>
        <View style={styles.readingCardLeft}>
          <View style={[styles.readingStatusDot, { backgroundColor: getReadingStatusColor(item.water_level_status) }]} />
          <View style={styles.readingCardInfo}>
            <Text style={styles.readingCardTitle} numberOfLines={1}>
              {item.site_name || 'Unknown Site'}
            </Text>
            <View style={styles.readingMetaRow}>
              <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.readingCardMeta} numberOfLines={1}>
                {userProfiles[item.user_id] || 'Unknown User'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.readingCardRight}>
          <View style={[styles.readingWaterLevelBadge, { backgroundColor: getReadingStatusColor(item.water_level_status) + '15' }]}>
            <Ionicons name="water" size={16} color={getReadingStatusColor(item.water_level_status)} />
            <Text style={[styles.readingWaterLevelText, { color: getReadingStatusColor(item.water_level_status) }]}>
              {item.predicted_water_level?.toFixed(2) || 'N/A'} m
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.readingCardFooter}>
        <View style={styles.readingCardDetail}>
          <Ionicons name="camera" size={14} color={Colors.textSecondary} />
          <Text style={styles.readingCardDetailText}>
            {item.reading_method === 'photo_analysis' ? 'Photo Analysis' : 'Manual Entry'}
          </Text>
        </View>
        <View style={styles.readingCardDetail}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.readingCardDetailText}>
            {formatTimestamp(item.submission_timestamp)}
          </Text>
        </View>
        {item.water_level_status && (
          <View style={[styles.readingStatusChip, { backgroundColor: getReadingStatusColor(item.water_level_status) }]}>
            <Text style={styles.readingStatusChipText}>
              {item.water_level_status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loadingMain) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.loadingText}>Loading readings...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={72} color={Colors.textSecondary} style={{ opacity: 0.5 }} />
        <Text style={styles.emptyTitle}>No Readings Yet</Text>
        <Text style={styles.emptySubtitle}>
          Water level readings will appear here once submitted from the field
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <SafeScreen backgroundColor={Colors.softLightGrey} statusBarStyle="dark" edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.deepSecurityBlue} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>All Water Level Readings</Text>
            <Text style={styles.headerSubtitle}>
              {readings.length} reading{readings.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Readings List */}
        <FlatList
          data={readings}
          renderItem={renderReading}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loadingMain}
              onRefresh={handleRefresh}
              tintColor={Colors.aquaTechBlue}
              colors={[Colors.aquaTechBlue]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />

        {/* Load More Button (alternative to infinite scroll) */}
        {!loadingMain && !allReadingsFetched && readings.length > 0 && (
          <View style={styles.loadMoreContainer}>
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeScreen>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadMoreContainer: {
    padding: 16,
    paddingTop: 0,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.aquaTechBlue,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.aquaTechBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginRight: 6,
  },
  // Modern Reading Card Styles (matching HomeScreen)
  readingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  readingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  readingCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  readingStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 10,
  },
  readingCardInfo: {
    flex: 1,
  },
  readingCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  readingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readingCardMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  readingCardRight: {
    alignItems: 'flex-end',
  },
  readingWaterLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  readingWaterLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  readingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  readingCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readingCardDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  readingStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  readingStatusChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

export default AllReadingsScreen;
