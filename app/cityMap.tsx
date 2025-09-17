import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import PlatformMapView from '../components/MapView';

// Check if we're running on web
const isWeb = Platform.OS === 'web';

const ATHENS_COORDINATES = {
  latitude: 37.9838,
  longitude: 23.7275,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function CityMapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🗺️ CityMapScreen mounted');
    console.log('📱 Platform.OS:', Platform.OS);
    console.log('🌐 Is Web:', isWeb);
    console.log('🗺️ PlatformMapView available:', !!PlatformMapView);
    console.log('📍 Athens coordinates:', ATHENS_COORDINATES);
  }, []);

  const handleMapReady = () => {
    console.log('✅ Map is ready and loaded');
    setMapReady(true);
  };

  const handleMapError = (error: any) => {
    console.error('❌ Map error:', error);
    setMapError(error.message || 'Unknown map error');
  };

  const handleRegionChange = (region: any) => {
    console.log('📍 Map region changed:', region);
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: '',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000',
        }} 
      />
      <View style={styles.container}>
        <PlatformMapView
          initialRegion={ATHENS_COORDINATES}
          onMapReady={handleMapReady}
          onError={handleMapError}
          onRegionChange={handleRegionChange}
        >
          {/* Additional markers can be added here if needed */}
        </PlatformMapView>
        {!mapReady && !isWeb && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading map...</Text>
            {mapError && (
              <Text style={styles.errorText}>Error: {mapError}</Text>
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 10,
  },
});