import { CityProvider } from '@/contexts/CityContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [user, setUser] = useState<any | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Redirect logic: if not on the sign-in page and not authenticated, redirect to "/"
  // If authenticated and on sign-in page, redirect to bandits
  useEffect(() => {
    if (user === undefined) return; // still loading
    const inAuthScreen = !segments[0];
    
    if (!user && !inAuthScreen) {
      router.replace('/');
    } else if (user && inAuthScreen) {
      router.replace('/(tabs)/bandits');
    }
  }, [user, segments, router]);

  if (!loaded || user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <CityProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="bandit/[id] ?" options={{ headerShown: true }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </CityProvider>
  );
}
