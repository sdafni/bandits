import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
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
      
      <View >
        <Text style={styles.cityName}>{bandit.city} </Text>
      </View>

      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: bandit.image_url }} 
            style={styles.image}
          />
        </View>
      {/* bandit bottom bar */}
      <View style={styles.contentContainer}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          <ThemedText style={styles.mainInfo}>
            <ThemedText style={styles.bold}>{bandit.name}</ThemedText>
            <ThemedText style={styles.bold}>{bandit.family_name},</ThemedText>
            <ThemedText style={styles.bold}>, {bandit.city}</ThemedText>
          </ThemedText>

          <ThemedText style={styles.occupation}>({bandit.occupation})</ThemedText>
        </View>

        {/* Center Logo */}
        <View style={styles.centerSection}>
          <Image
            source={require('@/assets/images/banditour-logo.png')}
            style={styles.logo}
          />
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          <View style={styles.ratingContainer}>
            <ThemedText style={styles.stars}>⭐️</ThemedText>
            <ThemedText style={styles.rating}>{bandit.rating}</ThemedText>
          </View>
        </View>
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


  mainImage: {
    width: '100%',
    height: 143,
 
    borderRadius: 30,
    opacity: 1,
    transform: [{ rotate: '0deg' }],
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  leftSection: {
    flex: 2, // Give more space to the text sections
  },
  centerSection: {
    flex: 1, // Give the center section a flex value
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
  },
  rightSection: {
    flex: 2, // Give more space to the text sections
    alignItems: 'flex-end',
  },
  mainInfo: {
    fontSize: 12, //doesnt work , i overrode ThemedText
    lineHeight: 12,
    letterSpacing: 0,
    marginBottom: 4,
  },
  bold: {
    fontFamily: 'Caros',
    fontWeight: '700',
    color: '#000000',
  },
  occupation: {
    fontFamily: 'Caros-Regular',
    fontSize: 12,
    color: '#777777',
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    fontSize: 16,
  },
  rating: {
    fontFamily: 'Caros-Bold',
    fontSize: 14,
    color: '#000000',
  },
  cityName: {
    fontSize: 36,
    backgroundColor: '#FFFFFF',
    fontWeight: '800'
  }  
}); 