import { useMapEvents } from '@/hooks/useMapEvents';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
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

export default function LeafletMapView({
  initialRegion,
  onMapReady,
  onError,
  onRegionChange,
  children
}: MapViewProps) {
  const eventListRef = useRef<EventListRef>(null);
  const webViewRef = useRef<WebView>(null);
  const { banditId } = useLocalSearchParams();
  const [mapReady, setMapReady] = useState(false);

  // Create a handler that scrolls to the event instead of navigating
  const handleMarkerPress = (event: any) => {
    eventListRef.current?.scrollToEvent(event.id);
  };

  const { events, loading, error, calculateOptimalMapBounds } = useMapEvents();

  useEffect(() => {
    if (error) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Update markers when events change
  useEffect(() => {
    if (mapReady && webViewRef.current && events.length > 0) {
      const markersData = events
        .filter(event => event.location_lat && event.location_lng)
        .map(event => ({
          id: event.id,
          lat: event.location_lat,
          lng: event.location_lng,
          name: event.name,
          address: event.address,
          genre: event.genre,
        }));

      const jsCode = `
        if (typeof updateMarkers === 'function') {
          updateMarkers(${JSON.stringify(markersData)});
        }
        true;
      `;

      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateMarkers',
        markers: markersData
      }));
    }
  }, [events, mapReady]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'mapReady':
          setMapReady(true);
          onMapReady();
          break;
        case 'markerClick':
          const clickedEvent = events.find(e => e.id === data.eventId);
          if (clickedEvent) {
            handleMarkerPress(clickedEvent);
          }
          break;
        case 'regionChange':
          onRegionChange({
            latitude: data.center.lat,
            longitude: data.center.lng,
            latitudeDelta: data.latitudeDelta,
            longitudeDelta: data.longitudeDelta,
          });
          break;
        case 'error':
          onError(new Error(data.message));
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebView message:', err);
    }
  };

  // Calculate initial bounds
  const getInitialBounds = () => {
    if (events.length === 0) {
      return {
        center: { lat: initialRegion.latitude, lng: initialRegion.longitude },
        zoom: 13
      };
    }

    const mapBounds = calculateOptimalMapBounds(initialRegion);
    return {
      center: { lat: mapBounds.center.latitude, lng: mapBounds.center.longitude },
      zoom: mapBounds.zoom || 13
    };
  };

  const initialBounds = getInitialBounds();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leaflet Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"
        integrity="sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA=="
        crossorigin=""></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .custom-marker {
          width: 30px !important;
          height: 30px !important;
          background-color: #FF6B6B;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize map
        var map = L.map('map').setView([${initialBounds.center.lat}, ${initialBounds.center.lng}], ${initialBounds.zoom});

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        var markers = [];

        // Custom marker icon
        var customIcon = L.divIcon({
          html: '<div class="custom-marker">📍</div>',
          className: 'custom-marker-container',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        // Function to update markers
        function updateMarkers(markersData) {
          // Clear existing markers
          markers.forEach(marker => map.removeLayer(marker));
          markers = [];

          // Add new markers
          markersData.forEach(function(markerData) {
            var marker = L.marker([markerData.lat, markerData.lng], {icon: customIcon})
              .addTo(map)
              .bindPopup(\`
                <div style="min-width: 200px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px;">\${markerData.name}</h3>
                  \${markerData.address ? \`<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">\${markerData.address}</p>\` : ''}
                  \${markerData.genre ? \`<p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase;">\${markerData.genre}</p>\` : ''}
                </div>
              \`)
              .on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerClick',
                  eventId: markerData.id
                }));
              });

            markers.push(marker);
          });

          // Fit bounds if multiple markers
          if (markersData.length > 1) {
            var group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === 'updateMarkers') {
              updateMarkers(data.markers);
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        });

        // Map event handlers
        map.on('moveend', function() {
          var center = map.getCenter();
          var zoom = map.getZoom();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'regionChange',
            center: center,
            latitudeDelta: 0.01 / Math.pow(2, zoom - 10),
            longitudeDelta: 0.01 / Math.pow(2, zoom - 10)
          }));
        });

        // Notify React Native that map is ready
        setTimeout(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
          }));
        }, 1000);

      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Top 40% - Leaflet Map in WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(error) => {
            console.error('WebView error:', error);
            onError(error);
          }}
        />
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
        imageHeight={120}
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
  webview: {
    flex: 1,
  },
  eventsContainer: {
    marginTop: 8,
  },
});