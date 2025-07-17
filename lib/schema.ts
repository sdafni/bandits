/**
 * Database Schema Definitions
 * This file serves as a single source of truth for our database structure
 */

export interface BaseTable {
  id: string;
  created_at: string;
}

export interface Tables {
  bandits: BanditTable;
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
 * Example SQL for creating the bandits table:
 * 
 * CREATE TABLE bandits (
 *   id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
 *   name text NOT NULL,
 *   age integer NOT NULL,
 *   city text NOT NULL,
 *   occupation text NOT NULL,
 *   image_url text NOT NULL,
 *   rating integer NOT NULL,
 *   is_liked boolean DEFAULT false,
 *   icon text,
 *   created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
 * );
 * 
 * CREATE INDEX bandits_created_at_idx ON bandits(created_at);
 * CREATE UNIQUE INDEX bandits_name_idx ON bandits(name);
 */ 