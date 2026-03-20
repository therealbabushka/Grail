export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      items: {
        Row: {
          collection: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          rarity: string | null
          updated_at: string
          weapon_type: string | null
        }
        Insert: {
          collection?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          rarity?: string | null
          updated_at?: string
          weapon_type?: string | null
        }
        Update: {
          collection?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          rarity?: string | null
          updated_at?: string
          weapon_type?: string | null
        }
        Relationships: []
      }
      loadouts: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          slots: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          slots?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          slots?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_price_candles: {
        Row: {
          close: number | null
          created_at: string
          currency: string
          fetched_at: string
          high: number | null
          id: string
          item_name: string
          low: number | null
          market: string
          open: number | null
          timeframe: string
          ts: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          created_at?: string
          currency: string
          fetched_at?: string
          high?: number | null
          id?: string
          item_name: string
          low?: number | null
          market: string
          open?: number | null
          timeframe: string
          ts: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          created_at?: string
          currency?: string
          fetched_at?: string
          high?: number | null
          id?: string
          item_name?: string
          low?: number | null
          market?: string
          open?: number | null
          timeframe?: string
          ts?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_price_snapshots: {
        Row: {
          change_24h_pct: number | null
          change_7d_pct: number | null
          created_at: string
          currency: string
          fetched_at: string
          id: string
          item_name: string
          market: string
          price: number | null
          updated_at: string
          volume_24h: number | null
        }
        Insert: {
          change_24h_pct?: number | null
          change_7d_pct?: number | null
          created_at?: string
          currency: string
          fetched_at?: string
          id?: string
          item_name: string
          market: string
          price?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Update: {
          change_24h_pct?: number | null
          change_7d_pct?: number | null
          created_at?: string
          currency?: string
          fetched_at?: string
          id?: string
          item_name?: string
          market?: string
          price?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          condition: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          item_name: string
          last_triggered_at: string | null
          market: string | null
          trigger_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          item_name: string
          last_triggered_at?: string | null
          market?: string | null
          trigger_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          item_name?: string
          last_triggered_at?: string | null
          market?: string | null
          trigger_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency_preference: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency_preference?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency_preference?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      target_watchlist_items: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          target_id: string
          user_id: string
          watchlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          target_id: string
          user_id: string
          watchlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          target_id?: string
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_watchlist_items_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_watchlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "target_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      target_watchlists: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      targets: {
        Row: {
          acquired_date: string | null
          acquired_price: number | null
          created_at: string
          currency: string
          id: string
          image_url: string | null
          marketplace_links: Json
          max_float: number | null
          min_float: number | null
          notes: string | null
          skin_name: string
          status: string
          target_price: number
          updated_at: string
          user_id: string
          variant: string
          wear: string | null
        }
        Insert: {
          acquired_date?: string | null
          acquired_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          marketplace_links?: Json
          max_float?: number | null
          min_float?: number | null
          notes?: string | null
          skin_name: string
          status?: string
          target_price: number
          updated_at?: string
          user_id: string
          variant?: string
          wear?: string | null
        }
        Update: {
          acquired_date?: string | null
          acquired_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          image_url?: string | null
          marketplace_links?: Json
          max_float?: number | null
          min_float?: number | null
          notes?: string | null
          skin_name?: string
          status?: string
          target_price?: number
          updated_at?: string
          user_id?: string
          variant?: string
          wear?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          buy_date: string
          buy_price: number
          created_at: string
          currency: string
          float_value: number | null
          id: string
          image_url: string | null
          notes: string | null
          sell_date: string | null
          sell_price: number | null
          skin_name: string
          status: string
          updated_at: string
          user_id: string
          variant: string
          wear: string
        }
        Insert: {
          buy_date: string
          buy_price: number
          created_at?: string
          currency?: string
          float_value?: number | null
          id?: string
          image_url?: string | null
          notes?: string | null
          sell_date?: string | null
          sell_price?: number | null
          skin_name: string
          status?: string
          updated_at?: string
          user_id: string
          variant?: string
          wear: string
        }
        Update: {
          buy_date?: string
          buy_price?: number
          created_at?: string
          currency?: string
          float_value?: number | null
          id?: string
          image_url?: string | null
          notes?: string | null
          sell_date?: string | null
          sell_price?: number | null
          skin_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          variant?: string
          wear?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

