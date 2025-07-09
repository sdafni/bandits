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