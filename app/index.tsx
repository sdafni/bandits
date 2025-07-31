import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';

export default function Index() {
  const [user, setUser] = useState<any | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/bandits');
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: 22, marginBottom: 24 }}>Sign in to continue</Text>
        
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: '#ccc', 
            padding: 10, 
            width: '100%', 
            marginBottom: 10,
            borderRadius: 5
          }}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: '#ccc', 
            padding: 10, 
            width: '100%', 
            marginBottom: 20,
            borderRadius: 5
          }}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button 
          title={loading ? "Signing in..." : "Sign in"} 
          onPress={handleEmailLogin}
          disabled={loading}
        />
        
        <Button 
          title="Sign up" 
          onPress={handleEmailSignup}
          disabled={loading}
        />
        
        <Text style={{ marginTop: 20, marginBottom: 10 }}>Or</Text>
        
        <Button title="Sign in with Google" onPress={handleGoogleLogin} />
        
        {error && <Text style={{ color: 'red', marginTop: 16 }}>{error}</Text>}
      </View>
    );
  }

  return null;
}