import { useMapEvents } from '@/hooks/useMapEvents';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import EventList, { EventListRef } from './EventList';
import MapMarkers from './MapMarkers';

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
  
  // Create a handler that scrolls to the event instead of navigating
  const handleMarkerPress = (event: any) => {
    eventListRef.current?.scrollToEvent(event.id);
  };
  
  const { events, loading, error, banditId, calculateOptimalMapBounds, handleEventPress } = useMapEvents(handleMarkerPress);

  useEffect(() => {
    // Report errors to parent component
    if (error) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Calculate optimal region based on events
  const getOptimalRegion = () => {
    if (events.length === 0) {
      return initialRegion;
    }

    const mapBounds = calculateOptimalMapBounds(initialRegion);
    
    // Convert bounds to region format for react-native-maps
    const latSpan = mapBounds.bounds.north - mapBounds.bounds.south;
    const lngSpan = mapBounds.bounds.east - mapBounds.bounds.west;
    
    return {
      latitude: mapBounds.center.latitude,
      longitude: mapBounds.center.longitude,
      latitudeDelta: latSpan,
      longitudeDelta: lngSpan,
    };
  };

  console.log('🗺️ PlatformMapView rendering with region:', initialRegion);
  console.log('📍 Events count:', events.length);
  
  return (
    <View style={styles.container}>
      {/* Top 40% - Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={getOptimalRegion()}
          showsUserLocation={true}
          showsMyLocationButton={true}
          provider={undefined}
          mapType="standard"
          onMapReady={() => {
            console.log('🗺️ MapView onMapReady called');
            onMapReady();
          }}
          onRegionChange={(region) => {
            console.log('🗺️ MapView onRegionChange:', region);
            onRegionChange(region);
          }}
          loadingEnabled={true}
          loadingIndicatorColor="#666666"
          loadingBackgroundColor="#eeeeee"
        >
          <MapMarkers
            events={events}
            onEventPress={handleEventPress}
            MarkerComponent={Marker}
            showEventMarkers={true}
            showCenterMarker={false}
            centerCoordinates={{
              latitude: initialRegion.latitude,
              longitude: initialRegion.longitude,
            }}
            centerTitle="Athens"
            centerDescription="Historic center of Athens, Greece"
          />
          {children}
        </MapView>
      </View>
      
      {/* Bottom 60% - Events List */}
      <EventList
        ref={eventListRef}
        events={events}
        loading={loading}
        error={error}
        onEventPress={handleEventPress}
        banditId={banditId}
        variant="horizontal"
        showButton={false}
        imageHeight={120}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: '40%',
    backgroundColor: '#f0f0f0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
export { Marker };
