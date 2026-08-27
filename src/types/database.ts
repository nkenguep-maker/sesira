export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_runs: {
        Row: {
          action: string | null
          confidence: number | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error: string | null
          estimated_cost: number | null
          feature: string
          id: string
          input_summary: Json
          input_tokens: number | null
          latency_ms: number | null
          model: string
          organization_id: string
          output: Json | null
          output_tokens: number | null
          prompt_version: string
          provider: string
          status: string
        }
        Insert: {
          action?: string | null
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          estimated_cost?: number | null
          feature: string
          id?: string
          input_summary?: Json
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          organization_id: string
          output?: Json | null
          output_tokens?: number | null
          prompt_version: string
          provider: string
          status: string
        }
        Update: {
          action?: string | null
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          estimated_cost?: number | null
          feature?: string
          id?: string
          input_summary?: Json
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          organization_id?: string
          output?: Json | null
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_items: {
        Row: {
          assigned_user_id: string | null
          category: string
          created_at: string
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          explanation: string | null
          id: string
          metadata: Json
          organization_id: string
          priority: string
          reason: string
          resolved_at: string | null
          status: string
          suggested_action: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          category: string
          created_at?: string
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          explanation?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          priority?: string
          reason: string
          resolved_at?: string | null
          status?: string
          suggested_action?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          category?: string
          created_at?: string
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          explanation?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          priority?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          suggested_action?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attention_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          level: string
          organization_id: string
          template_key: string
          template_version: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          level?: string
          organization_id: string
          template_key: string
          template_version?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          level?: string
          organization_id?: string
          template_key?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          attempt_count: number
          automation_config_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          input_summary: Json
          organization_id: string
          output_summary: Json
          started_at: string | null
          status: string
          trigger_event_id: string | null
        }
        Insert: {
          attempt_count?: number
          automation_config_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          input_summary?: Json
          organization_id: string
          output_summary?: Json
          started_at?: string | null
          status?: string
          trigger_event_id?: string | null
        }
        Update: {
          attempt_count?: number
          automation_config_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          input_summary?: Json
          organization_id?: string
          output_summary?: Json
          started_at?: string | null
          status?: string
          trigger_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_config_id_organization_id_fkey"
            columns: ["automation_config_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "automation_configs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_trigger_event_id_fkey"
            columns: ["trigger_event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customers: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string
          email: string | null
          external_id: string | null
          external_provider: string | null
          id: string
          metadata: Json
          organization_id: string
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          payload: Json
          source: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          payload?: Json
          source: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          payload?: Json
          source?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          connected_at: string | null
          created_at: string
          credentials_reference: string | null
          error: string | null
          expires_at: string | null
          id: string
          last_sync_at: string | null
          organization_id: string
          provider: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          connected_at?: string | null
          created_at?: string
          credentials_reference?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id: string
          provider: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          connected_at?: string | null
          created_at?: string
          credentials_reference?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_text: string | null
          channel: string
          confidence: number | null
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          intent: string | null
          metadata: Json
          organization_id: string
          provider_message_id: string | null
          quote_id: string | null
          received_at: string | null
          request_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          thread_key: string | null
          updated_at: string
        }
        Insert: {
          body_text?: string | null
          channel?: string
          confidence?: number | null
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          intent?: string | null
          metadata?: Json
          organization_id: string
          provider_message_id?: string | null
          quote_id?: string | null
          received_at?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_key?: string | null
          updated_at?: string
        }
        Update: {
          body_text?: string | null
          channel?: string
          confidence?: number | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          intent?: string | null
          metadata?: Json
          organization_id?: string
          provider_message_id?: string | null
          quote_id?: string | null
          received_at?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_quote_id_organization_id_fkey"
            columns: ["quote_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "messages_request_id_organization_id_fkey"
            columns: ["request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          config: Json
          created_at: string
          currency: string
          feature_flags: Json
          id: string
          language: string
          name: string
          sector_key: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          currency?: string
          feature_flags?: Json
          id?: string
          language?: string
          name: string
          sector_key?: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          currency?: string
          feature_flags?: Json
          id?: string
          language?: string
          name?: string
          sector_key?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount: number | null
          automation_pause_reason: string | null
          automation_paused_at: string | null
          created_at: string
          currency: string
          customer_id: string
          expires_at: string | null
          external_id: string | null
          external_provider: string | null
          id: string
          metadata: Json
          next_action_at: string | null
          opted_out_at: string | null
          organization_id: string
          owner_user_id: string | null
          reference: string | null
          request_id: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          automation_pause_reason?: string | null
          automation_paused_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          expires_at?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json
          next_action_at?: string | null
          opted_out_at?: string | null
          organization_id: string
          owner_user_id?: string | null
          reference?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          automation_pause_reason?: string | null
          automation_paused_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          expires_at?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json
          next_action_at?: string | null
          opted_out_at?: string | null
          organization_id?: string
          owner_user_id?: string | null
          reference?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_organization_id_fkey"
            columns: ["request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          customer_id: string | null
          data: Json
          external_id: string | null
          external_provider: string | null
          id: string
          organization_id: string
          qualification_score: number | null
          service_catalog_item_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json
          external_id?: string | null
          external_provider?: string | null
          id?: string
          organization_id: string
          qualification_score?: number | null
          service_catalog_item_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json
          external_id?: string | null
          external_provider?: string | null
          id?: string
          organization_id?: string
          qualification_score?: number | null
          service_catalog_item_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_catalog_item_id_organization_id_fkey"
            columns: ["service_catalog_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "service_catalog_items"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      service_catalog_items: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
  public: {
    Enums: {},
  },
} as const

