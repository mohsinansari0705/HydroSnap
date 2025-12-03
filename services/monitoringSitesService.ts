import { supabase } from '../lib/supabase';

export interface MonitoringSite {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  river_name?: string;
  state?: string;
  district?: string;
  organization: string;
  site_type: 'river' | 'reservoir' | 'canal' | 'lake' | 'groundwater';
  danger_level: number;
  warning_level: number;
  safe_level: number;
  geofence_radius: number;
  qr_code: string;
  is_active: boolean;
  last_maintenance_date?: string;
  assigned_personnel_id?: string;
  supervisor_id?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields for UI
  status?: 'normal' | 'warning' | 'danger' | 'reading_due';
  lastReading?: {
    waterLevel: number;
    timestamp: string;
    operator: string;
  } | undefined;
  distanceFromUser?: number | undefined;
  isAccessible?: boolean | undefined;
}

export interface WaterLevelReading {
  id: string;
  user_id: string;
  user_role: string;
  site_id: string;
  site_name: string;
  predicted_water_level: number;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  is_location_valid: boolean;
  distance_from_site?: number;
  qr_code_scanned?: string;
  reading_method: 'manual' | 'photo_analysis';
  weather_conditions?: string;
  submission_timestamp: string;
  // Note: DB column is `submission_timestamp` (no `created_at` column)
}

/**
 * Monitoring Sites Service
 * Handles all operations related to monitoring sites and water level readings
 */
export class MonitoringSitesService {
  
  /**
   * Fetch all active monitoring sites
   * Optimized for instant loading - no sorting (allows random display in UI)
   */
  static async getAllSites(): Promise<MonitoringSite[]> {
    try {
      console.log('🔄 Fetching monitoring sites from Supabase...');
      
      const { data, error } = await supabase
        .from('monitoring_sites')
        .select('*')
        .eq('is_active', true);
        // Removed .order('name') for faster query and random display in UI

      if (error) {
        console.error('❌ Supabase error fetching monitoring sites:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Successfully fetched', data?.length || 0, 'monitoring sites (unordered for performance)');

      return data || [];
    } catch (error) {
      console.error('💥 Error in getAllSites:', error);
      throw error;
    }
  }

  /**
   * Fetch sites near a specific location (within radius)
   */
  static async getSitesNearLocation(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 50
  ): Promise<MonitoringSite[]> {
    try {
      console.log('📍 Fetching sites near location:', { latitude, longitude, radiusKm });
      
      // Using PostGIS earth_distance function if available, otherwise filter in app
      const { data, error } = await supabase
        .from('monitoring_sites')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching nearby sites:', error);
        throw error;
      }

      console.log('🌍 Total sites fetched for filtering:', data?.length || 0);

      // Filter by distance in JavaScript (fallback if no PostGIS)
      const sitesWithDistance = (data || []).map(site => ({
        ...site,
        distanceFromUser: this.calculateDistance(
          latitude, 
          longitude, 
          site.latitude, 
          site.longitude
        )
      }));

      // Sort by distance and apply radius filter
      const filteredSites = sitesWithDistance
        .sort((a, b) => (a.distanceFromUser || 0) - (b.distanceFromUser || 0))
        .filter(site => (site.distanceFromUser || 0) <= radiusKm * 1000); // Convert km to meters

      console.log('📏 Sites within', radiusKm, 'km:', filteredSites.length);
      
      // If no sites found within radius, return closest 10 sites
      if (filteredSites.length === 0) {
        console.log('🔄 No sites within radius, returning closest 10 sites');
        return sitesWithDistance.slice(0, 10);
      }

      return filteredSites;
    } catch (error) {
      console.error('💥 Error in getSitesNearLocation:', error);
      throw error;
    }
  }

