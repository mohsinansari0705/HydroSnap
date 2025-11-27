import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/colors';
import { Profile } from '../types/profile';
import { MonitoringSitesService } from '../services/monitoringSitesService';
import { WaterLevelReading, MonitoringSite } from '../services/monitoringSitesService';
import { useNavigation } from '../lib/NavigationContext';
import SafeScreen from '../components/SafeScreen';

interface MyReadingsScreenProps {
  profile: Profile;
  onBack: () => void;
}

const MyReadingsScreen: React.FC<MyReadingsScreenProps> = ({ profile, onBack }) => {
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [latestReadings, setLatestReadings] = useState<{[siteId: string]: WaterLevelReading}>({});
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [totalSitesCount, setTotalSitesCount] = useState<number | null>(null);
  const { navigateToSite } = useNavigation();

  const fetchData = useCallback(async (opts?: { isLoadMore?: boolean }) => {
    const isLoadMore = opts?.isLoadMore === true;
    try {
      if (isLoadMore) setLoadingMore(true); else setLoadingMain(true);

      // If user has an assigned site, fetch only that site; otherwise fetch all sites
      let fetchedSites: MonitoringSite[] = [];
      if (profile.site_id) {
        const site = await MonitoringSitesService.getSiteById(profile.site_id);
        if (site) fetchedSites = [site];
      } else {
        fetchedSites = await MonitoringSitesService.getAllSites();
      }

      // remember total count so we can hide "Load more" when done
      setTotalSitesCount(fetchedSites.length);

      const start = page * pageSize;
      const limited = fetchedSites.slice(start, start + pageSize);
      setSites(prev => (page === 0 ? limited : [...prev, ...limited]));

      const siteIds = (page === 0 ? limited : [...sites, ...limited]).map(s => s.id);
      const readings = await MonitoringSitesService.getLatestReadingsForSites(siteIds);
      setLatestReadings(readings || {});

    } catch (error) {
      console.error('Error loading my readings:', error);
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoadingMain(false);
    }
  }, [profile.site_id, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadMore = async () => {
    // do not load more if already loading or we've fetched all
    if (loadingMore) return;
    if (totalSitesCount !== null && (page + 1) * pageSize >= totalSitesCount) return;
    setPage(p => p + 1);
  };

  const renderItem = ({ item }: { item: MonitoringSite }) => {
    const reading = latestReadings[item.id];
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigateToSite(item.id)}>
        <View style={styles.itemHeader}>
          <Text style={styles.siteName}>{item.name}</Text>
          <Text style={styles.timestamp}>
            {reading ? new Date(reading.submission_timestamp || '').toLocaleString() : 'No readings'}
          </Text>
        </View>
        <Text style={styles.location}>{item.location}</Text>
        {reading ? (
          <View style={styles.readingRow}>
            <Text style={styles.waterLevel}>Water Level: {reading.predicted_water_level || 0} m</Text>
            {item.danger_level && (reading.predicted_water_level || 0) >= item.danger_level && (
              <Text style={[styles.status, { color: Colors.criticalRed }]}>
                DANGER
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.noReading}>No recent readings available</Text>
        )}
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    const noMore = totalSitesCount !== null && (page + 1) * pageSize >= totalSitesCount;
    if (noMore) return null;
    return (
      <View style={{ padding: 12, alignItems: 'center' }}>
        {loadingMore ? (
          <ActivityIndicator size="small" color={Colors.aquaTechBlue} />
        ) : (
          <TouchableOpacity onPress={loadMore} style={{ padding: 10, backgroundColor: Colors.aquaTechBlue, borderRadius: 8 }}>
            <Text style={{ color: Colors.white }}>Load more</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Readings</Text>
          <View style={{width: 60}} />
        </View>

      <FlatList
        data={sites}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loadingMain} onRefresh={() => { setPage(0); fetchData(); }} />}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            {loadingMain ? (
              <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
            ) : (
              <>
                <Text style={styles.emptyText}>No sites available to show readings.</Text>
                <TouchableOpacity onPress={() => { setPage(0); fetchData(); }} style={{ marginTop: 12, padding: 10, backgroundColor: Colors.aquaTechBlue, borderRadius: 8 }}>
                  <Text style={{ color: Colors.white }}>Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
    backgroundColor: Colors.deepSecurityBlue,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: Colors.white,
  },
  title: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  item: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  location: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterLevel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  noReading: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});

export default MyReadingsScreen;
