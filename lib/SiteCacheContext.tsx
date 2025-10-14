import React, { createContext, useContext, useState, useCallback } from 'react';
import { MonitoringSite } from '../services/monitoringSitesService';

interface SiteCacheContextType {
  sites: MonitoringSite[];
  lastFetchTime: number;
  isLoading: boolean;
  error: string | null;
  setCachedSites: (sites: MonitoringSite[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;
  isCacheValid: (maxAge?: number) => boolean;
}

const SiteCacheContext = createContext<SiteCacheContextType | null>(null);

export const useSiteCache = () => {
  const context = useContext(SiteCacheContext);
  if (!context) {
    throw new Error('useSiteCache must be used within a SiteCacheProvider');
  }
  return context;
};

interface SiteCacheProviderProps {
  children: React.ReactNode;
}

export const SiteCacheProvider: React.FC<SiteCacheProviderProps> = ({ children }) => {
  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setCachedSites = useCallback((newSites: MonitoringSite[]) => {
    setSites(newSites);
    setLastFetchTime(Date.now());
    console.log('📦 Cached sites updated:', newSites.length, 'sites');
  }, []);

  const clearCache = useCallback(() => {
    setSites([]);
    setLastFetchTime(0);
    setError(null);
    console.log('🗑️ Site cache cleared');
  }, []);

  // Check if cache is still valid (default 10 minutes)
  const isCacheValid = useCallback((maxAge: number = 10 * 60 * 1000) => {
    const now = Date.now();
    const isValid = sites.length > 0 && (now - lastFetchTime) < maxAge;
    console.log('📋 Cache valid:', isValid, '- Age:', Math.round((now - lastFetchTime) / 1000), 's');
    return isValid;
  }, [sites.length, lastFetchTime]);

  const value: SiteCacheContextType = {
    sites,
    lastFetchTime,
    isLoading,
    error,
    setCachedSites,
    setLoading: setIsLoading,
    setError,
    clearCache,
    isCacheValid,
  };

  return (
    <SiteCacheContext.Provider value={value}>
      {children}
    </SiteCacheContext.Provider>
  );
};