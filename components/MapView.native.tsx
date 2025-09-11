import React from 'react';
import MapView, { Marker } from 'react-native-maps';

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

export default function PlatformMapView({ 
  initialRegion, 
  onMapReady, 
  onError, 
  onRegionChange, 
  children 
}: MapViewProps) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={true}
      provider="google"
      onMapReady={onMapReady}
      onError={onError}
      onRegionChange={onRegionChange}
      loadingEnabled={true}
      loadingIndicatorColor="#666666"
      loadingBackgroundColor="#eeeeee"
    >
      {children}
    </MapView>
  );
}

export { Marker };
