import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
type Bandit = Database['public']['Tables']['bandits']['Row'];

export default function BanditScreen() {
  const { id } = useLocalSearchParams();
  const [bandit, setBandit] = useState<Bandit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBandit = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bandits')
          .select('*')
          .eq('id', id as string)
          .single();

        if (error) throw error;
        setBandit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bandit');
      } finally {
        setLoading(false);
      }
    };

    fetchBandit();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!bandit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Bandit not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: bandit.name }} />
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: bandit.image_url }} 
            style={styles.image}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.description}>{bandit.description}</Text>
          <Text style={styles.whyFollow}>{bandit.why_follow}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 30,
    resizeMode: 'cover',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
    color: '#333',
  },
  whyFollow: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
}); 