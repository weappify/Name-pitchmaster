import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ADMIN_EMAIL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);
    };

    void loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const displayName =
    typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : user?.email ?? 'No user loaded';
  const email = user?.email ?? '';
  const accountRole = user?.email === ADMIN_EMAIL ? 'Admin' : 'Free';

  const handleLogout = async () => {
    if (!supabase) {
      router.replace('/(auth)/login');
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }

    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage your account access and keep room for future app preferences.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountSummary}>
          <Text style={styles.accountName}>{displayName}</Text>
          <Text style={styles.accountEmail}>{email}</Text>
          <Text style={styles.accountRole}>{accountRole}</Text>
        </View>

        <Pressable onPress={() => router.push('/profile')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Open Profile</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        <Text style={styles.placeholderText}>
          Future preferences like display, tactical defaults, and notification settings can live here.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Session</Text>
        <Pressable onPress={handleLogout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 20,
    shadowColor: '#CBD5E1',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 6,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accountSummary: {
    gap: 4,
  },
  accountName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  accountEmail: {
    color: '#475569',
    fontSize: 14,
  },
  accountRole: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#F1EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    color: '#1E6E31',
    fontSize: 14,
    fontWeight: '800',
  },
});
