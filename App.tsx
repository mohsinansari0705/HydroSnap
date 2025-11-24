// React is used in JSX, but not in this file's direct code
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './lib/ThemeContext';
import { AuthProvider } from './lib/AuthContext';
import { NavigationProvider } from './lib/NavigationContext';
import AppNavigator from './components/AppNavigator';
import { Colors } from './lib/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <AppNavigator />
            <StatusBar style="dark" translucent={false} backgroundColor={Colors.softLightGrey} />
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}