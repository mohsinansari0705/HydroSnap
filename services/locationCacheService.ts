import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number | null;
}

export class LocationCacheService {
  private static instance: LocationCacheService;
  private cachedLocation: CachedLocation | null = null;
  private readonly CACHE_KEY = 'hydrosnap_user_location';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): LocationCacheService {
    if (!LocationCacheService.instance) {
      LocationCacheService.instance = new LocationCacheService();
    }
    return LocationCacheService.instance;
  }

  /**
   * Get user location with intelligent caching
   * Returns cached location immediately if recent, then updates in background
   */
  async getLocationFast(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Load from cache first
      await this.loadFromStorage();
      
      // Return cached location if recent
      if (this.isCacheValid()) {
        console.log('🚀 Using cached location for instant load');
        this.updateLocationInBackground(); // Update in background
        return {
          latitude: this.cachedLocation!.latitude,
          longitude: this.cachedLocation!.longitude,
        };
      }

      // Get fresh location
      return await this.getFreshLocation();
      
    } catch (error) {
      console.error('LocationCacheService error:', error);
      return null;
    }
  }

  /**
   * Get fresh location and cache it
   */
  private async getFreshLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Check permission status without requesting
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted. Please grant permission in app settings.');
        return null;
      }

      // Try last known location first (instant)
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 2 * 60 * 1000, // 2 minutes
      });

      if (lastKnown) {
        const location = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          timestamp: Date.now(),
          accuracy: lastKnown.coords.accuracy,
        };
        
        await this.cacheLocation(location);
        console.log('📍 Got last known location');
        
        // Get more accurate location in background
        this.updateLocationInBackground();
        
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }

      // Get current position with optimized settings
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Good balance of speed and accuracy
        timeInterval: 1000,
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
        accuracy: position.coords.accuracy,
      };

      await this.cacheLocation(location);
      console.log('🎯 Got fresh location');

      return {
        latitude: location.latitude,
        longitude: location.longitude,
      };

    } catch (error) {
      console.error('Error getting fresh location:', error);
      return null;
    }
  }

  /**
   * Update location in background without blocking UI
   */
  private updateLocationInBackground() {
    setTimeout(async () => {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High, // More accurate for background update
          timeInterval: 2000,
        });

        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy,
        };

        await this.cacheLocation(location);
        console.log('🔄 Background location update complete');

      } catch (error) {
        console.error('Background location update failed:', error);
      }
    }, 100); // Small delay to not block UI
  }

  /**
   * Cache location to memory and storage
   */
  private async cacheLocation(location: CachedLocation) {
    this.cachedLocation = location;
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Failed to cache location to storage:', error);
    }
  }

  /**
   * Load cached location from storage
   */
  private async loadFromStorage() {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.cachedLocation = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load cached location:', error);
    }
  }

  /**
   * Check if cached location is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedLocation) return false;
    return Date.now() - this.cachedLocation.timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear location cache
   */
  async clearCache() {
    this.cachedLocation = null;
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear location cache:', error);
    }
  }
}

export const locationCacheService = LocationCacheService.getInstance();