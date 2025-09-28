import { Platform } from 'react-native';

// Import platform-specific components
import PlatformMapViewNative from './LeafletMapView.native';
import PlatformMapViewWeb from './LeafletMapView.web';

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
  miniMode?: boolean;
  banditId?: string;
}

// Export the appropriate component based on platform
const PlatformMapView = Platform.OS === 'web' ? PlatformMapViewWeb : PlatformMapViewNative;

const LeafletMapView = (props: MapViewProps) => {
  return <PlatformMapView {...props} />;
};

export default LeafletMapView;

// Export Marker component for compatibility
export { LeafletMarker as Marker } from './LeafletMapView.native';