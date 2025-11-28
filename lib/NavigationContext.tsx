import { createContext, useContext, useState, ReactNode } from 'react';

export type AppScreen = 
  | 'splash'
  | 'onboarding' 
  | 'auth'
  | 'profile-setup'
  | 'profile'
  | 'edit-profile'
  | 'home'
  | 'my-readings'
  | 'supervisor-dashboard'
  | 'site-details'
  | 'site-locations'
  | 'new-reading'
  | 'public-upload'
  | 'settings'
  | 'dashboard'
  | 'map';

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
  navigateToMyReadings: () => void;
  navigateToProfile: () => void;
  navigateToDashboard: () => void;
  navigateToMap: () => void;
  // Notification visibility helpers (global)
  notificationsVisible: boolean;
  showNotifications: () => void;
  hideNotifications: () => void;
  toggleNotifications: () => void;
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
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const navigateToHome = () => {
    setCurrentScreen('home');
  };

  const navigateToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const navigateToSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentScreen('site-details');
  };

  const navigateToNewReading = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentScreen('new-reading');
  };

  const navigateToMyReadings = () => {
    setCurrentScreen('my-readings');
  };

  const navigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const showNotifications = () => setNotificationsVisible(true);
  const hideNotifications = () => setNotificationsVisible(false);
  const toggleNotifications = () => setNotificationsVisible(v => !v);

  const navigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const navigateToAuth = () => {
    setCurrentScreen('auth');
  };

  const navigateToMap = () => {
    setCurrentScreen('map');
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
    navigateToDashboard,
    navigateToSite,
    navigateToNewReading,
    navigateToMyReadings,
    navigateToProfile,
    notificationsVisible,
    showNotifications,
    hideNotifications,
    toggleNotifications,
    navigateToSettings,
    navigateToAuth,
    navigateToMap,
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