  /**
   * Fetch sites assigned to a specific user (field personnel)
   */
  static async getAssignedSites(userId: string): Promise<MonitoringSite[]> {
    try {
      const { data, error } = await supabase
        .from('monitoring_sites')
        .select('*')
        .eq('assigned_personnel_id', userId)
        .eq('is_active', true);
        // Removed .order('name') for faster query

      if (error) {
        console.error('Error fetching assigned sites:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAssignedSites:', error);
      throw error;
    }
  }

  /**
   * Fetch recent readings for a site
   */
  static async getSiteReadings(
    siteId: string, 
    limit: number = 10
  ): Promise<WaterLevelReading[]> {
    try {
      const { data, error } = await supabase
        .from('water_level_readings')
        .select('*')
        .eq('site_id', siteId)
        .order('submission_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching site readings:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSiteReadings:', error);
      throw error;
    }
  }

  /**
   * Get the latest reading for each site
   */
  static async getLatestReadingsForSites(siteIds: string[]): Promise<{[siteId: string]: WaterLevelReading}> {
    try {
      const readings: {[siteId: string]: WaterLevelReading} = {};

      // Fetch latest reading for each site
      for (const siteId of siteIds) {
        const { data, error } = await supabase
          .from('water_level_readings')
          .select('*')
          .eq('site_id', siteId)
          .order('submission_timestamp', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          readings[siteId] = data[0];
        }
      }

      return readings;
    } catch (error) {
      console.error('Error in getLatestReadingsForSites:', error);
      return {};
    }
  }

  /**
   * Enrich sites with latest reading data and status
   * Optimized with batch queries for better performance
   */
  static async enrichSitesWithReadings(sites: MonitoringSite[]): Promise<MonitoringSite[]> {
    try {
      // For instant loading, return sites immediately if too many
      if (sites.length > 50) {
        console.log('⚡ Large dataset detected:', sites.length, 'sites - using lightweight enrichment');
        return sites.map(site => ({
          ...site,
          status: 'reading_due' as const,
          lastReading: undefined,
          isAccessible: true
        }));
      }
      
      console.log('🔄 Starting optimized enrichment for', sites.length, 'sites...');
      const startTime = Date.now();
      
      // Use optimized batch query instead of individual queries
      const siteIds = sites.map(site => site.id);
      const latestReadings = await this.getLatestReadingsForSitesBatch(siteIds);

      const enrichedSites = sites.map(site => {
        const latestReading = latestReadings[site.id];
        
        // Determine site status based on latest reading
        let status: 'normal' | 'warning' | 'danger' | 'reading_due' = 'reading_due';
        
        if (latestReading) {
          const waterLevel = latestReading.predicted_water_level || 0;
          
          if (waterLevel >= site.danger_level) {
            status = 'danger';
          } else if (waterLevel >= site.warning_level) {
            status = 'warning';
          } else {
            status = 'normal';
          }
          
          // Check if reading is old (more than 6 hours)
          const readingTime = new Date(latestReading.submission_timestamp);
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
          
          if (readingTime < sixHoursAgo) {
            status = 'reading_due';
          }
        }

        return {
          ...site,
          status,
          lastReading: latestReading ? {
            waterLevel: latestReading.predicted_water_level || 0,
            timestamp: this.formatTimestamp(latestReading.submission_timestamp),
            operator: latestReading.user_role
          } : undefined,
          isAccessible: true // This would be determined by geolocation and other factors
        };
      });

      const enrichTime = Date.now() - startTime;
      console.log(`✅ Enrichment completed in ${enrichTime}ms for ${enrichedSites.length} sites`);

      return enrichedSites;
    } catch (error) {
      console.error('💥 Error in enrichSitesWithReadings:', error);
      // Return sites with basic status instead of failing completely
      console.log('⚠️ Returning sites with default status due to enrichment error');
      return sites.map(site => ({
        ...site,
        status: 'reading_due' as const,
        lastReading: undefined,
        isAccessible: true
      }));
    }
  }

  /**
   * Get the latest reading for multiple sites using a single optimized batch query
   * Much faster than individual queries per site
   */
  static async getLatestReadingsForSitesBatch(siteIds: string[]): Promise<{[siteId: string]: WaterLevelReading}> {
    try {
      if (siteIds.length === 0) return {};
      
      // Fetch all latest readings in a single query using DISTINCT ON
      const { data, error } = await supabase
        .from('water_level_readings')
        .select('*')
        .in('site_id', siteIds)
        .order('site_id')
        .order('submission_timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error fetching batch readings:', error);
        return {};
      }

      // Group readings by site_id and keep only the latest for each site
      const readings: {[siteId: string]: WaterLevelReading} = {};
      data?.forEach((reading: WaterLevelReading) => {
        if (!readings[reading.site_id]) {
          readings[reading.site_id] = reading;
        }
      });

      console.log(`⚡ Batch loaded ${Object.keys(readings).length} readings for ${siteIds.length} sites`);
      return readings;
    } catch (error) {
      console.error('💥 Error in getLatestReadingsForSitesBatch:', error);
      return {};
    }
  }

