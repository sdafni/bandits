import { Bandit } from '../types/bandit';

export const mockBandits: Bandit[] = [
  {
    id: '1',
    name: 'Jesse James',
    occupation: 'Train Robber',
    image: 'https://picsum.photos/800/400',
    rating: 4,
    isLiked: false,
    icon: 'house.fill',
  },
  {
    id: '2',
    name: 'Billy the Kid',
    occupation: 'Gunslinger',
    image: 'https://picsum.photos/800/400',
    rating: 5,
    isLiked: true,
    icon: 'paperplane.fill',
  },
  {
    id: '3',
    name: 'Butch Cassidy',
    occupation: 'Gang Leader',
    image: 'https://picsum.photos/800/400',
    rating: 3,
    isLiked: false,
    icon: 'chevron.left.forwardslash.chevron.right',
  },
]; 