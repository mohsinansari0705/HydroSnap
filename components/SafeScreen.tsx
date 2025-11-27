import React from 'react';
import { StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../lib/colors';

interface SafeScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  useScrollView?: boolean;
  statusBarStyle?: 'light' | 'dark';
}

/**
 * Universal SafeScreen wrapper component
 *
 * Usage:
 * <SafeScreen>
 *   <YourScreenContent />
 * </SafeScreen>
 * 
 * Advanced usage with custom edges:
 * <SafeScreen edges={['top', 'left', 'right']} backgroundColor="#fff">
 *   <YourScreenContent />
 * </SafeScreen>
 */

const SafeScreen: React.FC<SafeScreenProps> = ({ 
  children, 
  backgroundColor = Colors.softLightGrey,
  edges = ['top', 'bottom', 'left', 'right'], // Default: protect all edges
  statusBarStyle = 'dark'
}) => {
  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor }]}
      edges={edges}
    >
      {/* Status bar configuration for Android */}
      {Platform.OS === 'android' && (
        <RNStatusBar
          backgroundColor={backgroundColor}
          barStyle={statusBarStyle === 'dark' ? 'dark-content' : 'light-content'}
          translucent={false}
        />
      )}
      
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});

export default SafeScreen;
