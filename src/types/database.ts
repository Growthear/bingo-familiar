export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type PrizeType = 'terno' | 'linea' | 'bingo'
export type RoomStatus = 'waiting' | 'playing' | 'finished'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          code: string
          host_id: string
          status: RoomStatus
          interval_seconds: number
          cards_per_player: number
          current_prize: PrizeType | null
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          status?: RoomStatus
          interval_seconds?: number
          cards_per_player?: number
          current_prize?: PrizeType | null
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          host_id?: string
          status?: RoomStatus
          interval_seconds?: number
          cards_per_player?: number
          current_prize?: PrizeType | null
          started_at?: string | null
          finished_at?: string | null
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          player_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      bingo_cards: {
        Row: {
          id: string
          room_id: string
          player_id: string
          card_number: number
          numbers: Json
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          card_number: number
          numbers: Json
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          card_number?: number
          numbers?: Json
        }
        Relationships: []
      }
      drawn_numbers: {
        Row: {
          id: string
          room_id: string
          number: number
          draw_order: number
          drawn_at: string
        }
        Insert: {
          id?: string
          room_id: string
          number: number
          draw_order: number
          drawn_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          number?: number
          draw_order?: number
          drawn_at?: string
        }
        Relationships: []
      }
      wins: {
        Row: {
          id: string
          room_id: string
          player_id: string
          card_id: string
          prize_type: PrizeType
          won_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          card_id: string
          prize_type: PrizeType
          won_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          card_id?: string
          prize_type?: PrizeType
          won_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      draw_next_number: {
        Args: { p_room_id: string }
        Returns: number
      }
      claim_prize: {
        Args: { p_room_id: string; p_card_id: string; p_prize_type: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomPlayer = Database['public']['Tables']['room_players']['Row']
export type BingoCard = Database['public']['Tables']['bingo_cards']['Row']
export type DrawnNumber = Database['public']['Tables']['drawn_numbers']['Row']
export type Win = Database['public']['Tables']['wins']['Row']

export type BingoGrid = (number | null)[][]
