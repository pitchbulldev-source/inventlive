export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          default_split_bps: number
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          default_split_bps?: number
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          default_split_bps?: number
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balances: {
        Row: {
          balance: number
          currency: Database["public"]["Enums"]["currency_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency: Database["public"]["Enums"]["currency_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: Database["public"]["Enums"]["currency_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_packages: {
        Row: {
          bonus_coins: number
          coins: number
          id: string
          is_active: boolean
          price_cents_cop: number
          sort: number
        }
        Insert: {
          bonus_coins?: number
          coins: number
          id?: string
          is_active?: boolean
          price_cents_cop: number
          sort?: number
        }
        Update: {
          bonus_coins?: number
          coins?: number
          id?: string
          is_active?: boolean
          price_cents_cop?: number
          sort?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          host_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          host_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          host_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gift_events: {
        Row: {
          beans: number
          coins: number
          created_at: string
          gift_id: string
          host_id: string
          id: string
          idempotency_key: string | null
          qty: number
          room_id: string
          sender_id: string
        }
        Insert: {
          beans: number
          coins: number
          created_at?: string
          gift_id: string
          host_id: string
          id?: string
          idempotency_key?: string | null
          qty?: number
          room_id: string
          sender_id: string
        }
        Update: {
          beans?: number
          coins?: number
          created_at?: string
          gift_id?: string
          host_id?: string
          id?: string
          idempotency_key?: string | null
          qty?: number
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_events_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gift_events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gift_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_events_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          bean_value: number
          code: string
          coin_cost: number
          id: string
          is_active: boolean
          name: string
          sort: number
          svga_url: string | null
          tier: number
        }
        Insert: {
          bean_value: number
          code: string
          coin_cost: number
          id?: string
          is_active?: boolean
          name: string
          sort?: number
          svga_url?: string | null
          tier?: number
        }
        Update: {
          bean_value?: number
          code?: string
          coin_cost?: number
          id?: string
          is_active?: boolean
          name?: string
          sort?: number
          svga_url?: string | null
          tier?: number
        }
        Relationships: []
      }
      hosts: {
        Row: {
          agency_id: string | null
          created_at: string
          is_active: boolean
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          split_bps: number
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          is_active?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          split_bps?: number
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          is_active?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          split_bps?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          balance_after: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_kind"]
          delta: number
          id: number
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_kind"]
          delta: number
          id?: never
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_kind"]
          delta?: number
          id?: never
          kind?: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          beans: number
          cents_usd: number
          created_at: string
          host_id: string
          id: string
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          beans: number
          cents_usd: number
          created_at?: string
          host_id: string
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          beans?: number
          cents_usd?: number
          created_at?: string
          host_id?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pk_battles: {
        Row: {
          challenger_host: string
          challenger_room: string
          created_at: string
          duration_secs: number
          ends_at: string
          id: string
          opponent_host: string
          opponent_room: string
          started_at: string
          status: Database["public"]["Enums"]["pk_status"]
          winner_host: string | null
        }
        Insert: {
          challenger_host: string
          challenger_room: string
          created_at?: string
          duration_secs?: number
          ends_at: string
          id?: string
          opponent_host: string
          opponent_room: string
          started_at?: string
          status?: Database["public"]["Enums"]["pk_status"]
          winner_host?: string | null
        }
        Update: {
          challenger_host?: string
          challenger_room?: string
          created_at?: string
          duration_secs?: number
          ends_at?: string
          id?: string
          opponent_host?: string
          opponent_room?: string
          started_at?: string
          status?: Database["public"]["Enums"]["pk_status"]
          winner_host?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pk_battles_challenger_host_fkey"
            columns: ["challenger_host"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pk_battles_challenger_host_fkey"
            columns: ["challenger_host"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pk_battles_challenger_room_fkey"
            columns: ["challenger_room"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pk_battles_opponent_host_fkey"
            columns: ["opponent_host"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pk_battles_opponent_host_fkey"
            columns: ["opponent_host"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pk_battles_opponent_room_fkey"
            columns: ["opponent_room"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pk_battles_winner_host_fkey"
            columns: ["winner_host"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pk_battles_winner_host_fkey"
            columns: ["winner_host"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          handle: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      purchases: {
        Row: {
          coins: number
          created_at: string
          id: string
          package_id: string | null
          price_cents_cop: number
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          id?: string
          package_id?: string | null
          price_cents_cop: number
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          package_id?: string | null
          price_cents_cop?: number
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "coin_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          room_id: string | null
          status: string
          target_user: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          room_id?: string | null
          status?: string
          target_user?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          room_id?: string | null
          status?: string
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          id: number
          room_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          room_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_status"]
          title: string
          viewers: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          title?: string
          viewers?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          title?: string
          viewers?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "top_hosts"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      top_hosts: {
        Row: {
          avatar_url: string | null
          beans_total: number | null
          display_name: string | null
          gifts_received: number | null
          handle: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      top_supporters: {
        Row: {
          avatar_url: string | null
          coins_spent: number | null
          display_name: string | null
          gifts_sent: number | null
          handle: string | null
          sender_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_events_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _apply_ledger: {
        Args: {
          p_currency: Database["public"]["Enums"]["currency_kind"]
          p_delta: number
          p_kind: Database["public"]["Enums"]["ledger_kind"]
          p_ref_id: string
          p_ref_type: string
          p_user: string
        }
        Returns: number
      }
      credit_purchase: { Args: { p_purchase_id: string }; Returns: undefined }
      pk_scores: {
        Args: { p_battle: string }
        Returns: {
          host_id: string
          score: number
        }[]
      }
      request_payout: { Args: { p_beans: number }; Returns: string }
      resolve_pk: { Args: { p_battle: string }; Returns: undefined }
      send_gift: {
        Args: {
          p_gift_id: string
          p_idempotency_key?: string
          p_room_id: string
        }
        Returns: Json
      }
      send_gift_combo: {
        Args: {
          p_gift_id: string
          p_idempotency_key?: string
          p_qty: number
          p_room_id: string
        }
        Returns: Json
      }
      start_pk: {
        Args: { p_duration_secs?: number; p_opponent_room: string }
        Returns: string
      }
    }
    Enums: {
      currency_kind: "coin" | "bean"
      kyc_status: "none" | "pending" | "approved" | "rejected"
      ledger_kind:
        | "purchase"
        | "signup_bonus"
        | "gift_sent"
        | "gift_recv"
        | "payout_hold"
        | "payout_paid"
        | "refund"
        | "adjust"
      payout_status: "requested" | "processing" | "paid" | "rejected"
      pk_status: "active" | "finished"
      purchase_status:
        | "pending"
        | "approved"
        | "declined"
        | "error"
        | "refunded"
      room_status: "offline" | "live" | "banned"
      user_role: "viewer" | "host" | "agency" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      currency_kind: ["coin", "bean"],
      kyc_status: ["none", "pending", "approved", "rejected"],
      ledger_kind: [
        "purchase",
        "signup_bonus",
        "gift_sent",
        "gift_recv",
        "payout_hold",
        "payout_paid",
        "refund",
        "adjust",
      ],
      payout_status: ["requested", "processing", "paid", "rejected"],
      pk_status: ["active", "finished"],
      purchase_status: ["pending", "approved", "declined", "error", "refunded"],
      room_status: ["offline", "live", "banned"],
      user_role: ["viewer", "host", "agency", "admin"],
    },
  },
} as const

