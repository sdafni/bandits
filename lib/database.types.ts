export type Database = {
  public: {
    Tables: {
      bandits: {
        Row: {
          id: string;
          name: string;
          family_name: string;
          age: number;
          city: string;
          occupation: string;
          image_url: string;
          rating: number;
          is_liked: boolean;
          icon: string | null;
          created_at: string;
          description: string | null;
          why_follow: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          family_name: string;
          age: number;
          city: string;
          occupation: string;
          image_url: string;
          rating: number;
          is_liked?: boolean;
          icon?: string | null;
          created_at?: string;
          description: string | null;
          why_follow: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          family_name?: string;
          age?: number;
          city?: string;
          occupation?: string;
          image_url?: string;
          rating?: number;
          is_liked?: boolean;
          icon?: string | null;
          created_at?: string;
          description: string | null;
          why_follow: string | null;
        };
      };
      bandit_event: {
        Row: {
          id: string;
          created_at: string;
          bandit_id: string;
          event_id: string;
          personal_tip?: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          bandit_id: string;
          event_id: string;
          personal_tip?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          bandit_id?: string;
          event_id?: string;
          personal_tip?: string;
        };
      };
      event: {
        Row: {
          id: string;
          name: string;
          genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
          start_time: string;
          end_time: string;
          location_lat: number;
          location_lng: number;
          address: string;
          city: string;
          neighborhood: string;
          description: string;
          rating: number;
          created_at: string;
          image_url: string;
          link: string;
        };
        Insert: {
          id?: string;
          name: string;
          genre: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
          start_time: string;
          end_time: string;
          location_lat: number;
          location_lng: number;
          address: string;
          city: string;
          neighborhood: string;
          description: string;
          rating: number;
          created_at?: string;
          image_url: string;
          link: string;
        };
        Update: {
          id?: string;
          name?: string;
          genre?: 'Food' | 'Culture' | 'Nightlife' | 'Shopping' | 'Coffee';
          start_time?: string;
          end_time?: string;
          location_lat?: number;
          location_lng?: number;
          address?: string;
          city?: string;
          neighborhood?: string;
          description?: string;
          rating?: number;
          created_at?: string;
          image_url?: string;
          link?: string;
        };
      };
      event_user_likes: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          created_at?: string;
        };
      };
      user_bandit: {
        Row: {
          user_id: string;
          bandit_id: string;
          review: string;
          rating: number;
          user_name: string;
        };
        Insert: {
          user_id: string;
          bandit_id: string;
          review: string;
          rating: number;
          user_name: string;
        };
        Update: {
          user_id?: string;
          bandit_id?: string;
          review?: string;
          rating?: number;
          user_name?: string;
        };
      };
    };
  };
};