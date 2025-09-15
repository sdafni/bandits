import { getEvents } from '@/app/services/events';
import { Database } from '@/lib/database.types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

type Event = Database['public']['Tables']['event']['Row'];

export interface MapBounds {
  center: { latitude: number; longitude: number };
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export function useMapEvents() {
  const { banditId } = useLocalSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [banditId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allEventsData = await getEvents({ banditId: banditId as string });
      
      // Filter out any events that still have null coordinates
      const validEvents = allEventsData.filter(event => 
        event.location_lat != null && 
        event.location_lng != null &&
        typeof event.location_lat === 'number' &&
        typeof event.location_lng === 'number'
      );
      
      setEvents(validEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const calculateOptimalMapBounds = (initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }): MapBounds => {
    if (events.length === 0) {
      return {
        center: { latitude: initialRegion.latitude, longitude: initialRegion.longitude },
        zoom: 12,
        bounds: {
          north: initialRegion.latitude + initialRegion.latitudeDelta / 2,
          south: initialRegion.latitude - initialRegion.latitudeDelta / 2,
          east: initialRegion.longitude + initialRegion.longitudeDelta / 2,
          west: initialRegion.longitude - initialRegion.longitudeDelta / 2,
        }
      };
    }
    
    // Find the bounding box of all events
    const lats = events.map(event => event.location_lat);
    const lngs = events.map(event => event.location_lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate center point
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate the span (delta) of the bounding box
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    
    // Add some padding (10% on each side)
    const padding = 0.1;
    const paddedLatSpan = latSpan * (1 + padding * 2);
    const paddedLngSpan = lngSpan * (1 + padding * 2);
    
    // Calculate optimal zoom level based on the span
    let zoom = 14; // Default zoom
    
    if (paddedLatSpan > 0.1) zoom = 10;  // Very wide area
    else if (paddedLatSpan > 0.05) zoom = 11;  // Wide area
    else if (paddedLatSpan > 0.02) zoom = 12; // Medium area
    else if (paddedLatSpan > 0.01) zoom = 13; // Small area
    else if (paddedLatSpan > 0.005) zoom = 14; // Very small area
    else if (paddedLatSpan > 0.002) zoom = 15; // Tiny area
    else zoom = 16; // Very tiny area
    
    return {
      center: { latitude: centerLat, longitude: centerLng },
      zoom: zoom,
      bounds: {
        north: maxLat + (latSpan * padding),
        south: minLat - (latSpan * padding),
        east: maxLng + (lngSpan * padding),
        west: minLng - (lngSpan * padding)
      }
    };
  };

  const handleEventPress = (event: Event) => {
    const url = banditId 
      ? `/event/${event.id}?banditId=${banditId}` as any
      : `/event/${event.id}` as any;
    router.push(url);
  };

  return {
    events,
    loading,
    error,
    banditId: banditId as string,
    calculateOptimalMapBounds,
    handleEventPress,
    refetchEvents: fetchEvents,
  };
}
