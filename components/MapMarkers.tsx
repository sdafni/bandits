import { Database } from '@/lib/database.types';
import React from 'react';

type Event = Database['public']['Tables']['event']['Row'];

interface MapMarkersProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  MarkerComponent: React.ComponentType<{
    coordinate: { latitude: number; longitude: number };
    title?: string;
    description?: string;
    onPress?: (event?: any) => void;
    children?: React.ReactNode;
  }>;
  showEventMarkers?: boolean;
  showCenterMarker?: boolean;
  centerCoordinates?: { latitude: number; longitude: number };
  centerTitle?: string;
  centerDescription?: string;
}

export default function MapMarkers({
  events,
  onEventPress,
  MarkerComponent,
  showEventMarkers = true,
  showCenterMarker = true,
  centerCoordinates,
  centerTitle = "Athens",
  centerDescription = "Historic center of Athens, Greece",
}: MapMarkersProps) {
  return (
    <>
      {/* Center marker (e.g., Athens) */}
      {showCenterMarker && centerCoordinates && (
        <MarkerComponent
          coordinate={centerCoordinates}
          title={centerTitle}
          description={centerDescription}
          onPress={() => console.log('📍 Center marker pressed')}
        />
      )}

      {/* Event markers */}
      {showEventMarkers && events.map((event) => (
        <MarkerComponent
          key={event.id}
          coordinate={{
            latitude: event.location_lat!,
            longitude: event.location_lng!,
          }}
          title={event.name}
          description={event.address || 'No address available'}
          onPress={() => onEventPress(event)}
        />
      ))}
    </>
  );
}
