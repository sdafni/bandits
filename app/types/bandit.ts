import { SymbolViewProps } from 'expo-symbols';
import { ImageSourcePropType } from 'react-native';

export interface Bandit {
  id: string;
  name: string;
  age: number;
  city: string;
  occupation: string;
  image: ImageSourcePropType;  // This allows for require('./path/to/image')
  rating: number;
  isLiked: boolean;
  icon: SymbolViewProps['name'];
} 