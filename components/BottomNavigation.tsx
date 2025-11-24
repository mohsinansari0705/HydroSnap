import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../lib/colors';

interface BottomNavigationProps {
  activeTab: 'capture' | 'readings' | 'home' | 'sites' | 'profile';
  onTabPress: (tab: 'capture' | 'readings' | 'home' | 'sites' | 'profile') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  
  // Plus Icon for Capture Readings
  const PlusIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={styles.plusContainer}>
        <View style={[styles.plusVertical, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
        <View style={[styles.plusHorizontal, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
      </View>
    </View>
  );

  // Document Icon for My Readings
  const DocumentIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={[styles.document, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]}>
        <View style={[styles.documentLine, { backgroundColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey }]} />
        <View style={[styles.documentLine, { backgroundColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey, width: 12 }]} />
        <View style={[styles.documentLine, { backgroundColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey, width: 10 }]} />
      </View>
    </View>
  );

  // Home Icon for Dashboard
  const HomeIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={styles.homeIconWrapper}>
        <View style={[styles.homeRoof, { borderBottomColor: isActive ? Colors.white : Colors.textSecondary }]} />
        <View style={[styles.homeBody, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]}>
          <View style={[styles.homeDoor, { backgroundColor: isActive ? Colors.deepSecurityBlue : Colors.softLightGrey }]} />
        </View>
      </View>
    </View>
  );

  // Location Icon for Site Locations
  const LocationIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={styles.locationContainer}>
        <View style={[styles.locationOuter, { borderColor: isActive ? Colors.white : Colors.textSecondary }]}>
          <View style={[styles.locationInner, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
        </View>
      </View>
    </View>
  );

  // User Icon for Profile
  const UserIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={styles.userContainer}>
        <View style={[styles.userHead, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
        <View style={[styles.userBody, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
      </View>
    </View>
  );

  const renderTab = (
    key: 'capture' | 'readings' | 'home' | 'sites' | 'profile',
    icon: React.ReactNode,
    label: string
  ) => {
    const isActive = activeTab === key;
    
    return (
      <TouchableOpacity
        key={key}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => onTabPress(key)}
        activeOpacity={0.7}
      >
        {icon}
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.navigation}>
        {renderTab('capture', <PlusIcon isActive={activeTab === 'capture'} />, 'Capture')}
        {renderTab('readings', <DocumentIcon isActive={activeTab === 'readings'} />, 'Readings')}
        {renderTab('home', <HomeIcon isActive={activeTab === 'home'} />, 'Home')}
        {renderTab('sites', <LocationIcon isActive={activeTab === 'sites'} />, 'Sites')}
        {renderTab('profile', <UserIcon isActive={activeTab === 'profile'} />, 'Profile')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.softLightGrey,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  navigation: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    // Additional styling for active icons if needed
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  activeTabLabel: {
    color: Colors.white,
    fontWeight: '700',
  },

  // Plus Icon Styles (for Capture)
  plusContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusVertical: {
    width: 2.5,
    height: 16,
    borderRadius: 2,
    position: 'absolute',
  },
  plusHorizontal: {
    width: 16,
    height: 2.5,
    borderRadius: 2,
    position: 'absolute',
  },

  // Document Icon Styles
  document: {
    width: 16,
    height: 20,
    borderRadius: 2,
    padding: 4,
    justifyContent: 'space-evenly',
  },
  documentLine: {
    height: 1.5,
    width: 8,
    borderRadius: 1,
    marginVertical: 1,
  },

  // Home Icon Styles
  homeIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1,
  },
  homeBody: {
    width: 18,
    height: 11,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  homeDoor: {
    width: 5,
    height: 7,
    borderRadius: 1.5,
  },

  // Location Icon Styles
  locationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // User Icon Styles
  userContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  userBody: {
    width: 16,
    height: 10,
    borderRadius: 8,
  },
});

export default BottomNavigation;