import { Fraunces_400Regular, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/lib/auth';
import '@/lib/notifications';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootStack ready={fontsLoaded} />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootStack({ ready }: { ready: boolean }) {
  const { session, loading } = useAuth();
  const t = useTheme();
  const scheme = useColorScheme();
  const signedIn = !!session;

  useEffect(() => {
    if (ready && !loading) SplashScreen.hideAsync();
  }, [ready, loading]);

  // Nothing from one account should be visible to the next.
  useEffect(() => {
    if (!loading && !signedIn) {
      queryClient.clear();
      useUI.setState({ openRowId: null, lastSeenSaved: null });
    }
  }, [loading, signedIn]);

  if (!ready || loading) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.bg, text: t.ink, border: t.divider, primary: t.accent },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.ink,
          headerTitleStyle: { fontFamily: fonts.bodyStrong },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="subscription/new" options={{ title: 'New subscription', presentation: 'modal' }} />
          <Stack.Screen name="subscription/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="subscription/[id]/edit" options={{ title: 'Edit subscription' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
