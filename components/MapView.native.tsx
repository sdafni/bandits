import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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
  console.log('🗺️ PlatformMapView rendering with region:', initialRegion);
  
  return (
    <View style={styles.container}>

    <MapView
    style={styles.map}

      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={true}
      provider={undefined}
      mapType="standard"
      onMapReady={() => {
        console.log('🗺️ MapView onMapReady called');
        onMapReady();
      }}
      onError={(error) => {
        console.error('🗺️ MapView onError:', error);
        onError(error);
      }}
      onRegionChange={(region) => {
        console.log('🗺️ MapView onRegionChange:', region);
        onRegionChange(region);
      }}
      loadingEnabled={true}
      loadingIndicatorColor="#666666"
      loadingBackgroundColor="#eeeeee"
    >
      {/* Just show Athens center marker for now */}
      <Marker
        coordinate={{
          latitude: initialRegion.latitude,
          longitude: initialRegion.longitude,
        }}
        title="Athens"
        description="Historic center of Athens, Greece"
      />
    </MapView>
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
});
export { Marker };
