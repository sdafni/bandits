import { Bandit } from '../types/bandit';

// In a real app, these would be URLs to your server/CDN
// e.g., 'https://api.yourdomain.com/images/bandits/1.jpg'
export const mockBandits: Bandit[] = [
  {
    id: '1',
    name: 'Nikos',
    age: 40,
    city: 'Athens',
    occupation: 'Local Guide',
    image: require('@/assets/images/bandits/nikos.png'),
    rating: 4,
    isLiked: false,
    icon: 'house.fill',
  },
  {
    id: '2',
    name: 'Dimitris',
    age: 34,
    city: 'Athens',
    occupation: 'Food Expert',
    image: require('@/assets/images/bandits/dimitris.png'),
    rating: 5,
    isLiked: true,
    icon: 'paperplane.fill',
  },
  {
    id: '3',
    name: 'Eleni',
    age: 28,
    city: 'Thessaloniki',
    occupation: 'History Buff',
    image: require('@/assets/images/bandits/eleni.png'),
    rating: 3,
    isLiked: false,
    icon: 'chevron.left.forwardslash.chevron.right',
  },
];