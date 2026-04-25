import { useEffect, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADMIN_EMAIL } from '@/lib/constants';
import { getProfileRecord } from '@/lib/profileSync';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ACTIVE_COLOR = '#1E6E31';
const INACTIVE_COLOR = '#6A665E';
export const APP_SIDEBAR_EXPANDED_WIDTH = 188;
export const APP_SIDEBAR_COLLAPSED_WIDTH = 68;

type AppSidebarTabBarProps = BottomTabBarProps & {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function AppSidebarTabBar({
  state,
  descriptors,
  navigation,
  collapsed,
  onToggleCollapse,
}: AppSidebarTabBarProps) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    const loadAuthUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);

      if (user?.id) {
        const profile = await getProfileRecord(user.id);
        setAvatarUrl(profile?.avatar_url ?? null);
      } else {
        setAvatarUrl(null);
      }
    };

    void loadAuthUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        setUser(null);
        setAvatarUrl(null);
        return;
      }

      const {
        data: { user: nextUser },
      } = await supabase.auth.getUser();

      setUser(nextUser ?? nextSession.user ?? null);
      const profile = await getProfileRecord(nextUser?.id ?? nextSession.user.id);
      setAvatarUrl(profile?.avatar_url ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refreshAvatar = async () => {
      if (!user?.id) {
        setAvatarUrl(null);
        return;
      }

      const profile = await getProfileRecord(user.id);
      setAvatarUrl(profile?.avatar_url ?? null);
    };

    void refreshAvatar();
  }, [state.index, user?.id]);

  const displayName =
    typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : user?.email ?? '';
  const userEmail = user?.email ?? '';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const subscriptionLabel = isAdmin ? 'Admin' : 'Free';
  const initials = (displayName || 'PM')
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    if (!supabase) {
      router.replace('/(auth)/login');
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log(error.message);
      return;
    }

    router.replace('/(auth)/login');
  };

  return (
    <View
      style={[
        styles.sidebar,
        collapsed ? styles.sidebarCollapsed : null,
        {
          width: collapsed ? APP_SIDEBAR_COLLAPSED_WIDTH : APP_SIDEBAR_EXPANDED_WIDTH,
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}>
      <View style={styles.topSection}>
        <View style={[styles.headerRow, collapsed && styles.headerRowCollapsed]}>
          {collapsed ? (
            <View style={styles.compactBrandBadge}>
              <Text style={styles.compactBrandText}>PM</Text>
            </View>
          ) : (
            <View style={styles.brandBlock}>
              <Text style={styles.brandLine}>PITCH</Text>
              <Text style={styles.brandLine}>MASTER</Text>
              <Text style={styles.brandSubhead}>ELITE TACTICAL ANALYST</Text>
            </View>
          )}
        </View>

        <View style={styles.navList}>
          {state.routes
            .filter((route) => {
              if (descriptors[route.key].options.href === null) {
                return false;
              }

              if (route.name === 'users-projects' && !isAdmin) {
                return false;
              }

              return true;
            })
            .map((route) => {
              const descriptor = descriptors[route.key];
              const { options } = descriptor;
              const routeIndex = state.routes.findIndex((item) => item.key === route.key);
              const isFocused = state.index === routeIndex;
              const label = typeof options.title === 'string' ? options.title : route.name;
              const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const icon =
                typeof options.tabBarIcon === 'function'
                  ? options.tabBarIcon({ focused: isFocused, color, size: 22 })
                  : null;

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={onPress}
                  style={[
                    styles.navItem,
                    collapsed && styles.navItemCollapsed,
                    isFocused && styles.navItemActive,
                  ]}>
                  <View style={styles.navIcon}>{icon}</View>
                  {!collapsed ? (
                    <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>{label}</Text>
                  ) : null}
                </Pressable>
              );
            })}
        </View>
      </View>

      <View style={[styles.profileCard, collapsed && styles.profileCardCollapsed]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/profile')}
          style={[styles.profileSummaryButton, collapsed && styles.profileSummaryButtonCollapsed]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} contentFit="cover" style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
          {!collapsed ? (
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{userEmail}</Text>
              <Text style={styles.profileRole}>{subscriptionLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLogout}
          style={[styles.logoutButton, collapsed && styles.logoutButtonCollapsed]}>
          {collapsed ? (
            <IconSymbol
              size={18}
              name="rectangle.portrait.and.arrow.right"
              color="#1E6E31"
            />
          ) : (
            <Text style={styles.logoutButtonText}>Log Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onPress={onToggleCollapse}
        style={styles.collapseButton}>
        <IconSymbol
          size={18}
          name="chevron.right"
          color="#1E6E31"
          style={collapsed ? undefined : styles.collapseIconExpanded}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#F7F5F1',
    borderRightWidth: 1,
    borderRightColor: '#E4DDD2',
    paddingHorizontal: 14,
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'visible',
  },
  sidebarCollapsed: {
    paddingHorizontal: 10,
  },
  topSection: {
    gap: 18,
    minHeight: 0,
    flexShrink: 1,
  },
  headerRow: {
    alignItems: 'flex-start',
    width: '100%',
    flexShrink: 0,
  },
  headerRowCollapsed: {
    alignItems: 'center',
  },
  brandBlock: {
    gap: 0,
  },
  compactBrandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBrandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  brandLine: {
    color: '#1D6C2F',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  brandSubhead: {
    marginTop: 6,
    color: '#8B8479',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
  },
  collapseButton: {
    position: 'absolute',
    top: '50%',
    right: -18,
    marginTop: -24,
    width: 36,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DDD2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  collapseIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  navList: {
    gap: 10,
    flexShrink: 1,
  },
  navItem: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navItemCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: INACTIVE_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    color: ACTIVE_COLOR,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 'auto',
    flexShrink: 0,
  },
  profileCardCollapsed: {
    padding: 8,
    alignItems: 'center',
  },
  profileSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileSummaryButtonCollapsed: {
    justifyContent: 'center',
  },
  logoutButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#F1EEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonCollapsed: {
    width: 38,
    paddingHorizontal: 0,
  },
  logoutButtonText: {
    color: '#1E6E31',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D8E7DA',
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2BA6B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  profileText: {
    gap: 2,
    flex: 1,
  },
  profileName: {
    color: '#24221E',
    fontSize: 12,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#6A665E',
    fontSize: 11,
  },
  profileRole: {
    color: '#1E6E31',
    fontSize: 10,
    fontWeight: '700',
  },
});
