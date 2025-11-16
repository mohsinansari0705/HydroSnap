import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from '../types/profile';

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

  // Fetch user profile
  const fetchProfile = async (userId: string, retryCount = 0): Promise<void> => {
    try {
      console.log('Fetching profile for user:', userId, 'Retry:', retryCount);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found
          if (retryCount < 8) { // Increase retry count
            console.log(`Profile not found (attempt ${retryCount + 1}) - will retry in 1000ms`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Increase delay
            return fetchProfile(userId, retryCount + 1);
          } else {
            console.error('Profile not found after 8 attempts');
            setError('Profile not found. Please contact support.');
            setProfile(null);
            setLoading(false);
            return;
          }
        }
        console.error('Profile fetch error:', error);
        setError('Failed to load profile');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('Profile loaded successfully:', data?.email);
      setProfile(data);
      setError(null);
      setLoading(false);
    } catch (e) {
      console.error('Unexpected profile fetch error:', e);
      setError('An unexpected error occurred');
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
          await fetchProfile(session.user.id);
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
          await fetchProfile(session.user.id);
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

  // Refresh profile
  const refreshProfile = async () => {
    if (session) {
      setLoading(true);
      try {
        await fetchProfile(session.user.id);
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
        await fetchProfile(data.session.user.id);
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