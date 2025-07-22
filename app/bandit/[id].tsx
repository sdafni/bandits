import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
type Bandit = Database['public']['Tables']['bandits']['Row'];

export default function BanditScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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
          style={styles.mainImage}
        />
        <Pressable
          style={styles.cityGuideButton}
          onPress={() => router.push(`/bandit/${id}/events`)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.cityGuideText}>city guide</Text>
        </Pressable>
     
    </View>
    <Text style={styles.name}>{`${bandit.name} ${bandit.family_name}, ${bandit.city}`}</Text>
    <Text style={styles.descriptionLine}>{`(${bandit.age} y/o, local banDit)`}</Text>
    <Text style={styles.occupation}>{bandit.occupation}</Text>
    
        <Text style={styles.description}>{bandit.description}</Text>




    <Text style={styles.whyFollowLabel}>{`Why follow ${bandit.name}?`}</Text>

        {bandit.why_follow ? (
      <Text style={styles.why_follow}>
        {bandit.why_follow
          .split('.')
          .filter(s => s.trim().length > 0)
          .map((sentence, i) => (
            <Text key={i}>
              {'\n• '}{sentence.trim()}.
            </Text>
          ))}
      </Text>
    ) : null}

    
  </View>


  
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  mainImage: {
    width: '100%',
    height: 145,
    borderRadius: 30,
    opacity: 1,
    zIndex: 1,
  },
  name: {
    fontWeight: '700',
    fontSize: 17,
    color: '#222',
    marginBottom: 4,
  },
  descriptionLine: {
    fontWeight: '400',
    fontSize: 12,
    color: '#3C3C3C',
    marginBottom: 4,
  },
  occupation: {
    fontWeight: '600',
    fontSize: 13,
    color: '#3C3C3C',
    marginBottom: 10,
  },
  whyFollowLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#3C3C3C',
    marginBottom: 10,
  },
  description: {
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 8,
  },
  why_follow: {
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 8,
    marginLeft: 16,
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

  cityGuideButton: {
    position: 'absolute',
    left: 16,
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
    zIndex: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cityGuideText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});