import { createContext, useContext, useState, ReactNode } from 'react';

export type AppScreen = 
  | 'splash'
  | 'onboarding'
  | 'permissions'
  | 'auth'
  | 'profile-setup'
  | 'profile'
  | 'edit-profile'
  | 'home'
  | 'my-readings'
  | 'reading-details'
  | 'all-readings'
  | 'supervisor-dashboard'
  | 'site-details'
  | 'site-locations'
  | 'new-reading'
  | 'public-upload'
  | 'settings'
  | 'dashboard'
  | 'map'
  | 'notifications'
  | 'flood-alerts'
  | 'alert-details';

interface NavigationContextType {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen, replaceStack?: boolean) => void;
  selectedSiteId: string;
  setSelectedSiteId: (id: string) => void;
  selectedReadingId: string;
  setSelectedReadingId: (id: string) => void;
  selectedAlertId: string;
  setSelectedAlertId: (id: string) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  
  // Navigation helpers
  navigateToHome: () => void;
  navigateToSite: (siteId: string) => void;
  navigateToNewReading: (siteId: string) => void;
  navigateToMyReadings: () => void;
  navigateToReadingDetails: (readingId: string) => void;
  navigateToAllReadings: () => void;
  navigateToProfile: () => void;
  navigateToDashboard: () => void;
  navigateToMap: () => void;
  navigateToNotifications: () => void;
  navigateToFloodAlerts: () => void;
  navigateToAlertDetails: (alertId: string) => void;
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
  const [currentScreen, setCurrentScreenState] = useState<AppScreen>('splash');
  const [navigationStack, setNavigationStack] = useState<AppScreen[]>(['splash']);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedReadingId, setSelectedReadingId] = useState<string>('');
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  // Custom setCurrentScreen that also updates the stack
  const setCurrentScreen = (screen: AppScreen, replaceStack?: boolean) => {
    console.log('📱 setCurrentScreen called:', screen, 'replaceStack:', replaceStack);
    setCurrentScreenState(screen);
    if (replaceStack) {
      // Replace entire stack with just this screen
      console.log('📱 Replacing stack with:', [screen]);
      setNavigationStack([screen]);
    } else {
      // Add to stack, but avoid consecutive duplicates
      setNavigationStack(prev => {
        // Don't add if the last screen is the same as the new screen
        if (prev.length > 0 && prev[prev.length - 1] === screen) {
          console.log('📱 Skipping duplicate screen:', screen);
          return prev;
        }
        const newStack = [...prev, screen];
        console.log('📱 Adding to stack. Old:', prev, 'New:', newStack);
        return newStack;
      });
    }
  };

  // Helper function to navigate to a screen and update stack
  const navigateTo = (screen: AppScreen) => {
    console.log('📱 navigateTo called:', screen);
    setCurrentScreenState(screen);
    setNavigationStack(prev => {
      // Don't add if the last screen is the same as the new screen
      if (prev.length > 0 && prev[prev.length - 1] === screen) {
        console.log('📱 Skipping duplicate screen:', screen);
        return prev;
      }
      const newStack = [...prev, screen];
      console.log('📱 Stack updated. Old:', prev, 'New:', newStack);
      return newStack;
    });
  };

  const navigateToHome = () => {
    navigateTo('home');
  };

  const navigateToDashboard = () => {
    navigateTo('dashboard');
  };

  const navigateToSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    navigateTo('site-details');
  };

  const navigateToNewReading = (siteId: string) => {
    setSelectedSiteId(siteId);
    navigateTo('new-reading');
  };

  const navigateToMyReadings = () => {
    navigateTo('my-readings');
  };

  const navigateToReadingDetails = (readingId: string) => {
    setSelectedReadingId(readingId);
    navigateTo('reading-details');
  };

  const navigateToAllReadings = () => {
    navigateTo('all-readings');
  };

  const navigateToProfile = () => {
    navigateTo('profile');
  };

  const showNotifications = () => setNotificationsVisible(true);
  const hideNotifications = () => setNotificationsVisible(false);
  const toggleNotifications = () => setNotificationsVisible(v => !v);

  const navigateToSettings = () => {
    navigateTo('settings');
  };

  const navigateToAuth = () => {
    navigateTo('auth');
  };

  const navigateToMap = () => {
    navigateTo('map');
  };

  const navigateToNotifications = () => {
    navigateTo('notifications');
  };

  const navigateToFloodAlerts = () => {
    navigateTo('flood-alerts');
  };

  const navigateToAlertDetails = (alertId: string) => {
    setSelectedAlertId(alertId);
    navigateTo('alert-details');
  };

  const navigateBack = () => {
    setNavigationStack(prev => {
      console.log('📱 navigateBack called. Current stack:', prev);
      
      if (prev.length <= 1) {
        // If we're at the bottom of the stack, go to home
        console.log('📱 At bottom of stack, going to home');
        setCurrentScreenState('home');
        return ['home'];
      }
      
      // Remove current screen from stack
      const newStack = prev.slice(0, -1);
      // Navigate to the previous screen
      const previousScreen = newStack[newStack.length - 1];
      console.log('📱 Going back to:', previousScreen, 'New stack:', newStack);
      setCurrentScreenState(previousScreen);
      return newStack;
    });
  };

  const value: NavigationContextType = {
    currentScreen,
    setCurrentScreen,
    selectedSiteId,
    setSelectedSiteId,
    selectedReadingId,
    setSelectedReadingId,
    selectedAlertId,
    setSelectedAlertId,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    navigateToHome,
    navigateToDashboard,
    navigateToSite,
    navigateToNewReading,
    navigateToMyReadings,
    navigateToReadingDetails,
    navigateToAllReadings,
    navigateToProfile,
    notificationsVisible,
    showNotifications,
    hideNotifications,
    toggleNotifications,
    navigateToSettings,
    navigateToAuth,
    navigateToMap,
    navigateToNotifications,
    navigateToFloodAlerts,
    navigateToAlertDetails,
    navigateBack,
  }

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