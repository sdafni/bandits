import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Event = Database['public']['Tables']['event']['Row'];

export interface EventFilters {
  searchQuery?: string;
  genre?: string;
  city?: string;
  neighborhood?: string;
  banditId?: string;
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  let query;
  let data;
  let error;

  // If bandit filter is applied, use the bandit_event linking table
  if (filters.banditId) {
    query = supabase
      .from('bandit_event')
      .select('event:event(*)')
      .eq('bandit_id', filters.banditId);
    
    const result = await query;
    data = result.data;
    error = result.error;
    
    // Extract events from the joined result
    if (data) {
      data = data.map((item: any) => item.event);
    }
    
    // Apply additional filters to the bandit-filtered results
    if (data && (filters.searchQuery || filters.genre || filters.city || filters.neighborhood)) {
      data = data.filter((event: Event) => {
        // Text search in description
        if (filters.searchQuery && !event.description?.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
          return false;
        }
        
        // Genre filter
        if (filters.genre && event.genre !== filters.genre) {
          return false;
        }
        
        // City filter
        if (filters.city && event.city !== filters.city) {
          return false;
        }
        
        // Neighborhood filter
        if (filters.neighborhood && event.neighborhood !== filters.neighborhood) {
          return false;
        }
        
        return true;
      });
    }
  } else {
    // Regular event query without bandit filter
    query = supabase.from('event').select('*');

    // Text search in description
    if (filters.searchQuery) {
      query = query.ilike('description', `%${filters.searchQuery}%`);
    }

    // Genre filter
    if (filters.genre) {
      query = query.eq('genre', filters.genre);
    }

    // City filter
    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    // Neighborhood filter
    if (filters.neighborhood) {
      query = query.eq('neighborhood', filters.neighborhood);
    }

    const result = await query;
    data = result.data;
    error = result.error;
  }
  
  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }

  let events = data || [];

  // Apply location-based filter after fetching (client-side filtering)
  if (filters.userLat && filters.userLng) {
    const radiusKm = filters.radiusKm || 5;
    events = events.filter(event => {
      const distance = calculateDistance(
        filters.userLat!,
        filters.userLng!,
        event.location_lat,
        event.location_lng
      );
      return distance <= radiusKm;
    });
  }

  return events;
}



export async function getUniqueNeighborhoods(city?: string): Promise<string[]> {
  let query = supabase
    .from('event')
    .select('neighborhood')
    .not('neighborhood', 'is', null)
    .not('neighborhood', 'eq', '');

  // Filter by city if provided
  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching neighborhoods:', error);
    throw error;
  }

  const neighborhoods = [...new Set(data?.map(item => item.neighborhood) || [])];
  return neighborhoods.sort();
}

export async function getEventGenres(): Promise<string[]> {
  return ['Food', 'Culture', 'Nightlife', 'Shopping', 'Coffee'];
}

// Get user's current location
export async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback to default location (Kazanelson 85, Givatayim, Israel)
      resolve({ lat: 32.0723, lng: 34.8125 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn('Error getting location:', error);
        // Fallback to default location
        resolve({ lat: 32.0723, lng: 34.8125 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// Toggle event like for current user
export async function toggleEventLike(eventId: string, currentLikeStatus: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (currentLikeStatus) {
    // Remove like
    const { error } = await supabase
      .from('event_user_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error removing event like:', error);
      throw error;
    }
  } else {
    // Add like
    const { error } = await supabase
      .from('event_user_likes')
      .insert({
        user_id: user.id,
        event_id: eventId
      });

    if (error) {
      console.error('Error adding event like:', error);
      throw error;
    }
  }
}

// Get user's liked events
export async function getUserLikedEvents(): Promise<Event[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('event_user_likes')
    .select(`
      event:event(*)
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user liked events:', error);
    throw error;
  }

  // Extract events from the joined result
  const events = data?.map((item: any) => item.event) || [];
  return events;
}

// Check if an event is liked by current user
export async function isEventLiked(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('event_user_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Error checking event like status:', error);
    throw error;
  }

  return !!data;
} 