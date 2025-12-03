import { useState, useEffect, useCallback } from 'react';
import { MonitoringSite, MonitoringSitesService } from '../services/monitoringSitesService';

interface UseMonitoringSitesOptions {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  userId?: string;
  userRole?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  skipInitialFetch?: boolean; // Performance optimization - skip initial fetch if data is cached
}

interface UseMonitoringSitesReturn {
  sites: MonitoringSite[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  todaysReadingsCount: number;
  floodAlertsCount: number;
  refresh: () => Promise<void>;
  fetchSites: () => Promise<void>;
}

/**
 * Custom hook for managing monitoring sites data
 * Handles fetching, caching, and real-time updates of monitoring sites
 */
export const useMonitoringSites = (
  options: UseMonitoringSitesOptions = {}
): UseMonitoringSitesReturn => {
  const {
    userLocation,
    userId,
    userRole,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    skipInitialFetch = false,
  } = options;

  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaysReadingsCount, setTodaysReadingsCount] = useState(0);
  const [floodAlertsCount, setFloodAlertsCount] = useState(0);

  /**
   * Fetch monitoring sites based on user role and location
   * Optimized for instant loading - shows basic data immediately, enriches in background
   */
  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      console.log('🔄 useMonitoringSites: Starting optimized site fetch...');
      const startTime = Date.now();
      
      let fetchedSites: MonitoringSite[] = [];

      // Fetch all sites (already optimized - no sorting)
      console.log('🌍 Fetching sites with instant loading optimization');
      fetchedSites = await MonitoringSitesService.getAllSites();
      
      // Set basic sites immediately for instant rendering
      const basicSites = fetchedSites.map(site => ({
        ...site,
        status: 'reading_due' as const,
        lastReading: undefined,
        isAccessible: true,
        distanceFromUser: userLocation ? MonitoringSitesService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          site.latitude,
          site.longitude
        ) : undefined
      }));
      
      console.log(`⚡ Basic sites loaded in ${Date.now() - startTime}ms - rendering immediately`);
      setSites(basicSites);

      // Enrich sites with latest readings in background (non-blocking)
      console.log('🔄 Starting background enrichment...');
      const enrichStartTime = Date.now();
      const enrichedSites = await MonitoringSitesService.enrichSitesWithReadings(fetchedSites);
      
      // Add distance calculation to enriched sites
      const enrichedWithDistance = enrichedSites.map(site => ({
        ...site,
        distanceFromUser: userLocation ? MonitoringSitesService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          site.latitude,
          site.longitude
        ) : site.distanceFromUser
      }));
      
      console.log(`✅ Enrichment completed in ${Date.now() - enrichStartTime}ms`);
      console.log(`📊 Total load time: ${Date.now() - startTime}ms for ${enrichedWithDistance.length} sites`);
      
      setSites(enrichedWithDistance);

      // Update stats
      const floodAlerts = enrichedWithDistance.filter(site => 
        site.status === 'warning' || site.status === 'danger'
      );
      setFloodAlertsCount(floodAlerts.length);

    } catch (err) {
      console.error('💥 Error fetching monitoring sites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring sites');
    }
  }, [userLocation, userId, userRole]);

  /**
   * Fetch today's readings count
   */
  const fetchTodaysReadingsCount = useCallback(async () => {
    try {
      const count = await MonitoringSitesService.getTodaysReadingsCount();
      setTodaysReadingsCount(count);
    } catch (err) {
      console.error('Error fetching today\'s readings count:', err);
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSites(),
        fetchTodaysReadingsCount()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSites, fetchTodaysReadingsCount]);

  /**
   * Initial load with connection test
   * Can be skipped for performance optimization when data is already cached
   */
  useEffect(() => {
    if (skipInitialFetch) {
      console.log('⚡ Skipping initial fetch - using cached data for better performance');
      return;
    }

    const initialLoad = async () => {
      setLoading(true);
      try {
        // First test the connection
        console.log('🚀 Starting initial data load...');
        const connectionOk = await MonitoringSitesService.testConnection();
        
        if (!connectionOk) {
          setError('Unable to connect to database. Please check your internet connection and try again.');
          return;
        }

        await Promise.all([
          fetchSites(),
          fetchTodaysReadingsCount()
        ]);
      } catch (err) {
        console.error('💥 Initial load failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, [fetchSites, fetchTodaysReadingsCount, skipInitialFetch]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    sites,
    loading,
    error,
    refreshing,
    todaysReadingsCount,
    floodAlertsCount,
    refresh,
    fetchSites,
  };
};

/**
 * Hook specifically for site locations (used in location screens)
 */
export const useSiteLocations = (userLocation?: { latitude: number; longitude: number }) => {
  const [locations, setLocations] = useState<MonitoringSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let sites: MonitoringSite[] = [];
      
      if (userLocation) {
        sites = await MonitoringSitesService.getSitesNearLocation(
          userLocation.latitude,
          userLocation.longitude,
          100 // 100km radius for site locations
        );
      } else {
        sites = await MonitoringSitesService.getAllSites();
      }

      // Sort by distance if user location is available
      if (userLocation) {
        sites.sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0));
      } else {
        sites.sort((a, b) => a.name.localeCompare(b.name));
      }

      setLocations(sites);
    } catch (err) {
      console.error('Error fetching site locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch site locations');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    error,
    refresh: fetchLocations,
  };
};

/**
 * Hook for a specific monitoring site
 */
export const useMonitoringSite = (siteId: string) => {
  const [site, setSite] = useState<MonitoringSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSite = useCallback(async () => {
    if (!siteId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedSite = await MonitoringSitesService.getSiteById(siteId);
      if (fetchedSite) {
        const enrichedSites = await MonitoringSitesService.enrichSitesWithReadings([fetchedSite]);
        setSite(enrichedSites[0] || null);
      } else {
        setSite(null);
        setError('Site not found');
      }
    } catch (err) {
      console.error('Error fetching monitoring site:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring site');
      setSite(null);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  return {
    site,
    loading,
    error,
    refresh: fetchSite,
  };
};