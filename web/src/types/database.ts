/**
 * Types générés depuis le schéma Supabase TrackVint
 * (categories → trackers → items).
 * Régénérer après migration : npx supabase gen types typescript --project-id vpfxawlgpiamvmokmrpn
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          plan: 'free' | 'starter' | 'pro';
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          plan?: 'free' | 'starter' | 'pro';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          kind: 'sellers' | 'searches' | 'custom';
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          kind?: 'sellers' | 'searches' | 'custom';
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trackers: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          type: 'seller' | 'search';
          domain: string;
          source_url: string | null;
          photo_url: string | null;
          is_active: boolean;
          last_crawled_at: string | null;
          created_at: string;
          vinted_seller_id: string | null;
          vinted_username: string;
          search_url: string | null;
          label: string;
          parsed_filters: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          type: 'seller' | 'search';
          domain?: string;
          source_url?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          last_crawled_at?: string | null;
          created_at?: string;
          vinted_seller_id?: string | null;
          vinted_username?: string;
          search_url?: string | null;
          label?: string;
          parsed_filters?: Json;
        };
        Update: Partial<Database['public']['Tables']['trackers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'trackers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trackers_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          tracker_id: string;
          vinted_item_id: string;
          title: string | null;
          brand: string | null;
          price_cents: number | null;
          currency: string | null;
          photo_url: string | null;
          seller_login: string | null;
          seller_photo_url: string | null;
          item_url: string | null;
          status: 'active' | 'sold' | 'removed';
          listed_at: string | null;
          sold_at: string | null;
          sale_speed_hours: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tracker_id: string;
          vinted_item_id: string;
          title?: string | null;
          brand?: string | null;
          price_cents?: number | null;
          currency?: string | null;
          photo_url?: string | null;
          seller_login?: string | null;
          seller_photo_url?: string | null;
          item_url?: string | null;
          status?: 'active' | 'sold' | 'removed';
          listed_at?: string | null;
          sold_at?: string | null;
          sale_speed_hours?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_tracker_id_fkey';
            columns: ['tracker_id'];
            isOneToOne: false;
            referencedRelation: 'trackers';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Category = Tables<'categories'>;
export type Tracker = Tables<'trackers'>;
export type Item = Tables<'items'>;
export type Profile = Tables<'profiles'>;

export type TrackerType = Tracker['type'];
export type CategoryKind = Category['kind'];
