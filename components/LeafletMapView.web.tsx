import { useMapEvents } from '@/hooks/useMapEvents';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import EventList, { EventListRef } from './EventList';

// Dynamic imports for Leaflet (client-side only)
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let L: any = null;

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

export default function LeafletMapView({
  initialRegion,
  onMapReady,
  onError,
  onRegionChange,
  children
}: MapViewProps) {
  const eventListRef = useRef<EventListRef>(null);
  const { banditId } = useLocalSearchParams();
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Create a handler that scrolls to the event instead of navigating
  const handleMarkerPress = (event: any) => {
    eventListRef.current?.scrollToEvent(event.id);
  };

  const { events, loading, error, calculateOptimalMapBounds } = useMapEvents();

  // Debug logging
  useEffect(() => {
    console.log('🗺️ Leaflet Web: Events loaded:', events.length);
    if (events.length > 0) {
      console.log('🗺️ First event sample:', {
        id: events[0].id,
        name: events[0].name,
        location_lat: events[0].location_lat,
        location_lng: events[0].location_lng,
        hasCoords: !!(events[0].location_lat && events[0].location_lng)
      });
    }
  }, [events]);

  // Load Leaflet components dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet'),
        import('leaflet')
      ]).then(([reactLeaflet, leaflet]) => {
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        L = leaflet.default;

        // Fix for default marker icons in webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setLeafletLoaded(true);
        setTimeout(() => onMapReady(), 100);
      }).catch((err) => {
        console.error('Failed to load Leaflet:', err);
        onError(err);
      });
    }
  }, [onMapReady, onError]);

  useEffect(() => {
    if (error) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Create custom marker icon
  const createCustomIcon = () => {
    if (!L) return null;

    return L.divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background-color: #FF6B6B;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">📍</div>
      `,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  // Calculate bounds for map
  const getMapBounds = () => {
    if (events.length === 0) {
      return {
        center: [initialRegion.latitude, initialRegion.longitude] as [number, number],
        zoom: 13
      };
    }

    const mapBounds = calculateOptimalMapBounds(initialRegion);
    return {
      center: [mapBounds.center.latitude, mapBounds.center.longitude] as [number, number],
      zoom: mapBounds.zoom || 13
    };
  };

  const mapBounds = getMapBounds();

  // Handle map events
  const MapEventHandler = () => {
    const map = useMapEvents({
      moveend: () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const region = {
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.01 / Math.pow(2, zoom - 10),
          longitudeDelta: 0.01 / Math.pow(2, zoom - 10),
        };
        onRegionChange(region);
      },
    });

    useEffect(() => {
      setMapInstance(map);
    }, [map]);

    return null;
  };

  if (!leafletLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <View style={styles.loadingContainer}>
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading map...</div>
          </View>
        </View>
        <EventList
          ref={eventListRef}
          events={events}
          loading={loading}
          error={error}
          banditId={banditId as string}
          variant="horizontal"
          showButton={false}
          imageHeight={154}
          contentContainerStyle={styles.eventsContainer}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top 40% - Leaflet Map */}
      <View style={styles.mapContainer}>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
          integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
          crossOrigin=""
        />
        <MapContainer
          center={mapBounds.center}
          zoom={mapBounds.zoom}
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMapInstance}
        >
          <MapEventHandler />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Event markers */}
          {events.map((event) => {
            if (!event.location_lat || !event.location_lng) {
              console.log('🗺️ Skipping event without coordinates:', event.name, event.location_lat, event.location_lng);
              return null;
            }

            console.log('🗺️ Rendering marker for:', event.name, 'at', [event.location_lat, event.location_lng]);
            return (
              <Marker
                key={event.id}
                position={[event.location_lat, event.location_lng]}
                icon={createCustomIcon()}
                eventHandlers={{
                  click: () => handleMarkerPress(event),
                }}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{event.name}</h3>
                    {event.address && (
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
                        {event.address}
                      </p>
                    )}
                    {event.genre && (
                      <p style={{ margin: '0', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
                        {event.genre}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {children}
        </MapContainer>
      </View>

      {/* Bottom 60% - Events List */}
      <EventList
        ref={eventListRef}
        events={events}
        loading={loading}
        error={error}
        banditId={banditId as string}
        variant="horizontal"
        showButton={false}
        imageHeight={154}
        contentContainerStyle={styles.eventsContainer}
      />
    </View>
  );
}

// Export a Marker component for compatibility
export const LeafletMarker = ({ children }: { children: React.ReactNode }) => {
  return null; // Markers are handled internally
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: '40%',
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsContainer: {
    marginTop: 8,
  },
});