export const EVENT_GENRES = ['Food', 'Culture', 'Nightlife', 'Shopping', 'Coffee'] as const;

export type EventGenre = typeof EVENT_GENRES[number];

// Type that matches the database schema exactly
export type DatabaseEventGenre = 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';

export const getGenreIcon = (genre: EventGenre): string => {
  switch (genre.toLowerCase()) {
    case 'food':
      return '🍽️';
    case 'culture':
      return '🏛️';
    case 'nightlife':
      return '🌙';
    case 'shopping':
      return '🛍️';
    case 'coffee':
      return '☕';
    default:
      return '📍';
  }
}; 