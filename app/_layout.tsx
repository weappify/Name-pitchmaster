import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FieldMarkersProvider } from '@/context/FieldMarkersContext';
import { TeamsProvider } from '@/context/TeamsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncProfileFromUser } from '@/lib/profileSync';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const handleAuthCallbackUrl = useCallback(async (incomingUrl: string | null) => {
    if (!supabase || !incomingUrl || !incomingUrl.startsWith('pitchmaster://auth/callback')) {
      return;
    }

    const normalizedUrl = incomingUrl.replace('#', '?');
    const { queryParams } = Linking.parse(normalizedUrl);
    const accessToken =
      typeof queryParams?.access_token === 'string' ? queryParams.access_token : null;
    const refreshToken =
      typeof queryParams?.refresh_token === 'string' ? queryParams.refresh_token : null;
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return;
    }

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session ?? null);
      setLoading(false);

      if (data.session?.user) {
        void syncProfileFromUser(data.session.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);

      if (nextSession?.user) {
        void syncProfileFromUser(nextSession.user);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void Linking.getInitialURL().then((url) => {
      void handleAuthCallbackUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthCallbackUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleAuthCallbackUrl]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, router, segments, session]);

  useEffect(() => {
    console.log('[RootLayout] session exists:', !!session, 'loading:', loading, 'segments:', segments);
  }, [loading, segments, session]);

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading PitchMaster...</Text>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <TeamsProvider>
          <FieldMarkersProvider>
            <Slot />
          </FieldMarkersProvider>
        </TeamsProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F1EB',
  },
  loadingText: {
    color: '#1F1D19',
    fontSize: 15,
    fontWeight: '600',
  },
});
