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
import { MonitoringSitesService, WaterLevelReading } from '../services/monitoringSitesService';
import { supabase } from '../lib/supabase';
import SafeScreen from '../components/SafeScreen';
import Card from '../components/Card';

interface AllReadingsScreenProps {
  onBack: () => void;
}

const AllReadingsScreen: React.FC<AllReadingsScreenProps> = ({ onBack }) => {
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

      console.log(`📊 Fetching readings page ${page}...`);
      
      // Fetch all readings and paginate on client side
      const allReadings = await MonitoringSitesService.getAllReadings();
      
      const start = (isLoadMore ? page + 1 : 0) * pageSize;
      const end = start + pageSize;
      const paginatedReadings = allReadings.slice(start, end);

      if (isLoadMore) {
        setReadings(prev => [...prev, ...paginatedReadings]);
        setPage(prev => prev + 1);
      } else {
        setReadings(paginatedReadings);
        setPage(0);
      }

      // Check if we've fetched all readings
      if (end >= allReadings.length) {
        setAllReadingsFetched(true);
      } else {
        setAllReadingsFetched(false);
      }

      console.log(`✅ Fetched ${paginatedReadings.length} readings (total: ${allReadings.length})`);

      // Fetch user profiles for the readings (same pattern as HomeScreen)
      const allCurrentReadings = isLoadMore ? [...readings, ...paginatedReadings] : paginatedReadings;
      if (allCurrentReadings.length > 0) {
        const uniqueUserIds = [...new Set(allCurrentReadings.map(r => r.user_id))];
        const profiles = await fetchUserProfiles(uniqueUserIds);
        setUserProfiles(profiles);
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
  }, [page]);

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

  const renderReading = ({ item }: { item: WaterLevelReading }) => (
    <Card
      key={item.id}
      type="reading"
      severity="low"
      title={item.site_name || 'Water Level Reading'}
      description={`Reading method: ${item.reading_method === 'photo_analysis' ? 'Photo Analysis' : 'Manual'}`}
      location={item.site_name}
      date={item.submission_timestamp}
      waterLevel={item.predicted_water_level}
      fieldPersonnel={userProfiles[item.user_id] || 'Unknown User'}
      onPress={() => console.log(`Reading ${item.id} pressed`)}
    />
  );

  const renderEmpty = () => {
    if (loadingMain) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.aquaTechBlue} />
          <Text style={styles.loadingText}>Loading please wait...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Readings Available</Text>
        <Text style={styles.emptySubtitle}>
          Water level readings will appear here once they are recorded
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
});

export default AllReadingsScreen;
