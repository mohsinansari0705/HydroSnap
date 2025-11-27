import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from '../types/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  
  // Auth actions
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  setIsRegistering: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Load cached profile first (like WhatsApp/Instagram), then sync in background
  const loadProfileWithCache = async (userId: string): Promise<void> => {
    try {
      console.log('🚀 Loading profile with cache-first strategy for:', userId);
      
      // Step 1: Try to load from cache immediately (works offline)
      const cacheKey = `profile_${userId}`;
      const cachedProfile = await AsyncStorage.getItem(cacheKey);
      
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        console.log('✅ Loaded profile from cache:', profile.email);
        setProfile(profile);
        setLoading(false); // App can now continue with cached data
        
        // Step 2: Sync in background (non-blocking)
        console.log('🔄 Syncing profile in background...');
        syncProfileInBackground(userId);
        return;
      }
      
      // Step 3: No cache - fetch from server (first time only)
      console.log('📦 No cached profile found, fetching from server...');
      await fetchProfileFromServer(userId);
      
    } catch (error) {
      console.error('Cache loading error:', error);
      // Fallback to server fetch
      await fetchProfileFromServer(userId);
    }
  };

  // Background sync (non-blocking like production apps)
  const syncProfileInBackground = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Background sync timeout')), 8000)
        )
      ]);
      
      if (error) {
        console.log('🔄 Background sync failed (using cached data):', error.message);
        return;
      }
      
      // Update cache and state with fresh data
      const cacheKey = `profile_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      setProfile(data);
      console.log('✅ Profile synced in background:', data.email);
      
    } catch (error) {
      console.log('🔄 Background sync timeout (app continues with cache)');
    }
  };

  // Server fetch (used for first-time loads)
  const fetchProfileFromServer = async (userId: string, retryCount = 0): Promise<void> => {
    try {
      console.log('📡 Fetching profile from server:', userId, 'Retry:', retryCount);
      
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Server fetch timeout')), 5000)
        )
      ]);

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - only retry once
          if (retryCount < 1) {
            console.log(`Profile not found, retrying once...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return fetchProfileFromServer(userId, retryCount + 1);
          } else {
            console.error('Profile not found after retry');
            setError('Profile not found. Please contact support.');
            setProfile(null);
            setLoading(false);
            return;
          }
        }
        
        // Network or other errors
        console.error('Profile fetch error:', error.message);
        setError('Failed to load profile. Please check your connection.');
        setProfile(null);
        setLoading(false);
        return;
      }

      // Success - cache the profile and update state
      console.log('✅ Profile loaded from server:', data?.email);
      const cacheKey = `profile_${userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      setProfile(data);
      setError(null);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Server fetch error:', error.message);
      
      if (error.message === 'Server fetch timeout') {
        setError('Connection timeout. Please check your internet.');
      } else {
        setError('Failed to load profile. Please try again.');
      }
      
      setProfile(null);
      setLoading(false);
    }
  };

  // Initialize auth
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { session: !!session, error });
        
        if (session) {
          setSession(session);
          // Use cache-first strategy like WhatsApp
          await loadProfileWithCache(session.user.id);
        } else {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError('Failed to initialize app. Please restart.');
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', { event: _event, session: !!session });
      console.log('Auth event details:', _event, session?.user?.email);
      
      if (session) {
        // Don't fetch profile during registration. The registration flow will handle it manually
        setSession(session);

        if (!isRegistering) {
          // Use cache-first strategy for better user experience
          await loadProfileWithCache(session.user.id);
        } else {
          console.log('Skipping auto profile fetch during registration');
          setLoading(false);
        }
      } else {
        if (_event !== 'PASSWORD_RECOVERY' && _event !== 'USER_UPDATED') {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isRegistering]);

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        setError('Failed to sign out. Please try again.');
      } else {
        setSession(null);
        setProfile(null);
        setError(null);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      setError('An unexpected error occurred during sign out.');
    }
  };

  // Refresh profile (forced sync)
  const refreshProfile = async () => {
    if (session) {
      setLoading(true);
      try {
        // Force fresh fetch (bypass cache)
        await fetchProfileFromServer(session.user.id);
      } catch (error) {
        console.error('Error refreshing profile:', error);
        setLoading(false);
      }
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        await loadProfileWithCache(data.session.user.id);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  const value: AuthContextType = {
    session,
    profile,
    loading,
    error,
    signOut,
    refreshProfile,
    refreshSession,
    clearError,
    setIsRegistering,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}