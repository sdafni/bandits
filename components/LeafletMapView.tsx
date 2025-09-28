import { Platform } from 'react-native';

// Import platform-specific components
import PlatformMapViewNative from './LeafletMapView.native';
import PlatformMapViewWeb from './LeafletMapView.web';

// Export the appropriate component based on platform
const PlatformMapView = Platform.OS === 'web' ? PlatformMapViewWeb : PlatformMapViewNative;

export default PlatformMapView;

// Export Marker component for compatibility
export { LeafletMarker as Marker } from './LeafletMapView.native';