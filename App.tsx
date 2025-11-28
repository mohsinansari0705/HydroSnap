// React is used in JSX, but not in this file's direct code
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './lib/ThemeContext';
import { AuthProvider } from './lib/AuthContext';
import { NavigationProvider } from './lib/NavigationContext';
import AppNavigator from './components/AppNavigator';
import { Colors } from './lib/colors';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  // Preload commonly used icons for instant rendering
  useEffect(() => {
    console.log('🎨 Preloading icons for better performance...');
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <StatusBar style="dark" translucent={false} backgroundColor={Colors.softLightGrey} />
            
            {/* Hidden icon preloader - loads icons into memory */}
            <View style={{ opacity: 0, position: 'absolute', left: -1000 }}>
              <Ionicons name="qr-code" size={1} />
              <Ionicons name="camera" size={1} />
              <Ionicons name="checkmark-circle" size={1} />
              <Ionicons name="location" size={1} />
              <Ionicons name="home" size={1} />
              <Ionicons name="settings" size={1} />
              <Ionicons name="person" size={1} />
              <Ionicons name="sunny-outline" size={1} />
              <Ionicons name="information-circle" size={1} />
              <Ionicons name="refresh" size={1} />
              <MaterialCommunityIcons name="brain" size={1} />
              <MaterialCommunityIcons name="eye-outline" size={1} />
              <MaterialCommunityIcons name="weather-partly-cloudy" size={1} />
              <MaterialCommunityIcons name="image-check-outline" size={1} />
              <MaterialCommunityIcons name="note-text-outline" size={1} />
              <MaterialCommunityIcons name="hand-okay" size={1} />
              <MaterialCommunityIcons name="pencil-outline" size={1} />
            </View>
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}