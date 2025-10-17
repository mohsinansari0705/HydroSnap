import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Colors } from '../lib/colors';
import NotificationPanel from './NotificationPanel';
import { Alert } from '../types/alerts';

interface NavbarProps {
  onQRScanPress?: () => void;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
  userName?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onQRScanPress,
  onNotificationPress,
  onSettingsPress,
}) => {
  console.log('Navbar: onSettingsPress is', typeof onSettingsPress);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Sample notifications for testing
  const sampleNotifications: Alert[] = [
    {
      id: '1',
      siteId: 'SITE001',
      siteName: 'River Valley Station',
      waterLevel: 5.8,
      threshold: 5.5,
      severity: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      location: {
        latitude: 19.0760,
        longitude: 72.8777
      },
      weatherConditions: 'Heavy rainfall, cloudy'
    },
    {
      id: '2',
      siteId: 'SITE002',
      siteName: 'Coastal Monitoring Point',
      waterLevel: 7.2,
      threshold: 6.5,
      severity: 'danger',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      location: {
        latitude: 19.0177,
        longitude: 72.8562
      },
      weatherConditions: 'Storm conditions, high tide'
    },
    {
      id: '3',
      siteId: 'SITE003',
      siteName: 'Lake View Station',
      waterLevel: 9.1,
      threshold: 8.0,
      severity: 'critical',
      timestamp: new Date(), // Current time
      location: {
        latitude: 19.1136,
        longitude: 72.8697
      },
      weatherConditions: 'Extreme rainfall, flooding risk'
    }
  ];

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuItemPress = (action: () => void) => {
    console.log('Menu item pressed, calling action');
    setShowMenu(false);
    action();
  };

  // QR Code Icon SVG
  const QRIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.qrContainer}>
        <View style={styles.qrFrame}>
          <View style={styles.qrTopLeft} />
          <View style={styles.qrTopRight} />
          <View style={styles.qrBottomLeft} />
          <View style={styles.qrBottomRight} />
          <View style={styles.qrCenter} />
        </View>
      </View>
    </View>
  );

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

  // Three Dots Menu Icon
  const MenuIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
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
        <TouchableOpacity onPress={onQRScanPress} style={styles.iconButton}>
          <QRIcon />
        </TouchableOpacity>
        
        <View style={styles.notificationContainer}>
          <TouchableOpacity 
            onPress={() => {
              setShowNotifications(!showNotifications);
              if (onNotificationPress) {
                onNotificationPress();
              }
            }} 
            style={styles.iconButton}
          >
            <NotificationIcon />
            {sampleNotifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {sampleNotifications.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {showNotifications && (
            <NotificationPanel 
              notifications={sampleNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          )}
        </View>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton}>
            <MenuIcon />
          </TouchableOpacity>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <View style={styles.dropdownMenu}>
              <View 
                style={[styles.menuItem, styles.disabledMenuItem]}
              >
                <Text style={[styles.menuItemText, styles.disabledMenuText]}>👤 Profile</Text>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  console.log('Settings menu item pressed');
                  handleMenuItemPress(onSettingsPress || (() => {}));
                }}
              >
                <Text style={styles.menuItemText}>⚙️ Settings</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    // Adjust these values to separate from mobile header
    height: 110, // adjust navbar height
    // marginTop: 8, // Added top margin
    paddingTop: 40, // adjust internal top padding
    paddingBottom: 8, // Added bottom padding
    
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 12,
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
  // QR Code Icon Styles
  qrContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  qrTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.white,
  },
  qrTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.white,
  },
  qrBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 6,
    height: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.white,
  },
  qrBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 6,
    height: 6,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.white,
  },
  qrCenter: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: 1,
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
  // Three Dots Menu Icon Styles
  dotsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 16,
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: Colors.white,
    borderRadius: 2,
    marginVertical: 1,
  },
  // Menu Dropdown Styles
  menuContainer: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  notificationContainer: {
    position: 'relative',
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
  disabledMenuItem: {
    opacity: 0.6,
  },
  disabledMenuText: {
    color: Colors.textSecondary,
  },
  comingSoonText: {
    fontSize: 12,
    color: Colors.aquaTechBlue,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default Navbar;