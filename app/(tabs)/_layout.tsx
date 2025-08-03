import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import BandiTeamIcon from '@/assets/icons/bandiTeam.svg';
import CityGuideIcon from '@/assets/icons/cityGuide.svg';
import LocalBanditsIcon from '@/assets/icons/localBandits.svg';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const iconColor = 'white';

  return (
    <View style={{ flex: 1 }}>
      {/* <ModeHeader /> */}
    <Tabs
      screenOptions={{
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
            tabBarIcon: () => <LocalBanditsIcon width={28} height={28} fill={iconColor} />,
        }}
      />

      <Tabs.Screen
        name="mySpots"
        options={{
        title: 'My Spots',
          tabBarIcon: () => <BandiTeamIcon width={28} height={28} fill={iconColor} />,
        }}
      />

      <Tabs.Screen
        name="cityGuide"
        options={{
          title: 'Explore',
          tabBarIcon: () => <CityGuideIcon width={28} height={28} fill={iconColor} />,
        }}
      />


    </Tabs>
    </View>
  );
}
