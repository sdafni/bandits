import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EventFilters, getEvents } from '@/app/services/events';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Bandit = Database['public']['Tables']['bandits']['Row'];
type Event = Database['public']['Tables']['event']['Row'];

interface EventCategory {
  genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
  count: number;
}

const genres = ['Food', 'Culture', 'Nightlife', 'Shopping', 'Coffee'];

export default function CityGuideScreen() {
  const { banditId } = useLocalSearchParams();
  const router = useRouter();
  const [bandit, setBandit] = useState<Bandit | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch bandit data
        const { data: banditData, error: banditError } = await supabase
          .from('bandits')
          .select('*')
          .eq('id', banditId as string)
          .single();

        if (banditError) throw banditError;
        setBandit(banditData);

        // Load events for this bandit
        await loadEvents();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [banditId]);

  const loadEvents = async () => {
    try {
      const filters: EventFilters = {
        banditId: banditId as string,
      };
      
      if (selectedGenre) {
        filters.genre = selectedGenre;
      }
      
      const eventsData = await getEvents(filters);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedGenre]);

  const handleAskMePress = () => {
    const phoneNumber = '+972544717932';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}`;
    
    Linking.canOpenURL(whatsappUrl).then((supported) => {
      if (supported) {
        return Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    });
  };

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
      <Stack.Screen options={{ headerShown: true, title: 'City Guide' }} />
      
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.headerText}>City Guide</Text>
        
        {/* Bandit Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: bandit.image_url }}
              style={styles.profileImage}
            />
          </View>
          
          <Text style={styles.descriptionText}>
            Yo, traveler. Your adventure just got upgraded.{'\n'}
            Welcome to the side of the city locals don't usually share.{'\n'}
            You've officially entered the bandiVerse. Let's go rogue.
          </Text>
        </View>
        
        {/* Genre Selection */}
        <Text style={styles.interestsText}>Select Your Interests</Text>
        
        <View style={styles.genreContainer}>
          {genres.map((genre) => (
            <Pressable
              key={genre}
              style={[
                styles.genreButton,
                selectedGenre === genre && styles.genreButtonSelected
              ]}
              onPress={() => setSelectedGenre(selectedGenre === genre ? '' : genre)}
            >
              <Text style={[
                styles.genreText,
                selectedGenre === genre && styles.genreTextSelected
              ]}>
                {genre}
              </Text>
            </Pressable>
          ))}
        </View>
        
        {/* Events List */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsContainer}
        >
                     {events.map((event, index) => (
             <View key={index} style={styles.eventCard}>
               <View style={styles.eventImageContainer}>
                 <Image
                   source={{ uri: event.image_url || 'https://via.placeholder.com/150' }}
                   style={styles.eventImage}
                 />
                 <View style={styles.ratingContainer}>
                   <Text style={styles.ratingText}>{event.rating.toFixed(1)}</Text>
                   <Text style={styles.starText}>★</Text>
                 </View>
               </View>
               <View style={styles.eventInfo}>
                 <Text style={styles.eventTitle}>{event.name}</Text>
                 <Text style={styles.eventDescription} numberOfLines={3}>
                   {event.description}
                 </Text>
                 <Text style={styles.eventTime}>{`${event.start_time}–${event.end_time}`}</Text>
               </View>
             </View>
           ))}
        </ScrollView>
        
        {/* Ask Me Button */}
        <Pressable style={styles.askMeButton} onPress={handleAskMePress}>
          <Text style={styles.askMeText}>Ask me</Text>
        </Pressable>
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
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  descriptionText: {
    fontFamily: 'Caros',
    fontWeight: '400',
    fontSize: 14,
    color: '#3C3C3C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  interestsText: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 17,
    color: '#3C3C3C',
    marginBottom: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genreButton: {
    width: 52,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#777777',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  genreButtonSelected: {
    borderColor: '#FF0000',
  },
  genreText: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 6,
    color: '#3C3C3C',
  },
  genreTextSelected: {
    color: '#777777',
  },
  eventsContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  eventCard: {
    width: 192,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImageContainer: {
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 256,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  eventInfo: {
    padding: 12,
  },
  eventTitle: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 14,
    color: '#3C3C3C',
    marginBottom: 4,
  },
  eventDescription: {
    fontFamily: 'Caros',
    fontWeight: '400',
    fontSize: 10,
    color: '#3C3C3C',
    marginBottom: 8,
    lineHeight: 12,
  },
  eventTime: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 16,
    color: '#FF0000',
    marginBottom: 8,
  },
  ratingContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 15,
    color: '#FFFFFF',
    marginRight: 4,
  },
  starText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  askMeButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  },
  askMeText: {
    fontFamily: 'Caros',
    fontWeight: '700',
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 