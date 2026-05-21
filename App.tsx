import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ThemeProvider } from './src/theme/ThemeContext';
import { THEME } from './src/theme/theme';
import { AppStateProvider, useAppState } from './src/state/AppStateContext';
import { NavigationProvider } from './src/navigation/NavigationContext';
import { AppRouter } from './src/navigation/AppRouter';
import { hasSeenOnboarding, loadState, markOnboardingSeen } from './src/state/persistence';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LockScreen } from './src/screens/LockScreen';
import { AppState } from './src/data/types';
import { Route } from './src/navigation/routes';
import { setCurrency } from './src/data/format';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp({ initialRoute }: { initialRoute: Route }) {
  const { state } = useAppState();
  const t = state.dark ? THEME.dark : THEME.light;

  // Keep formatter in sync with selected currency
  useEffect(() => {
    setCurrency(state.currency || 'MXN');
  }, [state.currency]);

  return (
    <ThemeProvider dark={state.dark}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle={state.dark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
        <NavigationProvider initial={initialRoute}>
          <AppRouter />
        </NavigationProvider>
      </SafeAreaView>
    </ThemeProvider>
  );
}

function ThemedOnboarding({ onComplete }: { onComplete: () => void }) {
  const { state } = useAppState();
  return (
    <ThemeProvider dark={state.dark}>
      <SafeAreaView style={{ flex: 1, backgroundColor: state.dark ? THEME.dark.bg : THEME.light.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle={state.dark ? 'light-content' : 'dark-content'} />
        <OnboardingScreen onComplete={onComplete} />
      </SafeAreaView>
    </ThemeProvider>
  );
}

function ThemedLock({ onUnlock }: { onUnlock: () => void }) {
  const { state } = useAppState();
  return (
    <ThemeProvider dark={state.dark}>
      <SafeAreaView style={{ flex: 1, backgroundColor: state.dark ? THEME.dark.bg : THEME.light.bg }} edges={['top', 'bottom']}>
        <StatusBar barStyle={state.dark ? 'light-content' : 'dark-content'} />
        <LockScreen onUnlock={onUnlock} />
      </SafeAreaView>
    </ThemeProvider>
  );
}

function AppContent({
  showOnboarding,
  onOnboardingDone,
}: {
  showOnboarding: boolean;
  onOnboardingDone: () => void;
}) {
  const { state } = useAppState();
  const [unlocked, setUnlocked] = useState(!state.biometricLock);

  // Sync currency formatter once
  useEffect(() => {
    setCurrency(state.currency || 'MXN');
  }, [state.currency]);

  if (showOnboarding) {
    return <ThemedOnboarding onComplete={onOnboardingDone} />;
  }
  if (state.biometricLock && !unlocked) {
    return <ThemedLock onUnlock={() => setUnlocked(true)} />;
  }
  return <ThemedApp initialRoute={{ screen: 'dashboard' }} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [bootstrap, setBootstrap] = useState<{
    ready: boolean;
    persistedState: AppState | null;
    showOnboarding: boolean;
  }>({ ready: false, persistedState: null, showOnboarding: false });

  useEffect(() => {
    Promise.all([loadState(), hasSeenOnboarding()])
      .then(([persisted, seen]) => {
        setBootstrap({ ready: true, persistedState: persisted, showOnboarding: !seen });
      })
      .catch(() => {
        setBootstrap({ ready: true, persistedState: null, showOnboarding: true });
      });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && bootstrap.ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, bootstrap.ready]);

  if ((!fontsLoaded && !fontError) || !bootstrap.ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.light.bg }}>
        <ActivityIndicator size="large" color={THEME.light.indigo} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppStateProvider initial={bootstrap.persistedState || undefined}>
        <AppContent
          showOnboarding={bootstrap.showOnboarding}
          onOnboardingDone={() => {
            markOnboardingSeen();
            setBootstrap(b => ({ ...b, showOnboarding: false }));
          }}
        />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
