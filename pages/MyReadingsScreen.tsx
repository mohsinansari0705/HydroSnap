import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator,
  Image
} from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { waterLevelReadingsService } from '../services/waterLevelReadingsService';
import { WaterLevelReading } from '../services/waterLevelReadingsService';
import { useNavigation } from '../lib/NavigationContext';
import SafeScreen from '../components/SafeScreen';
import { useSimpleBackHandler } from '../hooks/useBackHandler';

interface MyReadingsScreenProps {
  profile: Profile;
  onBack: () => void;
}

const MyReadingsScreen: React.FC<MyReadingsScreenProps> = ({ profile, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readings, setReadings] = useState<WaterLevelReading[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const { navigateToReadingDetails } = useNavigation();

  useSimpleBackHandler(onBack);

  const fetchReadings = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (!profile.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const currentPage = isRefresh ? 0 : page;
      const offset = currentPage * pageSize;
      
      const { readings: fetchedReadings, total } = await waterLevelReadingsService.getUserReadings(
        profile.id,
        pageSize,
        offset
      );

      if (isRefresh) {
        setReadings(fetchedReadings);
        setPage(0);
      } else if (isLoadMore) {
        setReadings(prev => [...prev, ...fetchedReadings]);
      } else {
        setReadings(fetchedReadings);
      }

      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching readings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [profile.id, page]);

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleRefresh = () => {
    fetchReadings(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || readings.length >= totalCount) return;
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (page > 0) {
      fetchReadings(false, true);
    }
  }, [page]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'safe': return Colors.successGreen;
      case 'warning': return Colors.warningOrange;
      case 'danger': return Colors.criticalRed;
      case 'critical': return Colors.darkRed;
      default: return Colors.textSecondary;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderItem = ({ item }: { item: WaterLevelReading }) => {
    const statusColor = getStatusColor(item.water_level_status);

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigateToReadingDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Thumbnail */}
          {item.photo_url && (
            <Image 
              source={{ uri: item.photo_url }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}

          {/* Content */}
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={styles.siteName} numberOfLines={1}>
                {item.site_name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {item.water_level_status?.toUpperCase() || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.waterLevelRow}>
              <Text style={styles.waterLevelLabel}>Water Level</Text>
              <Text style={styles.waterLevelValue}>
                {item.predicted_water_level?.toFixed(2) || 'N/A'} m
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.metaInfo}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.distance_from_site !== null && item.distance_from_site !== undefined 
                    ? `${item.distance_from_site.toFixed(0)}m from site`
                    : 'Location verified'}
                </Text>
              </View>
              <Text style={styles.timestamp}>
                {formatDate(item.submission_timestamp)}
              </Text>
            </View>

            {item.manual_override && (
              <View style={styles.overrideBadge}>
                <Text style={styles.overrideText}>⚠️ Manual Override</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Arrow */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    if (readings.length >= totalCount) return null;
    
    return (
      <View style={styles.footerContainer}>
        {loadingMore ? (
          <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
        ) : (
          <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ListEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.emptyText}>Loading your readings...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Readings Yet</Text>
        <Text style={styles.emptyText}>
          You haven't submitted any water level readings yet.
        </Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const ListHeader = () => {
    if (readings.length === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total Readings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {readings.filter(r => r.water_level_status === 'safe').length}
          </Text>
          <Text style={styles.statLabel}>Safe</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {readings.filter(r => r.water_level_status === 'warning' || r.water_level_status === 'danger').length}
          </Text>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Readings</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* List */}
        <FlatList
          data={readings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[Colors.aquaTechBlue]}
              tintColor={Colors.aquaTechBlue}
            />
          }
          showsVerticalScrollIndicator={false}
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
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.aquaTechBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.softLightGrey,
    marginHorizontal: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginTop: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },
  waterLevelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  waterLevelLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  waterLevelValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.aquaTechBlue,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  overrideBadge: {
    marginTop: 6,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  overrideText: {
    fontSize: 10,
    color: Colors.warningOrange,
    fontWeight: '600',
  },
  arrowContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
  },
  loadMoreText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: Colors.aquaTechBlue,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
  },
  refreshButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyReadingsScreen;
