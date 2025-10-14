import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Colors } from '../lib/colors';

interface NavbarProps {
  onQRScanPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onSettingsPress?: () => void;
  userName?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onQRScanPress,
  onNotificationPress,
  onProfilePress,
  onSettingsPress,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuItemPress = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  // QR Code Icon SVG
  const QRIcon = () => (
    <View style={styles.iconContainer}>
      <View style={styles.qrGrid}>
        <View style={[styles.qrSquare, { backgroundColor: Colors.deepSecurityBlue }]} />
        <View style={styles.qrSpace} />
        <View style={[styles.qrSquare, { backgroundColor: Colors.deepSecurityBlue }]} />
        <View style={styles.qrSpace} />
        <View style={[styles.qrSquare, { backgroundColor: Colors.deepSecurityBlue }]} />
        <View style={styles.qrSpace} />
        <View style={[styles.qrSquare, { backgroundColor: Colors.deepSecurityBlue }]} />
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
      {/* Left Section - App Name */}
      <View style={styles.leftSection}>
        <Text style={styles.appName}>HydroSnap</Text>
      </View>
      
      {/* Right Section - Icons */}
      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onQRScanPress} style={styles.iconButton}>
          <QRIcon />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
          <NotificationIcon />
        </TouchableOpacity>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton}>
            <MenuIcon />
          </TouchableOpacity>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(onProfilePress || (() => {}))}
              >
                <Text style={styles.menuItemText}>👤 Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(onSettingsPress || (() => {}))}
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
    height: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.deepSecurityBlue,
    paddingTop: 45, // Account for status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  leftSection: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
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
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 16,
    height: 16,
  },
  qrSquare: {
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  qrSpace: {
    width: 1,
    height: 3,
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
});

export default Navbar;