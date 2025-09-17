import { useMapEvents } from '@/hooks/useMapEvents';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import EventList, { EventListRef } from './EventList';

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
  children?: React.ReactNode;
}

export default function PlatformMapView({ 
  initialRegion, 
  onMapReady, 
  onError, 
  onRegionChange, 
  children 
}: MapViewProps) {
  const eventListRef = useRef<EventListRef>(null);
  const { banditId } = useLocalSearchParams();
  
  // Create a handler that scrolls to the event instead of navigating
  // Note: For web, we can't handle marker clicks directly from the embedded Google Maps
  // But we maintain the same structure for consistency and potential future enhancements
  const handleMarkerPress = (event: any) => {
    eventListRef.current?.scrollToEvent(event.id);
  };
  
  const { events, loading, error, calculateOptimalMapBounds } = useMapEvents();

  useEffect(() => {
    // Call onMapReady after component mounts
    setTimeout(() => {
      onMapReady();
    }, 100);

    // Report errors to parent component
    if (error) {
      onError(new Error(error));
    }
  }, [onMapReady, error, onError]);

  const generateGoogleMapsEmbedUrl = () => {
    // Get API key from environment or app config
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || 
                   Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
                   Constants.expoConfig?.ios?.config?.googleMapsApiKey;
    
    // If we have events, show all locations using search
    if (events.length > 0) {
      // Calculate optimal bounds for all events
      const mapBounds = calculateOptimalMapBounds(initialRegion);
      
      // Create a search query with all event names and addresses
      const searchQuery = events.map(event => 
        `${event.name} ${event.address}`
      ).join(' OR ');
      
      // Use Google Maps embed with search, centered and zoomed optimally
      const embedUrl = `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(searchQuery)}&center=${mapBounds.center.latitude},${mapBounds.center.longitude}&zoom=${mapBounds.zoom}`;
      return embedUrl;
    }
    
    // Fallback to static Athens map if no events
    return 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3144.5!2d23.7275!3d37.9838!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDU5JzAxLjYiTiAyM8KwNDMnMzkuMCJF!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus';
  };

  return (
    <View style={styles.container}>
      {/* Top Half - Embedded Google Maps */}
      <View style={styles.mapContainer}>
        <iframe
          key={`${events.length}-${events.map(e => e.id).join(',')}`}
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
      <EventList
        ref={eventListRef}
        events={events}
        loading={loading}
        error={error}
        banditId={banditId as string}
        variant="horizontal"
        showButton={false}
        imageHeight={154}
      />
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
});
