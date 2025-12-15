import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Bandit = Database['public']['Tables']['bandit']['Row'];
type BanditInsert = Database['public']['Tables']['bandit']['Insert'];
type BanditUpdate = Database['public']['Tables']['bandit']['Update'];

export async function getBandits(): Promise<Bandit[]> {
  const { data, error } = await supabase
    .from('bandit')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bandits:', error);
    throw error;
  }

  return data || [];
}

// additional function included to deal with the tags connection with the bandits fetch as well, i didnt remove the previous method, just in case.
export async function getBanditsWithTags() {
  const { data, error } = await supabase
    .from('bandit')
    .select(`
      *,
      bandit_tags (
        tags (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bandits:', error);
    throw error;
  }

  return data || [];
}

export async function toggleBanditLike(id: string, currentLikeStatus: boolean): Promise<void> {
  const { error } = await supabase
    .from('bandit')
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

export async function updateBandit(id: string, updates: BanditUpdate): Promise<Bandit> {
  const { data, error } = await supabase
    .from('bandit')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bandit:', error);
    throw error;
  }

  return data;
}

export async function createBandit(bandit: BanditInsert): Promise<Bandit> {
  const { data, error } = await supabase
    .from('bandit')
    .insert(bandit)
    .select()
    .single();

  if (error) {
    console.error('Error creating bandit:', error);
    throw error;
  }

  return data;
}

export async function deleteBandit(id: string): Promise<void> {
  const { error } = await supabase
    .from('bandit')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bandit:', error);
    throw error;
  }
}

export async function getBanditById(id: string): Promise<Bandit | null> {
  const { data, error } = await supabase
    .from('bandit')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching bandit:', error);
    throw error;
  }

  return data;
}

export async function getBanditTags(banditId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('bandit_tags')
    .select(`
      tags (
        name
      )
    `)
    .eq('bandit_id', banditId);

  if (error) {
    console.error('Error fetching bandit tags:', error);
    throw error;
  }

  return (
    data
      ?.map((row: any) => row.tags?.name)
      .filter(Boolean) || []
  );
}
