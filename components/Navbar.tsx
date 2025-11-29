import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../lib/colors';
import { useNavigation } from '../lib/NavigationContext';
import { useNotifications } from '../hooks/useNotifications';

interface NavbarProps {
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onNotificationPress,
  onSettingsPress,
}) => {
  console.log('Navbar: onSettingsPress is', typeof onSettingsPress);
  const { navigateToSettings, navigateToNotifications } = useNavigation();
  const { unreadCount } = useNotifications();

  // Notification Bell Icon SVG
  const NotificationIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.bellContainer}>
        <View style={styles.bellTop} />
        <View style={styles.bellBody} />
        <View style={styles.bellBottom} />
      </View>
    </View>
  );

  return (
    <View style={styles.navbar}>
      {/* Left Section - App Name with Logo */}
      <View style={styles.leftSection}>
        <View style={styles.brandContainer}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>HydroSnap</Text>
            <Text style={styles.appSubtitle}>Smart Water Level Monitoring</Text>
          </View>
        </View>
      </View>
      
      {/* Right Section - Icons */}
      <View style={styles.rightSection}>
        <View style={styles.notificationContainer}>
          <TouchableOpacity 
            onPress={() => {
              navigateToNotifications();
              if (onNotificationPress) onNotificationPress();
            }} 
            style={styles.iconButton}
            accessibilityLabel="Open notifications"
          >
            <NotificationIcon />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={() => {
            console.log('Settings pressed');
            try {
              (onSettingsPress || navigateToSettings)();
            } catch (err) {
              console.warn('settings action failed', err);
            }
          }} 
          style={styles.iconButton}
          accessibilityLabel="Open settings"
        >
          <View style={styles.iconContainer}>
            <MaterialIcons name="settings" size={20} color={Colors.white} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    // Adjust these values to separate from mobile header
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
    overflow: 'visible', // allow absolute children (notification panel) to overflow
  },
  leftSection: {
    flex: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: Colors.white + 'CC',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Notification Bell Icon Styles
  bellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellTop: {
    width: 4,
    height: 4,
    backgroundColor: Colors.white,
    borderRadius: 2,
    marginBottom: 1,
  },
  bellBody: {
    width: 14,
    height: 12,
    backgroundColor: Colors.white,
    borderRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bellBottom: {
    width: 8,
    height: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
    marginTop: 1,
  },
  notificationContainer: {
    position: 'relative',
    zIndex: 2000,
    elevation: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.criticalRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.deepSecurityBlue,
  },
  notificationBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  /* Modal / Notifications styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    zIndex: 2000,
    elevation: 20,
  },
  modalContentWrapper: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
  modalCard: {
    width: 340,
    maxHeight: '70%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 2001,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLightGrey,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.softLightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notificationListContainer: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  notificationListScroll: {
    maxHeight: 420,
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.softLightGrey,
  },
  markAllText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  alertItem: {
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: Colors.white,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  severity: {
    fontSize: 12,
    fontWeight: '700',
  },
  waterLevel: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  weather: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  noAlertsText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});

export default Navbar;