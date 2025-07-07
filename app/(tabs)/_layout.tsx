import { Tabs } from 'expo-router';
import React from 'react';

import BandiTeamIcon from '@/assets/icons/bandiTeam.svg';
import LocalBanditsIcon from '@/assets/icons/localBandits.svg';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarPosition: 'top',
        tabBarStyle: {
          borderTopWidth: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        },
      }}>
      <Tabs.Screen
        name="bandits"
        options={{
          title: 'local banDit',
          tabBarIcon: ({ color }) => <LocalBanditsIcon width={28} height={28} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="bandiTeam"
        options={{
          title: 'bandiTeam',
          tabBarIcon: ({ color }) => <BandiTeamIcon width={28} height={28} fill={color} />,
        }}
      />
    </Tabs>
  );
}
