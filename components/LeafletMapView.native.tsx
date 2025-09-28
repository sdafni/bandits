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

        // Comprehensive color palette with darker colors for better contrast (100 colors)
        var markerColors = [
          // Basic colors first (high contrast)
          '#C0392B', '#E74C3C', '#8E44AD', '#9B59B6', '#2980B9', '#3498DB', '#1ABC9C', '#16A085',
          '#27AE60', '#2ECC71', '#F39C12', '#E67E22', '#D68910', '#CA6F1E', '#AF7AC5', '#8E44AD',
          '#5DADE2', '#48C9B0', '#58D68D', '#F7DC6F', '#EB984E', '#EC7063', '#BB8FCE', '#85C1E9',

          // Reds and Pinks
          '#A93226', '#B03A2E', '#922B21', '#78281F', '#641E16', '#943126', '#A04000', '#B7472A',
          '#CD5C5C', '#B22222', '#8B0000', '#A0522D', '#D2691E', '#FF6347', '#DC143C', '#B91C1C',

          // Blues
          '#1B4F72', '#21618C', '#2874A6', '#2E86AB', '#3090C7', '#5499C7', '#7FB3D3', '#85929E',
          '#1F2937', '#374151', '#4B5563', '#6B7280', '#111827', '#1E3A8A', '#1E40AF', '#2563EB',

          // Greens
          '#0E4B29', '#145A32', '#186A3B', '#1D8348', '#229954', '#28B463', '#2ECC71', '#58D68D',
          '#0F766E', '#047857', '#065F46', '#064E3B', '#022C22', '#14532D', '#166534', '#15803D',

          // Purples
          '#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8',
          '#581C87', '#6B21A8', '#7C2D92', '#8B5CF6', '#A855F7', '#C084FC', '#DDD6FE', '#EDE9FE',

          // Oranges and Yellows
          '#B7472A', '#CB4335', '#D68910', '#E67E22', '#F39C12', '#F4D03F', '#F7DC6F', '#F9E79F',
          '#D97706', '#EA580C', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE047', '#FACC15', '#EAB308',

          // Teals and Cyans
          '#0E7490', '#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#A7F3D0', '#6EE7B7', '#34D399',
          '#059669', '#047857', '#065F46', '#064E3B', '#0F766E', '#0D9488', '#14B8A6', '#5EEAD4',

          // Grays and Dark colors
          '#212529', '#343A40', '#495057', '#6C757D', '#ADB5BD', '#CED4DA', '#DEE2E6', '#E9ECEF',
          '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6',

          // Additional vibrant colors
          '#E91E63', '#FF5722', '#795548', '#607D8B', '#9E9E9E', '#FFEB3B', '#CDDC39', '#8BC34A',
          '#4CAF50', '#009688', '#00BCD4', '#03A9F4', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0'
        ];

        var usedColors = [];
        var colorAssignments = {};
        var colorIndex = 0;

        // Function to create custom marker icon with unique color
        function createCustomIcon(eventId) {
          // Get or assign a unique color for this event
          var color = colorAssignments[eventId];
          if (!color) {
            // Find the next available color
            while (colorIndex < markerColors.length && usedColors.indexOf(markerColors[colorIndex]) !== -1) {
              colorIndex++;
            }

            if (colorIndex < markerColors.length) {
              color = markerColors[colorIndex];
              colorAssignments[eventId] = color;
              usedColors.push(color);
              colorIndex++;
            } else {
              // Fallback to a default color if we somehow run out
              color = '#C0392B';
            }
          }

          return L.divIcon({
            html: '<div style="width: 20px; height: 20px; background-color: ' + color + '; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            className: 'custom-marker-container',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
        }

        // Function to update markers
        function updateMarkers(markersData) {
          // Clear existing markers
          markers.forEach(marker => map.removeLayer(marker));
          markers = [];

          // Add new markers
          markersData.forEach(function(markerData) {
            var marker = L.marker([markerData.lat, markerData.lng], {icon: createCustomIcon(markerData.id)})
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