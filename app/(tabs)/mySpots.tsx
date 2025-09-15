import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { getUserLikedEvents, toggleEventLike } from '@/app/services/events';
import EventList from '@/components/EventList';
import { useCity } from '@/contexts/CityContext';
import { Database } from '@/lib/database.types';

type Event = Database['public']['Tables']['event']['Row'];



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

  const handleEventRemove = async (eventId: string) => {
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
      
      <EventList
        events={likedEvents}
        onEventLike={handleEventRemove}
        likedEventIds={new Set(likedEvents.map(event => event.id))}
        emptyMessage="No liked events yet"
        variant="vertical"
        showRecommendations={true}
        buttonType="remove"
        buttonText="Remove"
        scrollViewStyle={styles.scrollView}
      />
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

  noEventsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
}); 