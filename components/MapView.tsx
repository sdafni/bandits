import { Platform } from 'react-native';

// Import platform-specific components
import PlatformMapViewNative from './MapView.native';
import PlatformMapViewWeb from './MapView.web';

// Export the appropriate component based on platform
const PlatformMapView = Platform.OS === 'web' ? PlatformMapViewWeb : PlatformMapViewNative;

export default PlatformMapView;

// Export Marker component (only available on native)
export { Marker } from './MapView.native';
