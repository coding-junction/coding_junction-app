import './src/utils/alertPolyfill';
import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linking } from './src/navigation/linking';
import { useAuthStore } from './src/store/useAuthStore';
import { useTestStore } from './src/store/useTestStore';
import { colors } from './src/theme/colors';
import { connectWebSocket, disconnectWebSocket } from './src/services/websocket';
import { CustomAlert } from './src/components/CustomAlert';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function App() {
  const isAuthHydrated = useAuthStore((state) => state.isHydrated);
  const isTestHydrated = useTestStore((state) => state.isHydrated);

  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  const isReady = isAuthHydrated && isTestHydrated;

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  // If not ready, we still want to render the container to trigger onLayout eventually
  // and we can show a temporary loading indicator if needed.
  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {isReady ? (
        <SafeAreaProvider>
          <NavigationContainer linking={linking}>
            <AppNavigator />
          </NavigationContainer>
          <CustomAlert />
        </SafeAreaProvider>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
