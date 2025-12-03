import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigation } from '../lib/NavigationContext';
import { SiteCacheProvider } from '../lib/SiteCacheContext';
import AuthScreen from './AuthScreen';
import ProfileSetup from './ProfileSetup';
import Loading from './Loading';
import SplashScreen from '../pages/SplashScreen';
import OnboardingScreen from '../pages/OnboardingScreen';
import PermissionScreen from './PermissionScreen';
import HomeScreen from '../pages/HomeScreen';
import ProfileScreen from '../pages/ProfileScreen';
import MyReadingsScreen from '../pages/MyReadingsScreen';
import ReadingDetailsScreen from '../pages/ReadingDetailsScreen';
import AllReadingsScreen from '../pages/AllReadingsScreen';
import SiteDetailsScreen from '../pages/SiteDetailsScreen';
import SiteLocationsScreen from '../pages/SiteLocationsScreen';
import NewReadingScreen from '../pages/NewReadingScreen';
import SupervisorDashboard from '../pages/SupervisorDashboard';
import PublicUploadScreen from '../pages/PublicUploadScreen';
import SettingsPage from '../pages/SettingsPage';
import EditProfileScreen from '../pages/EditProfileScreen';
import DashboardScreen from '../pages/DashboardScreen';
import MapLibreMapScreen from '../pages/MapLibreMapScreen';
import NotificationsScreen from '../pages/NotificationsScreen';
import FloodAlertsScreen from '../pages/FloodAlertsScreen';
import AlertDetailsScreen from '../pages/AlertDetailsScreen';
import { Colors } from '../lib/colors';

export default function AppNavigator() {
  const { session, profile, loading, error, clearError } = useAuth();
  const { 
    currentScreen, 
    setCurrentScreen,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    selectedSiteId,
    selectedReadingId,
    selectedAlertId,
    navigateToSite,
    navigateToNewReading,
    navigateToMyReadings,
    navigateToProfile,
    navigateToSettings,
    navigateBack
  } = useNavigation();

  const [showProfileSuccessPopup, setShowProfileSuccessPopup] = useState(false);

  // Handle authentication success
  const handleAuthSuccess = () => {
    console.log('Authentication successful, navigating to home');
    setCurrentScreen('home', true);
  };

  // Handle sign out
  const handleSignOut = async () => {
    const { signOut } = useAuth();
    await signOut();
    setCurrentScreen('auth', true);
  };

  // Navigation helpers
  const navigateToSiteDetails = (siteId: string) => {
    navigateToSite(siteId);
  };

  const navigateToNewReadingScreen = (siteId: string) => {
    navigateToNewReading(siteId);
  };

  // Show loading state
  if (loading) {
    return <Loading />;
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={clearError}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <SplashScreen 
            onAnimationComplete={() => {
              if (session && profile) {
                // User is logged in and verified
                setCurrentScreen('home', true);
              } else {
                // Show onboarding or auth
                setCurrentScreen(hasSeenOnboarding ? 'auth' : 'onboarding', true);
              }
            }}
          />
        );

      case 'onboarding':
        return (
          <OnboardingScreen 
            onComplete={() => {
              setHasSeenOnboarding(true);
              setCurrentScreen('permissions', true);
            }}
          />
        );

      case 'permissions':
        return (
          <PermissionScreen
            onComplete={() => {
              console.log('✅ Permissions granted, navigating to auth');
              setCurrentScreen('auth', true);
            }}
            onSkip={() => {
              console.log('⚠️ User skipped permissions');
              setCurrentScreen('auth', true);
            }}
          />
        );

      case 'auth':
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;

      case 'profile-setup':
        if (!session) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <ProfileSetup 
            userId={session.user.id}
            onProfileComplete={() => setCurrentScreen('home', true)}
          />
        );

      case 'home':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        
        // Role-based home screen
        if (profile?.role === 'supervisor') {
          return (
            <SupervisorDashboard
              profile={profile}
              onNavigateToSite={navigateToSiteDetails}
              onNavigateToSettings={navigateToSettings}
              onSignOut={handleSignOut}
            />
          );
        } else {
          return (
            <HomeScreen
              profile={profile!}
              onNavigateToSite={navigateToSiteDetails}
              onNavigateToNewReading={navigateToNewReadingScreen}
              onNavigateToMyReadings={() => navigateToMyReadings()}
              onNavigateToSiteLocations={() => setCurrentScreen('site-locations')}
              onNavigateToSettings={navigateToSettings}
            />
          );
        }

      case 'site-details':
        return (
          <SiteDetailsScreen
            siteId={selectedSiteId}
            onNavigateBack={navigateBack}
            onNavigateToNewReading={navigateToNewReadingScreen}
          />
        );

      case 'profile':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <ProfileScreen
            profile={profile}
            onEditProfile={() => setCurrentScreen('edit-profile')}
            onBack={navigateBack}
            showSuccessPopup={showProfileSuccessPopup}
            onSuccessPopupDismiss={() => setShowProfileSuccessPopup(false)}
          />
        );

      case 'site-locations':
        return (
          <SiteLocationsScreen
            onNavigateToSite={navigateToSiteDetails}
            onBack={navigateBack}
            userLocation={{ latitude: 28.6139, longitude: 77.2090 }}
          />
        );

      case 'new-reading':
        if (!session) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <NewReadingScreen
            onSubmitReading={(data) => {
              console.log('Reading submitted successfully:', data);
              navigateBack();
            }}
            onCancel={navigateBack}
          />
        );

      case 'my-readings':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <MyReadingsScreen
            profile={profile}
            onBack={navigateBack}
          />
        );

      case 'reading-details':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <ReadingDetailsScreen
            readingId={selectedReadingId}
            onBack={navigateBack}
          />
        );

      case 'all-readings':
        return (
          <AllReadingsScreen
            onBack={navigateBack}
          />
        );

      case 'public-upload':
        if (!session) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <PublicUploadScreen
            onSubmitReport={(data) => {
              console.log('Public report submitted:', data);
              navigateBack();
            }}
            onCancel={navigateBack}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            onNavigate={(screen: string) => {
              if (screen === 'Auth') {
                handleSignOut();
              } else if (screen === 'Profile') {
                navigateToProfile();
              } else {
                navigateBack();
              }
            }}
            onBack={navigateBack}
          />
        );

      case 'edit-profile':
        if (!session) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <EditProfileScreen
            onBack={navigateBack}
            onSuccess={() => {
              setShowProfileSuccessPopup(true);
            }}
          />
        );

      case 'dashboard':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <DashboardScreen
            profile={profile}
            onBack={navigateBack}
          />
        );

      case 'map':
        return <MapLibreMapScreen />;

      case 'notifications':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <NotificationsScreen
            onBack={navigateBack}
          />
        );

      case 'flood-alerts':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <FloodAlertsScreen
            profile={profile}
          />
        );

      case 'alert-details':
        if (!session || !profile) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
        return (
          <AlertDetailsScreen
            alertId={selectedAlertId}
            profile={profile}
          />
        );

      default:
        return <SplashScreen onAnimationComplete={() => setCurrentScreen('auth', true)} />;
    }
  };

  return (
    <SiteCacheProvider>
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </SiteCacheProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.softLightGrey,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.alertRed,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: Colors.deepSecurityBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
