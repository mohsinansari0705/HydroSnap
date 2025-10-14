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
  } = options;

  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaysReadingsCount, setTodaysReadingsCount] = useState(0);
  const [floodAlertsCount, setFloodAlertsCount] = useState(0);

  /**
   * Fetch monitoring sites based on user role and location
   */
  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      console.log('🔄 useMonitoringSites: Starting to fetch sites...');
      
      let fetchedSites: MonitoringSite[] = [];

      // For now, let's simplify and always fetch all sites to debug the issue
      console.log('🌍 Fetching all sites (simplified for debugging)');
      fetchedSites = await MonitoringSitesService.getAllSites();
      
      // Add distance calculation if user location is available
      if (userLocation) {
        console.log('📍 Adding distance calculations for user location:', userLocation);
        fetchedSites = fetchedSites.map(site => ({
          ...site,
          distanceFromUser: MonitoringSitesService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            site.latitude,
            site.longitude
          )
        }));
      }

      console.log('📦 Raw sites fetched:', fetchedSites.length);

      // Enrich sites with latest readings and status
      console.log('✨ Enriching sites with readings...');
      const enrichedSites = await MonitoringSitesService.enrichSitesWithReadings(fetchedSites);
      
      console.log('🎯 Final enriched sites:', enrichedSites.length);
      console.log('📋 Sample enriched site:', enrichedSites[0] ? {
        id: enrichedSites[0].id,
        name: enrichedSites[0].name,
        status: enrichedSites[0].status,
        hasLastReading: !!enrichedSites[0].lastReading
      } : 'No sites');

      setSites(enrichedSites);

      // Update stats
      const floodAlerts = enrichedSites.filter(site => 
        site.status === 'warning' || site.status === 'danger'
      );
      setFloodAlertsCount(floodAlerts.length);
      
      console.log('🚨 Flood alerts count:', floodAlerts.length);

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
   */
  useEffect(() => {
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
  }, [fetchSites, fetchTodaysReadingsCount]);

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
 * Hook specifically for site locations (used in sidebar navigation)
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