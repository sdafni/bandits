import { SymbolViewProps } from 'expo-symbols';

export interface Bandit {
  id: string;
  name: string;
  occupation: string;
  image: string;
  rating: number;
  isLiked: boolean;
  icon: SymbolViewProps['name'];
} 