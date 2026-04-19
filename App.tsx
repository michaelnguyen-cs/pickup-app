// Pick-Up — Sports Discovery App
// Entry point: mounts gesture handler, safe area provider, and navigation
//
// react-native-gesture-handler MUST be imported first (before everything else)
// react-native-reanimated MUST be the Babel plugin (see babel.config.js)

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { LocationProvider } from './src/context/LocationContext';
import { SavedProvider } from './src/context/SavedContext';
import { PrefsProvider } from './src/context/PrefsContext';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocationProvider>
          {/* AuthProvider wraps everything that needs to know the current user.
              It must be outside AppNavigator so the navigator can read auth state. */}
          <AuthProvider>
            <SavedProvider>
              <PrefsProvider>
                <StatusBar style="light" />
                <AppNavigator />
              </PrefsProvider>
            </SavedProvider>
          </AuthProvider>
        </LocationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
