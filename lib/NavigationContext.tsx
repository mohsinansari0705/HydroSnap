import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppScreen = 
  | 'splash'
  | 'onboarding' 
  | 'auth'
  | 'profile-setup'
  | 'home'
  | 'supervisor-dashboard'
  | 'site-details'
  | 'new-reading'
  | 'public-upload'
  | 'settings';

interface NavigationContextType {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  selectedSiteId: string;
  setSelectedSiteId: (id: string) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  
  // Navigation helpers
  navigateToHome: () => void;
  navigateToSite: (siteId: string) => void;
  navigateToNewReading: (siteId: string) => void;
  navigateToSettings: () => void;
  navigateToAuth: () => void;
  navigateBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const navigateToHome = () => {
    setCurrentScreen('home');
  };

  const navigateToSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentScreen('site-details');
  };

  const navigateToNewReading = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentScreen('new-reading');
  };

  const navigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const navigateToAuth = () => {
    setCurrentScreen('auth');
  };

  const navigateBack = () => {
    // Simple back navigation - can be enhanced
    setCurrentScreen('home');
  };

  const value: NavigationContextType = {
    currentScreen,
    setCurrentScreen,
    selectedSiteId,
    setSelectedSiteId,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    navigateToHome,
    navigateToSite,
    navigateToNewReading,
    navigateToSettings,
    navigateToAuth,
    navigateBack,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}