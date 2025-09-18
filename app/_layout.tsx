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
  // Also check if user's email is verified
  useEffect(() => {
    if (user === undefined) return; // still loading
    const inAuthScreen = !segments[0];
    
    if (!user && !inAuthScreen) {
      // No user, redirect to sign-in
      router.replace('/');
    } else if (user && inAuthScreen) {
      // User exists, check if email is verified
      if (user.email_confirmed_at) {
        console.log('✅ User email verified, redirecting to app');
        router.replace('/(tabs)/bandits');
      } else {
        console.log('❌ User email not verified, staying on auth screen');
        // Don't redirect - user needs to verify email first
        // The signup screen will show the email verification message
      }
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
          <Stack.Screen name="bandit/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="cityGuide" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </CityProvider>
  );
}
