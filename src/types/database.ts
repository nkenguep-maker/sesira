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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
          idempotency_key: string | null
          metadata: Json
          organization_id: string
          priority: string
          reason: string
          resolution_kind: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
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
          idempotency_key?: string | null
          metadata?: Json
          organization_id: string
          priority?: string
          reason: string
          resolution_kind?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
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
          idempotency_key?: string | null
          metadata?: Json
          organization_id?: string
          priority?: string
          reason?: string
          resolution_kind?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
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
          approval_comment: string | null
          approval_decided_at: string | null
          approval_decided_by_user_id: string | null
          approval_decision: string | null
          attempt_count: number
          automation_config_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          input_summary: Json
          lock_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string | null
          organization_id: string
          output_summary: Json
          scheduled_for: string | null
          started_at: string | null
          status: string
          trigger_event_id: string | null
        }
        Insert: {
          approval_comment?: string | null
          approval_decided_at?: string | null
          approval_decided_by_user_id?: string | null
          approval_decision?: string | null
          attempt_count?: number
          automation_config_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          input_summary?: Json
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          organization_id: string
          output_summary?: Json
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_event_id?: string | null
        }
        Update: {
          approval_comment?: string | null
          approval_decided_at?: string | null
          approval_decided_by_user_id?: string | null
          approval_decision?: string | null
          attempt_count?: number
          automation_config_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          input_summary?: Json
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          organization_id?: string
          output_summary?: Json
          scheduled_for?: string | null
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
      imports: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          initiator_user_id: string | null
          kind: string
          metadata: Json
          organization_id: string
          row_count_error: number
          row_count_ok: number
          row_count_total: number
          source_filename: string
          source_size_bytes: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          initiator_user_id?: string | null
          kind: string
          metadata?: Json
          organization_id: string
          row_count_error?: number
          row_count_ok?: number
          row_count_total?: number
          source_filename: string
          source_size_bytes?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          initiator_user_id?: string | null
          kind?: string
          metadata?: Json
          organization_id?: string
          row_count_error?: number
          row_count_ok?: number
          row_count_total?: number
          source_filename?: string
          source_size_bytes?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          external_id: string | null
          id: string
          import_id: string
          organization_id: string
          raw_payload: Json
          row_index: number
          status: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          import_id: string
          organization_id: string
          raw_payload?: Json
          row_index: number
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          import_id?: string
          organization_id?: string
          raw_payload?: Json
          row_index?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_organization_id_fkey"
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
          fingerprint: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          metadata: Json
          organization_id: string
          recurrence_count: number
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
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          organization_id: string
          recurrence_count?: number
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
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          organization_id?: string
          recurrence_count?: number
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
          classified_at: string | null
          confidence: number | null
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          idempotency_key: string | null
          in_reply_to: string | null
          intent: string | null
          metadata: Json
          organization_id: string
          provider_message_id: string | null
          quote_id: string | null
          raw_headers: Json
          received_at: string | null
          references_headers: string[] | null
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
          classified_at?: string | null
          confidence?: number | null
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          idempotency_key?: string | null
          in_reply_to?: string | null
          intent?: string | null
          metadata?: Json
          organization_id: string
          provider_message_id?: string | null
          quote_id?: string | null
          raw_headers?: Json
          received_at?: string | null
          references_headers?: string[] | null
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
          classified_at?: string | null
          confidence?: number | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          idempotency_key?: string | null
          in_reply_to?: string | null
          intent?: string | null
          metadata?: Json
          organization_id?: string
          provider_message_id?: string | null
          quote_id?: string | null
          raw_headers?: Json
          received_at?: string | null
          references_headers?: string[] | null
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
      outbound_messages: {
        Row: {
          attempt_count: number
          body_hash: string
          channel: string
          created_at: string
          error_class: string | null
          error_message: string | null
          failed_at: string | null
          from_email: string
          id: string
          idempotency_key: string
          integration_id: string | null
          organization_id: string
          provider: string
          provider_message_id: string | null
          reply_to: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          body_hash: string
          channel?: string
          created_at?: string
          error_class?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email: string
          id?: string
          idempotency_key: string
          integration_id?: string | null
          organization_id: string
          provider: string
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          body_hash?: string
          channel?: string
          created_at?: string
          error_class?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string
          id?: string
          idempotency_key?: string
          integration_id?: string | null
          organization_id?: string
          provider?: string
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          closed_at: string | null
          closed_reason: string | null
          commercial_state: string
          created_at: string
          currency: string
          customer_id: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          metadata: Json
          opened_at: string
          organization_id: string
          owner_user_id: string | null
          request_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          commercial_state?: string
          created_at?: string
          currency?: string
          customer_id: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          metadata?: Json
          opened_at?: string
          organization_id: string
          owner_user_id?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          commercial_state?: string
          created_at?: string
          currency?: string
          customer_id?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          metadata?: Json
          opened_at?: string
          organization_id?: string
          owner_user_id?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_options: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          name: string
          option_key: string
          ordinal: number
          organization_id: string
          quote_id: string
          selected_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          name: string
          option_key: string
          ordinal?: number
          organization_id: string
          quote_id: string
          selected_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          name?: string
          option_key?: string
          ordinal?: number
          organization_id?: string
          quote_id?: string
          selected_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      provider_delivery_receipts: {
        Row: {
          created_at: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
          provider: string
          provider_event_id: string
          received_at: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          provider: string
          provider_event_id: string
          received_at?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          provider?: string
          provider_event_id?: string
          received_at?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_delivery_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          is_current_revision: boolean
          metadata: Json
          next_action_at: string | null
          opportunity_id: string | null
          opted_out_at: string | null
          organization_id: string
          owner_user_id: string | null
          previous_quote_id: string | null
          reference: string | null
          request_id: string | null
          revision: number
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          variant_key: string
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
          is_current_revision?: boolean
          metadata?: Json
          next_action_at?: string | null
          opportunity_id?: string | null
          opted_out_at?: string | null
          organization_id: string
          owner_user_id?: string | null
          previous_quote_id?: string | null
          reference?: string | null
          request_id?: string | null
          revision?: number
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          variant_key?: string
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
          is_current_revision?: boolean
          metadata?: Json
          next_action_at?: string | null
          opportunity_id?: string | null
          opted_out_at?: string | null
          organization_id?: string
          owner_user_id?: string | null
          previous_quote_id?: string | null
          reference?: string | null
          request_id?: string | null
          revision?: number
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          variant_key?: string
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
      claim_automation_run: {
        Args: {
          target_run_id: string
          target_organization_id: string
          target_worker_id: string
          lease_seconds: number
        }
        Returns: boolean
      }
      release_automation_run: {
        Args: {
          target_run_id: string
          target_organization_id: string
          target_worker_id: string
          terminal_status: string
          error_message?: string | null
          next_attempt_at?: string | null
          target_output_summary?: Json | null
        }
        Returns: boolean
      }
      list_due_quote_followup_runs: {
        Args: {
          target_organization_id: string
          target_now: string
          target_limit: number
        }
        Returns: {
          id: string
          organization_id: string
          automation_config_id: string | null
          automation_config_level: string
          automation_config_config: Json
          idempotency_key: string
          scheduled_for: string | null
          next_attempt_at: string | null
          input_summary: Json
          attempt_count: number
          quote_id: string
          step: number
        }[]
      }
      insert_event_once: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_type: string
          target_source: string
          target_entity_type?: string | null
          target_entity_id?: string | null
          target_payload?: Json
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      insert_attention_once: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_category: string
          target_reason: string
          target_title: string
          target_priority?: string
          target_entity_type?: string | null
          target_entity_id?: string | null
          target_explanation?: string | null
          target_suggested_action?: string | null
          target_assigned_user_id?: string | null
          target_due_at?: string | null
          target_metadata?: Json
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      record_provider_delivery: {
        Args: {
          target_organization_id: string
          target_provider: string
          target_provider_event_id: string
          target_event_type: string
          target_related_entity_type?: string | null
          target_related_entity_id?: string | null
          target_payload?: Json
          target_received_at?: string | null
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      record_outbound_message_intent: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_integration_id: string | null
          target_provider: string
          target_channel: string
          target_to_email: string
          target_from_email: string
          target_reply_to: string | null
          target_subject: string
          target_body_hash: string
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      mark_outbound_message_sent: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_provider_message_id: string
        }
        Returns: boolean
      }
      mark_outbound_message_failed: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_error_class: string
          target_error_message: string
        }
        Returns: boolean
      }
      record_inbound_message: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_provider: string
          target_provider_message_id: string
          target_customer_id: string | null
          target_quote_id: string | null
          target_request_id: string | null
          target_from_email: string
          target_subject: string
          target_body_text: string
          target_in_reply_to: string | null
          target_references_headers: string[] | null
          target_raw_headers: Json | null
          target_received_at: string | null
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      mark_quote_replied: {
        Args: {
          target_organization_id: string
          target_quote_id: string
        }
        Returns: boolean
      }
      insert_ai_run_once: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_feature: string
          target_entity_type: string | null
          target_entity_id: string | null
          target_provider: string
          target_model: string
          target_prompt_version: string
          target_input_summary: Json | null
          target_output: Json | null
          target_confidence: number | null
          target_action: string | null
          target_status: string
          target_latency_ms: number | null
          target_input_tokens: number | null
          target_output_tokens: number | null
          target_estimated_cost: number | null
          target_error: string | null
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      record_message_classification: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_intent: string
          target_confidence: number
        }
        Returns: boolean
      }
      approve_automation_run_pending_approval: {
        Args: {
          target_run_id: string
          target_organization_id: string
          target_approver_user_id: string
          target_comment: string | null
          target_dispatcher_worker: string
          target_lease_seconds: number
        }
        Returns: boolean
      }
      reject_automation_run_pending_approval: {
        Args: {
          target_run_id: string
          target_organization_id: string
          target_approver_user_id: string
          target_comment: string | null
        }
        Returns: boolean
      }
      resolve_attention_item: {
        Args: {
          target_organization_id: string
          target_item_id: string
          target_operator_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      dismiss_attention_item: {
        Args: {
          target_organization_id: string
          target_item_id: string
          target_operator_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      arm_message_for_reclassification: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_operator_user_id: string
          target_reason: string | null
        }
        Returns: boolean
      }
      resume_quote_automation: {
        Args: {
          target_organization_id: string
          target_quote_id: string
          target_operator_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      retry_failed_run_manual: {
        Args: {
          target_organization_id: string
          target_run_id: string
          target_operator_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      create_organization_with_owner: {
        Args: {
          target_name: string
          target_sector_key: string
          target_slug: string
          target_owner_user_id: string
        }
        Returns: {
          organization_id: string
          membership_id: string
        }[]
      }
      record_import_started: {
        Args: {
          target_organization_id: string
          target_kind: string
          target_source_filename: string
          target_source_size_bytes: number | null
          target_initiator_user_id: string
        }
        Returns: string
      }
      record_import_row_ok: {
        Args: {
          target_organization_id: string
          target_import_id: string
          target_row_index: number
          target_external_id: string | null
          target_entity_type: string | null
          target_entity_id: string | null
        }
        Returns: string
      }
      record_import_row_error: {
        Args: {
          target_organization_id: string
          target_import_id: string
          target_row_index: number
          target_error_message: string
          target_raw_payload: Json | null
        }
        Returns: string
      }
      finalize_import: {
        Args: {
          target_organization_id: string
          target_import_id: string
          target_status: string
          target_error: string | null
        }
        Returns: boolean
      }
      export_organization_snapshot: {
        Args: {
          target_organization_id: string
        }
        Returns: Json
      }
      create_opportunity_with_quote: {
        Args: {
          target_organization_id: string
          target_customer_id: string
          target_request_id: string | null
          target_owner_user_id: string | null
          target_estimated_value: number | null
          target_currency: string
          target_quote_title: string
          target_variant_key: string
          target_metadata: Json
        }
        Returns: {
          opportunity_id: string
          quote_id: string
        }[]
      }
      add_quote_variant_to_opportunity: {
        Args: {
          target_organization_id: string
          target_opportunity_id: string
          target_variant_key: string
          target_quote_title: string
          target_amount: number | null
          target_currency: string
        }
        Returns: string
      }
      create_quote_revision: {
        Args: {
          target_organization_id: string
          target_previous_quote_id: string
          target_quote_title: string
          target_amount: number | null
          target_currency: string
        }
        Returns: string
      }
      select_quote_option: {
        Args: {
          target_organization_id: string
          target_option_id: string
          target_new_status: string
        }
        Returns: boolean
      }
      transition_opportunity_state: {
        Args: {
          target_organization_id: string
          target_opportunity_id: string
          target_new_state: string
          target_closed_reason: string | null
        }
        Returns: boolean
      }
      record_audit_log: {
        Args: {
          target_organization_id: string
          target_action: string
          target_entity_type?: string | null
          target_entity_id?: string | null
          target_metadata?: Json
        }
        Returns: string
      }
      record_incident_once: {
        Args: {
          target_organization_id: string
          target_fingerprint: string
          target_severity: string
          target_category: string
          target_title: string
          target_description?: string | null
          target_entity_type?: string | null
          target_entity_id?: string | null
          target_metadata?: Json
        }
        Returns: {
          id: string
          created: boolean
          recurrence_count: number
        }[]
      }
      retry_failed_run: {
        Args: {
          target_run_id: string
          target_organization_id: string
        }
        Returns: boolean
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

