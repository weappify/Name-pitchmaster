import { Tabs } from 'expo-router';
import React, { useState } from 'react';

import {
  AppSidebarTabBar,
  APP_SIDEBAR_COLLAPSED_WIDTH,
  APP_SIDEBAR_EXPANDED_WIDTH,
} from '@/components/AppSidebarTabBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Tabs
      tabBar={(props) => (
        <AppSidebarTabBar
          {...props}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        />
      )}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarPosition: 'left',
        tabBarStyle: {
          width: isSidebarCollapsed ? APP_SIDEBAR_COLLAPSED_WIDTH : APP_SIDEBAR_EXPANDED_WIDTH,
        },
        sceneStyle: {
          backgroundColor: '#F4F1EB',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="field"
        options={{
          title: 'Field',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="square.grid.2x2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="note.text" color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="users-projects"
        options={{
          title: "Users' Projects",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="person.2.crop.square.stack.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
