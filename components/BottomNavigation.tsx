import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Colors } from '../lib/colors';

interface BottomNavigationProps {
  activeTab: 'capture' | 'readings' | 'dashboard' | 'sites' | 'profile';
  onTabPress: (tab: 'capture' | 'readings' | 'dashboard' | 'sites' | 'profile') => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabPress }) => {
  
  // Camera Icon for Capture Readings
  const CameraIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={[styles.cameraBody, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]}>
        <View style={[styles.cameraLens, { borderColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey }]} />
      </View>
      <View style={[styles.cameraFlash, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
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
      <View style={styles.house}>
        <View style={[styles.roof, { borderBottomColor: isActive ? Colors.white : Colors.textSecondary }]} />
        <View style={[styles.houseBase, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]}>
          <View style={[styles.door, { backgroundColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey }]} />
        </View>
      </View>
    </View>
  );

  // Map Pin Icon for Site Locations
  const MapPinIcon = ({ isActive }: { isActive: boolean }) => (
    <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
      <View style={styles.pinContainer}>
        <View style={[styles.pinTop, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]}>
          <View style={[styles.pinDot, { backgroundColor: isActive ? Colors.aquaTechBlue : Colors.softLightGrey }]} />
        </View>
        <View style={[styles.pinBottom, { backgroundColor: isActive ? Colors.white : Colors.textSecondary }]} />
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
    key: 'capture' | 'readings' | 'dashboard' | 'sites' | 'profile',
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
    <View style={styles.container}>
      <View style={styles.navigation}>
        {renderTab('capture', <CameraIcon isActive={activeTab === 'capture'} />, 'Capture')}
        {renderTab('readings', <DocumentIcon isActive={activeTab === 'readings'} />, 'My Readings')}
        {renderTab('dashboard', <HomeIcon isActive={activeTab === 'dashboard'} />, 'Dashboard')}
        {renderTab('sites', <MapPinIcon isActive={activeTab === 'sites'} />, 'Site Locations')}
        {renderTab('profile', <UserIcon isActive={activeTab === 'profile'} />, 'Profile')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightShadow,
    paddingBottom: 34, // Safe area for iPhone
  },
  navigation: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: Colors.aquaTechBlue,
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
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: Colors.white,
    fontWeight: '600',
  },

  // Camera Icon Styles
  cameraBody: {
    width: 18,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  cameraFlash: {
    width: 4,
    height: 3,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    right: 2,
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
  house: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 20,
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 2,
  },
  houseBase: {
    width: 16,
    height: 10,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  door: {
    width: 4,
    height: 6,
    borderRadius: 1,
  },

  // Map Pin Icon Styles
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTop: {
    width: 14,
    height: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pinBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
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