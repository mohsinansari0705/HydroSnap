// React is used in JSX, but not in this file's direct code
import React from 'react';
import { LanguageProvider } from './lib/LanguageContext';
import './lib/i18n';

export default function App() {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}