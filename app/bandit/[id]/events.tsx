import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Event = Database['public']['Tables']['event']['Row'];
type BanditEventResponse = {
  event: Event;
}[];

export default function BanditEventsScreen() {
  const { id } = useLocalSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bandit_events')
          .select('event:event(*)')
          .eq('bandit_id', id as string);

        if (error) throw error;
        setEvents((data as unknown as BanditEventResponse).map(item => item.event) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Recommended Events' }} />
      <View style={styles.container}>
        <FlatList
          data={events}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <Image
                source={{ uri: item.image_url }}
                style={styles.eventImage}
              />
              <Text style={styles.eventName}>{item.name}</Text>
              <Text style={styles.eventDescription}>{item.description}</Text>
            </View>
          )}
          keyExtractor={item => item.id}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
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
  eventCard: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventName: {
    padding: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    padding: 12,
    paddingTop: 0,
    fontSize: 14,
    color: '#666',
  },
});