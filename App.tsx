import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './lib/ThemeContext';
import { AuthProvider } from './lib/AuthContext';
import { NavigationProvider } from './lib/NavigationContext';
import AppNavigator from './components/AppNavigator';
import { Colors } from './lib/colors';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppNavigator />
          <StatusBar style="dark" backgroundColor={Colors.softLightGrey} />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}