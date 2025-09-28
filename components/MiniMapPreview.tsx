import { getEvents } from '@/app/services/events';
import { Database } from '@/lib/database.types';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LeafletMapView from './LeafletMapView';

type Event = Database['public']['Tables']['event']['Row'];

interface MiniMapPreviewProps {
  banditId: string;
  onPress: () => void;
  style?: any;
}

const ATHENS_COORDINATES = {
  latitude: 37.9838,
  longitude: 23.7275,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function MiniMapPreview({ banditId, onPress, style }: MiniMapPreviewProps) {
  const [mapRegion, setMapRegion] = useState(ATHENS_COORDINATES);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  useEffect(() => {
    calculateOptimalRegion();
  }, [banditId]);

  const calculateOptimalRegion = async () => {
    try {
      const allEventsData = await getEvents({ banditId });

      // Filter out any events that still have null coordinates
      const validEvents = allEventsData.filter(event =>
        event.location_lat != null &&
        event.location_lng != null &&
        typeof event.location_lat === 'number' &&
        typeof event.location_lng === 'number'
      );

      if (validEvents.length === 0) {
        // No events with coordinates, use default region
        setMapRegion(ATHENS_COORDINATES);
        setEventsLoaded(true);
        return;
      }

      // Calculate bounding box from events
      const lats = validEvents.map(event => event.location_lat);
      const lngs = validEvents.map(event => event.location_lng);

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

      // Add some padding (20% on each side for mini map)
      const padding = 0.2;
      const paddedLatSpan = Math.max(latSpan * (1 + padding * 2), 0.01); // Minimum span
      const paddedLngSpan = Math.max(lngSpan * (1 + padding * 2), 0.01); // Minimum span

      setMapRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: paddedLatSpan,
        longitudeDelta: paddedLngSpan,
      });
      setEventsLoaded(true);
    } catch (error) {
      console.error('Error calculating mini map region:', error);
      setMapRegion(ATHENS_COORDINATES);
      setEventsLoaded(true);
    }
  };

  const handleMapReady = () => {
    // Mini map is ready - no action needed
  };

  const handleMapError = (error: any) => {
    console.error('Mini map error:', error);
  };

  const handleRegionChange = (region: any) => {
    // No region change handling needed for mini map
  };

  if (!eventsLoaded) {
    // Show a simple placeholder while calculating region
    return (
      <Pressable onPress={onPress} style={[styles.container, style]}>
        <View style={[styles.mapWrapper, styles.loadingWrapper]}>
          {/* Empty placeholder while loading */}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.container, style]}>
      <View style={styles.mapWrapper}>
        <LeafletMapView
          initialRegion={mapRegion}
          onMapReady={handleMapReady}
          onError={handleMapError}
          onRegionChange={handleRegionChange}
          miniMode={true}
          banditId={banditId}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 70,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingWrapper: {
    backgroundColor: '#f0f0f0',
  },
});