import { getEvents } from '@/app/services/events';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import EventCard from './EventCard';

interface MapViewProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMapReady: () => void;
  onError: (error: any) => void;
  onRegionChange: (region: any) => void;
  children: React.ReactNode;
}

// Import the Event type from database types
import { Database } from '@/lib/database.types';
type Event = Database['public']['Tables']['event']['Row'];

export default function PlatformMapView({ 
  initialRegion, 
  onMapReady, 
  onError, 
  onRegionChange, 
  children 
}: MapViewProps) {
  // Get banditId from URL params (same as city guide)
  const { banditId } = useLocalSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState(initialRegion);

  useEffect(() => {
    // Call onMapReady after component mounts
    setTimeout(() => {
      onMapReady();
    }, 100);

    // Fetch events data
    fetchEvents();
  }, [onMapReady, banditId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Use the same getEvents service as city guide - fetch by banditId
      const allEventsData = await getEvents({ banditId: banditId as string });
      
      // Filter out any events that still have null coordinates (extra safety)
      const validEvents = allEventsData.filter(event => 
        event.location_lat != null && 
        event.location_lng != null &&
        typeof event.location_lat === 'number' &&
        typeof event.location_lng === 'number'
      );
      
      setEvents(validEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const generateGoogleMapsEmbedUrl = () => {
    // Use a simple static Athens map embed URL
    // This will show Athens and users can explore from there
    return 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3144.5!2d23.7275!3d37.9838!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDU5JzAxLjYiTiAyM8KwNDMnMzkuMCJF!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus';
  };


  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    // Update the map center to the selected event location
    const newCenter = {
      latitude: event.location_lat,
      longitude: event.location_lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setCurrentMapCenter(newCenter);
    onRegionChange(newCenter);
  };

  return (
    <View style={styles.container}>
      {/* Top Half - Embedded Google Maps */}
      <View style={styles.mapContainer}>
        <iframe
          key={`${currentMapCenter.latitude}-${currentMapCenter.longitude}`}
          src={generateGoogleMapsEmbedUrl()}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </View>

      {/* Bottom Half - Events List */}
      <View style={styles.listContainer}>
        <Text style={styles.headerText}>Bandit Events & Locations</Text>
        
        {/* Events List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No events with valid locations found</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsContainer}
          >
            {events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onLike={() => {}} // No like functionality in map view
                isLiked={false}
                variant="horizontal"
                showButton={false}
                imageHeight={154}
                banditId={banditId as string}
                onPress={() => handleEventPress(event)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// Export a dummy Marker component for web
export const Marker = ({ children }: { children: React.ReactNode }) => {
  return null; // Don't render anything on web
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: '40%', // Reduced from 50% to 40% (20% reduction)
    backgroundColor: '#f0f0f0',
  },
  listContainer: {
    flex: 1, // Takes remaining space (60% of screen)
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerText: {
    fontFamily: 'Caros',
    fontWeight: '800',
    fontSize: 24,
    color: '#3C3C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  eventsContainer: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
});
