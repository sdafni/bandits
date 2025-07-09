
export type Database = {
  public: {
    Tables: {
      bandits: {
        Row: {
          id: string;
          name: string;
          age: number;
          city: string;
          occupation: string;
          image_url: string;
          rating: number;
          is_liked: boolean;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          age: number;
          city: string;
          occupation: string;
          image_url: string;
          rating: number;
          is_liked?: boolean;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          age?: number;
          city?: string;
          occupation?: string;
          image_url?: string;
          rating?: number;
          is_liked?: boolean;
          icon?: string | null;
          created_at?: string;
        };
      };
    };
  };
}; 