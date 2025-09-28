import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getEvents } from '@/app/services/events';
import EventCategories from '@/components/EventCategories';
import EventList from '@/components/EventList';
import { EventGenre } from '@/constants/Genres';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Bandit = Database['public']['Tables']['bandit']['Row'];
type Event = Database['public']['Tables']['event']['Row'];


export default function CityGuideScreen() {
  const { banditId, genre } = useLocalSearchParams();
  const [bandit, setBandit] = useState<Bandit | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]); // All events for this bandit
  const [selectedGenre, setSelectedGenre] = useState<string>(genre as string || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch bandit data
        const { data: banditData, error: banditError } = await supabase
          .from('bandit')
          .select('*')
          .eq('id', banditId as string)
          .single();

        if (banditError) throw banditError;
        setBandit(banditData);

        // Load all events for this bandit once
        const allEventsData = await getEvents({ banditId: banditId as string });
        setAllEvents(allEventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [banditId]);

  // Filter events locally based on selected genre
  const filteredEvents = selectedGenre 
    ? allEvents.filter(event => event.genre === selectedGenre)
    : allEvents;

  // Calculate category counts from all events
  const getEventCategories = () => {
    const categoryCounts: { [key: string]: number } = {};
    
    allEvents.forEach(event => {
      if (event.genre) {
        categoryCounts[event.genre] = (categoryCounts[event.genre] || 0) + 1;
      }
    });

    return Object.entries(categoryCounts).map(([genre, count]) => ({
      genre: genre as EventGenre,
      count
    }));
  };

  const eventCategories = getEventCategories();




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
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.headerText}>City Guide</Text>

        {/* Bandit Profile Section */}
        <View style={styles.profileSection}>


          <View style={styles.descriptionContent}>

            <Text style={styles.descriptionText}>
              Yo, traveler. Your adventure just got upgraded.{'\n'}
              Welcome to the side of the city locals don't usually share.{'\n'}
              You've officially entered the bandiVerse. Let's go rogue.
            </Text>

            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: bandit.image_url }}
                style={styles.profileImage}
              />
            </View>

          </View>
        </View>

        {/* Event Categories - Only show if there are events in DB */}
        {allEvents.length > 0 && eventCategories.length > 0 && (
          <>
            <Text style={styles.interestsText}>Select Your Interests</Text>
            <EventCategories
              categories={eventCategories}
              selectedGenre={selectedGenre}
              onCategoryPress={(genre) => setSelectedGenre(selectedGenre === genre ? '' : genre)}
            />
          </>
        )}

        {/* Events List */}
        <EventList
          events={filteredEvents}
          variant="horizontal"
          showButton={false}
          imageHeight={120}
          banditId={banditId as string}
          contentContainerStyle={styles.eventsContainer}
        />

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
  headerText: {
    fontFamily: 'Caros',
    fontWeight: '800',
    fontSize: 24,
    color: '#3C3C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: 16,
    // Removed red border as requested
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },

  descriptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  banditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  descriptionText: {
    fontFamily: 'Caros',
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    textAlign: 'left', // Left align the text
    lineHeight: 20,
    flex: 1, // Take up available space
    marginRight: 16, // Add some space between text and image
  },
  interestsText: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 17,
    color: '#3C3C3C',
    marginBottom: 16,
  },
  eventsContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
    marginTop: 8,
  },
}); 