import { useMapEvents } from '@/hooks/useMapEvents';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import EventsList from './EventsList';
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
  const { events, loading, error, banditId, calculateOptimalMapBounds, handleEventPress } = useMapEvents();

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
          showCenterMarker={true}
          centerCoordinates={{
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
          }}
          centerTitle="Athens"
          centerDescription="Historic center of Athens, Greece"
        />
        {children}
      </MapView>
      
      {/* Events List Overlay */}
      <View style={styles.eventsOverlay}>
        <EventsList
          events={events}
          loading={loading}
          error={error}
          onEventPress={handleEventPress}
          banditId={banditId}
          title="Bandit Events & Locations"
          variant="horizontal"
          showButton={false}
          imageHeight={120}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  eventsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
export { Marker };
