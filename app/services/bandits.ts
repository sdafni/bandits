import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Bandit = Database['public']['Tables']['bandits']['Row'];

export async function getBandits(): Promise<Bandit[]> {
  const { data, error } = await supabase
    .from('bandits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bandits:', error);
    throw error;
  }

  return data || [];
}

export async function toggleBanditLike(id: string, currentLikeStatus: boolean): Promise<void> {
  const { error } = await supabase
    .from('bandits')
    .update({ is_liked: !currentLikeStatus })
    .eq('id', id);

  if (error) {
    console.error('Error toggling bandit like:', error);
    throw error;
  }
}

export async function getUniqueCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('event')
    .select('city')
    .not('city', 'is', null)
    .not('city', 'eq', '');

  if (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }

  const cities = [...new Set(data?.map(item => item.city) || [])];
  return cities.sort();
} 