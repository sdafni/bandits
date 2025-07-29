/**
 * Database Schema Definitions
 * This file serves as a single source of truth for our database structure
 */

export interface BaseTable {
  id: string;
  created_at: string;
}


export type EventGenre = 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';

export interface EventTable extends BaseTable {
  name: string;
  genre: EventGenre;
  start_time: string; // ISO string or timestamp
  end_time: string;   // ISO string or timestamp
  location_lat: number;
  location_lng: number;
  address: string;      // Full readable address
  city: string;         // City name
  neighborhood: string; // Neighborhood name
  description: string;
  id: string;
  rating: number;
  image_url: string;
  link: string;
}

export interface Tables {
  bandits: BanditTable;
  event: EventTable;
  bandit_events: BanditEventTable;
  // Add more tables here as needed
}

export interface BanditTable extends BaseTable {
  name: string;
  family_name: string;
  age: number;
  city: string;
  occupation: string;
  image_url: string;
  rating: number;
  is_liked: boolean;
  icon?: string;
  description?: string;
  why_follow?: string;
}

// Join table for many-to-many relation between bandits and events
export interface BanditEventTable extends BaseTable {
  bandit_id: string; // references bandits.id
  event_id: string;  // references event.id
}

/**
 * Table Constraints and Metadata
 * Use this to document additional database constraints or relationships
 */
export const tableConstraints = {
  bandits: {
    indexes: ['created_at'],
    unique: ['name'],
    constraints: {
      rating: 'integer between 1 and 10',
      age: 'positive integer',
    }
  },
  event: {
    indexes: ['created_at', 'city', 'neighborhood', 'genre'],
    constraints: {
      rating: 'integer between 1 and 10',
    }
  }
} as const;

/**
 * SQL Types mapping
 * This helps maintain consistency when creating tables
 */
export const sqlTypes = {
  id: 'uuid DEFAULT uuid_generate_v4() PRIMARY KEY',
  created_at: 'timestamp with time zone DEFAULT timezone(\'utc\'::text, now())',
  text: 'text',
  integer: 'integer',
  boolean: 'boolean',
  url: 'text',
} as const;

/**
 * Example SQL for creating the event table with new fields:
 * 
 * ALTER TABLE event ADD COLUMN address TEXT NOT NULL DEFAULT '';
 * ALTER TABLE event ADD COLUMN city TEXT NOT NULL DEFAULT '';
 * ALTER TABLE event ADD COLUMN neighborhood TEXT NOT NULL DEFAULT '';
 * 
 * CREATE INDEX event_city_idx ON event(city);
 * CREATE INDEX event_neighborhood_idx ON event(neighborhood);
 * CREATE INDEX event_genre_idx ON event(genre);
 */ 