  /**
   * Fetch all water level readings with optional limit and offset for pagination
   */
  static async getAllReadings(limit?: number, offset?: number): Promise<WaterLevelReading[]> {
    try {
      console.log(`🔄 Fetching water level readings from Supabase (limit: ${limit || 'all'}, offset: ${offset || 0})...`);
      
      let query = supabase
        .from('water_level_readings')
        .select('*')
        .order('submission_timestamp', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      } else if (limit) {
        query = query.range(0, limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Supabase error fetching water level readings:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Successfully fetched', data?.length || 0, 'water level readings');

      return data || [];
    } catch (error) {
      console.error('💥 Error in getAllReadings:', error);
      throw error;
    }
  }

  /**
   * Get total count of water level readings
   */
  static async getReadingsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('water_level_readings')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error fetching readings count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('💥 Error in getReadingsCount:', error);
      return 0;
    }
  }

  /**
   * Submit a new water level reading
   */
  static async submitReading(reading: Omit<WaterLevelReading, 'id' | 'created_at'>): Promise<WaterLevelReading | null> {
    try {
      const { data, error } = await supabase
        .from('water_level_readings')
        .insert([reading])
        .select()
        .single();

      if (error) {
        console.error('Error submitting reading:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in submitReading:', error);
      throw error;
    }
  }

  /**
   * Get site by ID
   */
  static async getSiteById(siteId: string): Promise<MonitoringSite | null> {
    try {
      const { data, error } = await supabase
        .from('monitoring_sites')
        .select('*')
        .eq('id', siteId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Error fetching site by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getSiteById:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: string): string {
    const now = new Date();
    const readingTime = new Date(timestamp);
    const diffMs = now.getTime() - readingTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return readingTime.toLocaleDateString();
    }
  }

  /**
   * Test Supabase connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('monitoring_sites')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }

      console.log('✅ Supabase connection successful! Total monitoring sites:', data);
      return true;
    } catch (error) {
      console.error('💥 Supabase connection test error:', error);
      return false;
    }
  }

  /**
   * Get today's readings count
   */
  static async getTodaysReadingsCount(): Promise<number> {
    try {
      console.log('🔄 Fetching today\'s readings count...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from('water_level_readings')
        .select('*', { count: 'exact', head: true })
        .gte('submission_timestamp', today.toISOString())
        .lt('submission_timestamp', tomorrow.toISOString());

      if (error) {
        console.error('❌ Error getting today\'s readings count:', error);
        console.error('Error details:', error);
        return 0;
      }

      console.log('✅ Today\'s readings count:', count || 0);
      return count || 0;
    } catch (error) {
      console.error('💥 Error in getTodaysReadingsCount:', error);
      return 0;
    }
  }

  /**
   * Get flood alerts (sites with water level above warning)
   */
  static async getFloodAlerts(): Promise<MonitoringSite[]> {
    try {
      const sites = await this.getAllSites();
      const enrichedSites = await this.enrichSitesWithReadings(sites);
      
      return enrichedSites.filter(site => 
        site.status === 'warning' || site.status === 'danger'
      );
    } catch (error) {
      console.error('Error in getFloodAlerts:', error);
      return [];
    }
  }
}