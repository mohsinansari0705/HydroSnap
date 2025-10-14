import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import {
  createNeumorphicCard,
  createNeumorphicIconContainer,
  NeumorphicTextStyles,
} from '../lib/neumorphicStyles';
import { Colors } from '../lib/colors';

interface NavbarProps {
  onMenuPress: () => void;
  userName: string;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuPress, userName }) => {
  const styles = useMemo(() => createStyles(), []);
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.navbar}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton} activeOpacity={0.7}>
          <View style={styles.menuIconContainer}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.brandContainer}>
          <View style={styles.brandText}>
            <Text style={styles.appName}>HydroSnap</Text>
            <Text style={styles.tagline}>Water Level Monitoring</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rightSection}>        
        <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </View>
          <View style={styles.statusDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  navbar: {
    height: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Colors.deepSecurityBlue, // Use Deep Security Blue for navbar
    marginTop: 40,
    paddingTop: 10,
    // Neumorphic shadow for elevated effect
    shadowColor: Colors.deepSecurityBlue + '40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    ...createNeumorphicCard({ size: 'small', borderRadius: 14 }),
    padding: 14,
    backgroundColor: Colors.softLightGrey, // Light neumorphic button on dark navbar
  },
  menuIconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'space-between',
  },
  menuLine: {
    height: 3,
    backgroundColor: Colors.deepSecurityBlue,
    borderRadius: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    flex: 1,
  },
  logoContainer: {
    ...createNeumorphicIconContainer(48),
    backgroundColor: Colors.aquaTechBlue, // Accent color for logo
  },
  logo: {
    width: 30,
    height: 30,
    tintColor: Colors.white,
  },
  brandText: {
    marginLeft: 16,
  },
  appName: {
    ...NeumorphicTextStyles.heading,
    fontSize: 24,
    color: Colors.white, // White text on dark navbar
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: Colors.aquaTechBlue, // Accent color for tagline
    fontWeight: '600',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    ...createNeumorphicIconContainer(46),
    backgroundColor: Colors.aquaTechBlue, // Accent color for avatar
  },
  avatarText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.white,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.validationGreen,
    borderWidth: 3,
    borderColor: Colors.deepSecurityBlue,
  },
});

export default Navbar;