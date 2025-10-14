import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import React from 'react';
import { NeumorphicTextStyles } from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  isGuest?: boolean;
  userProfile?: {
    fullName: string;
    role: string;
    initials: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isVisible, 
  onClose, 
  onNavigate, 
  isGuest = false,
  userProfile = {
    fullName: 'Field Personnel',
    role: 'Water Level Operator',
    initials: 'FP'
  }
}) => {
  const translateX = React.useRef(new Animated.Value(-300)).current;
  const styles = React.useMemo(() => createStyles(), []);

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: isVisible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Core navigation items - keeping only essential features
  const menuItems = [
    { icon: '○', label: 'Dashboard', screen: 'Dashboard' },
    { icon: '◐', label: 'Capture Reading', screen: 'Capture' },
    { icon: '◑', label: 'My Readings', screen: 'Readings' },
    { icon: '◒', label: 'Site Locations', screen: 'Sites' },
    { icon: '◓', label: 'Analytics', screen: 'Analytics' },
    { icon: '△', label: 'Flood Alerts', screen: 'Alerts' },
    { icon: '⚙', label: 'Settings', screen: 'Settings' },
    ...(isGuest ? [{ icon: '◉', label: 'Sign In', screen: 'Auth' }] : []),
  ];

  return (
    <>
      {isVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerText}>HydroSnap</Text>
            <Text style={styles.headerSubtext}>Water Level Monitoring</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {!isGuest && (
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => onNavigate('Profile')}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{userProfile.initials}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userProfile.fullName}</Text>
              <Text style={styles.userRole}>{userProfile.role}</Text>
            </View>
            <Text style={styles.profileArrow}>›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.menuItems}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                onNavigate(item.screen);
              }}
            >
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const createStyles = () => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: Colors.white,
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    paddingTop: 50, // Account for status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  headerContent: {
    flex: 1,
  },
  headerText: {
    ...NeumorphicTextStyles.heading,
    fontSize: 24,
    color: Colors.deepSecurityBlue,
    letterSpacing: -0.5,
    fontWeight: 'bold',
  },
  headerSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: Colors.softLightGrey,
  },
  closeIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightShadow,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.deepSecurityBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: 'bold',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  profileArrow: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  menuItems: {
    paddingHorizontal: 0,
    paddingBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 2,
  },
  menuItemIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  menuItemArrow: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
});

export default Sidebar;