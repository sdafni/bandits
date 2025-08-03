import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getUserLikedEvents, toggleEventLike } from '@/app/services/events';
import { useCity } from '@/contexts/CityContext';
import { Database } from '@/lib/database.types';

type Event = Database['public']['Tables']['event']['Row'];

const EventCard = ({ event, onLike, isLiked }: { 
  event: Event; 
  onLike: () => void;
  isLiked: boolean;
}) => (
  <View style={styles.eventCard}>
    <View style={styles.eventHeader}>
      <Text style={styles.eventName}>{event.name}</Text>
      <TouchableOpacity onPress={onLike} style={styles.likeButton}>
        <Text style={[styles.heartIcon, isLiked && styles.heartIconLiked]}>
          {isLiked ? '❤️' : '🤍'}
        </Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.eventAddress}>{event.address}</Text>
    <Text style={styles.eventGenre}>{event.genre}</Text>
    <Text style={styles.eventDescription}>{event.description}</Text>
    <Text style={styles.eventTime}>
      {new Date(event.start_time).toLocaleDateString()} - {new Date(event.end_time).toLocaleDateString()}
    </Text>
  </View>
);

export default function MySpotsScreen() {
  const [likedEvents, setLikedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCity } = useCity();

  useEffect(() => {
    loadLikedEvents();
  }, []);

  // Reload liked events on every navigation to this screen
  useFocusEffect(
    React.useCallback(() => {
      loadLikedEvents();
    }, [selectedCity])
  );

  const loadLikedEvents = async () => {
    try {
      setLoading(true);
      const events = await getUserLikedEvents();
      
      // Filter events by selected city if a city is selected
      const filteredEvents = selectedCity 
        ? events.filter(event => event.city === selectedCity)
        : events;
      
      setLikedEvents(filteredEvents);
    } catch (error) {
      console.error('Error loading liked events:', error);
      Alert.alert('Error', 'Failed to load your liked events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventLike = async (eventId: string) => {
    try {
      await toggleEventLike(eventId, true); // true because it's currently liked
      
      // Remove from local state
      setLikedEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error removing event like:', error);
      Alert.alert('Error', 'Failed to remove like');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading your spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          My Spots {selectedCity ? `in ${selectedCity}` : ''}
        </Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          {likedEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No liked events yet</Text>
          ) : (
            likedEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onLike={() => handleEventLike(event.id)}
                isLiked={true}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3C3C3C',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 11,
  },
  eventCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  likeButton: {
    padding: 4,
  },
  heartIcon: {
    fontSize: 20,
  },
  heartIconLiked: {
    fontSize: 20,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flex: 1,
  },
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventGenre: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
}); 