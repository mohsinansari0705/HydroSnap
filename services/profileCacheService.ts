import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types/profile';
import { supabase } from '../lib/supabase';

interface CachedProfile {
  data: Profile;
  timestamp: number;
}

/**
 * Profile Cache Service - Offline-first profile management
 * Similar to WhatsApp/Instagram - loads cached data instantly, syncs in background
 */
export class ProfileCacheService {
  private static instance: ProfileCacheService;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly PROFILE_CACHE_PREFIX = 'hydrosnap_profile_';

  static getInstance(): ProfileCacheService {
    if (!ProfileCacheService.instance) {
      ProfileCacheService.instance = new ProfileCacheService();
    }
    return ProfileCacheService.instance;
  }

  /**
   * Get cache key for a specific user
   */
  private getCacheKey(userId: string): string {
    return `${this.PROFILE_CACHE_PREFIX}${userId}`;
  }

  /**
   * Load profile with cache-first strategy (instant load)
   * Returns cached data immediately, then syncs in background
   */
  async getProfileFast(userId: string): Promise<{
    profile: Profile | null;
    isFromCache: boolean;
    syncPromise?: Promise<Profile | null>;
  }> {
    try {
      console.log('🚀 Loading profile with cache-first strategy');
      
      // Step 1: Try to load from cache immediately (works offline)
      const cachedData = await this.loadFromCache(userId);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        console.log('✅ Using cached profile for instant load');
        
        // Return cached data immediately and sync in background
        const syncPromise = this.syncInBackground(userId);
        
        return {
          profile: cachedData.data,
          isFromCache: true,
          syncPromise,
        };
      }

      // Step 2: No valid cache - fetch from server
      console.log('📦 No valid cache, fetching from server...');
      const profile = await this.fetchFromServer(userId);
      
      return {
        profile,
        isFromCache: false,
      };
      
    } catch (error) {
      console.error('ProfileCacheService error:', error);
      return {
        profile: null,
        isFromCache: false,
      };
    }
  }

  /**
   * Load profile from local cache
   */
  private async loadFromCache(userId: string): Promise<CachedProfile | null> {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cachedData: CachedProfile = JSON.parse(cached);
      console.log('📦 Loaded profile from cache:', cachedData.data.email);
      
      return cachedData;
      
    } catch (error) {
      console.error('Cache load error:', error);
      return null;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age < this.CACHE_DURATION;
  }

  /**
   * Sync profile in background (non-blocking)
   */
  private async syncInBackground(userId: string): Promise<Profile | null> {
    try {
      console.log('🔄 Syncing profile in background...');
      
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Background sync timeout')), 8000)
        )
      ]);
      
      if (error) {
        console.log('🔄 Background sync failed (using cached data):', error.message);
        return null;
      }
      
      // Update cache with fresh data
      await this.saveToCache(userId, data);
      console.log('✅ Profile synced in background:', data.email);
      
      return data;
      
    } catch (error) {
      console.log('🔄 Background sync timeout (app continues with cache)');
      return null;
    }
  }

  /**
   * Fetch profile from server (with timeout)
   */
  private async fetchFromServer(userId: string, retryCount = 0): Promise<Profile | null> {
    try {
      console.log('📡 Fetching profile from server:', userId);
      
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Server fetch timeout')), 10000)
        )
      ]);

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found
          console.error('Profile not found in database');
          return null;
        }
        
        // Network or other errors
        console.error('Profile fetch error:', error.message);
        
        // Retry once on network error
        if (retryCount === 0) {
          console.log('🔄 Retrying server fetch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.fetchFromServer(userId, retryCount + 1);
        }
        
        return null;
      }

      // Success - cache the profile
      console.log('✅ Profile loaded from server:', data.email);
      await this.saveToCache(userId, data);
      
      return data;
      
    } catch (error: any) {
      console.error('Server fetch error:', error.message);
      
      // Retry once on timeout
      if (error.message === 'Server fetch timeout' && retryCount === 0) {
        console.log('🔄 Retrying after timeout...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchFromServer(userId, retryCount + 1);
      }
      
      return null;
    }
  }

  /**
   * Save profile to cache
   */
  async saveToCache(userId: string, profile: Profile): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cachedData: CachedProfile = {
        data: profile,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log('💾 Profile cached successfully');
      
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  /**
   * Update profile in both cache and server
   * Works offline - will queue update for later sync
   */
  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<{ success: boolean; profile?: Profile; error?: string; isOffline?: boolean }> {
    try {
      // Step 1: Load current profile from cache
      const cachedData = await this.loadFromCache(userId);
      
      if (!cachedData) {
        return { success: false, error: 'No profile found in cache' };
      }

      // Step 2: Update cached profile immediately (optimistic update)
      const updatedProfile: Profile = {
        ...cachedData.data,
        ...updates,
      };

      await this.saveToCache(userId, updatedProfile);
      console.log('✅ Profile updated in cache (optimistic)');

      // Step 3: Try to sync with server
      try {
        const { data, error } = await Promise.race([
          supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Update timeout')), 8000)
          )
        ]);

        if (error) {
          console.warn('⚠️ Server update failed (saved offline):', error.message);
          // Store pending update for later sync
          await this.storePendingUpdate(userId, updates);
          
          return {
            success: true,
            profile: updatedProfile,
            isOffline: true,
            error: 'Changes saved offline. Will sync when connection improves.',
          };
        }

        // Success - update cache with server response
        await this.saveToCache(userId, data);
        console.log('✅ Profile updated on server:', data.email);
        
        // Clear any pending updates
        await this.clearPendingUpdate(userId);
        
        return {
          success: true,
          profile: data,
          isOffline: false,
        };
        
      } catch (error: any) {
        console.warn('⚠️ Network error during update (saved offline)');
        
        // Store pending update for later sync
        await this.storePendingUpdate(userId, updates);
        
        return {
          success: true,
          profile: updatedProfile,
          isOffline: true,
          error: 'Changes saved offline. Will sync when connection improves.',
        };
      }
      
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }
  }

  /**
   * Store pending update for later sync
   */
  private async storePendingUpdate(userId: string, updates: Partial<Profile>): Promise<void> {
    try {
      const key = `${this.PROFILE_CACHE_PREFIX}pending_${userId}`;
      const existing = await AsyncStorage.getItem(key);
      
      const pendingUpdates = existing ? JSON.parse(existing) : {};
      const merged = { ...pendingUpdates, ...updates, _timestamp: Date.now() };
      
      await AsyncStorage.setItem(key, JSON.stringify(merged));
      console.log('📤 Pending update stored for later sync');
      
    } catch (error) {
      console.error('Failed to store pending update:', error);
    }
  }

  /**
   * Clear pending updates
   */
  private async clearPendingUpdate(userId: string): Promise<void> {
    try {
      const key = `${this.PROFILE_CACHE_PREFIX}pending_${userId}`;
      await AsyncStorage.removeItem(key);
      
    } catch (error) {
      console.error('Failed to clear pending update:', error);
    }
  }

  /**
   * Sync pending updates (call when connection restored)
   */
  async syncPendingUpdates(userId: string): Promise<boolean> {
    try {
      const key = `${this.PROFILE_CACHE_PREFIX}pending_${userId}`;
      const pending = await AsyncStorage.getItem(key);
      
      if (!pending) {
        return true; // No pending updates
      }

      const updates = JSON.parse(pending);
      delete updates._timestamp;
      
      console.log('🔄 Syncing pending profile updates...');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to sync pending updates:', error);
        return false;
      }

      // Update cache and clear pending
      await this.saveToCache(userId, data);
      await this.clearPendingUpdate(userId);
      
      console.log('✅ Pending updates synced successfully');
      return true;
      
    } catch (error) {
      console.error('Sync pending updates error:', error);
      return false;
    }
  }

  /**
   * Clear cache for a user
   */
  async clearCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      await AsyncStorage.removeItem(cacheKey);
      await this.clearPendingUpdate(userId);
      console.log('🗑️ Profile cache cleared');
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear all profile caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter(key => key.startsWith(this.PROFILE_CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(profileKeys);
      console.log('🗑️ All profile caches cleared');
      
    } catch (error) {
      console.error('Clear all caches error:', error);
    }
  }
}

// Export singleton instance
export const profileCacheService = ProfileCacheService.getInstance();
