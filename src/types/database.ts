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
          body_hash: string | null
          body_text_hash: string | null
          channel: string
          created_at: string
          error_class: string | null
          error_message: string | null
          failed_at: string | null
          from_email: string | null
          id: string
          idempotency_key: string
          integration_id: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          provider_message_id: string | null
          reply_to: string | null
          sent_at: string | null
          status: string
          subject: string | null
          to_email: string | null
          to_phone: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          body_hash?: string | null
          body_text_hash?: string | null
          channel?: string
          created_at?: string
          error_class?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string | null
          id?: string
          idempotency_key: string
          integration_id?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          to_email?: string | null
          to_phone?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          body_hash?: string | null
          body_text_hash?: string | null
          channel?: string
          created_at?: string
          error_class?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_email?: string | null
          id?: string
          idempotency_key?: string
          integration_id?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          to_email?: string | null
          to_phone?: string | null
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
      value_policies: {
        Row: {
          applies_to: string
          created_at: string
          currency: string
          enabled: boolean
          id: string
          max_amount: number | null
          metadata: Json
          min_amount: number
          name: string
          organization_id: string
          priority: number
          reason: string
          required_workflow_mode: string
          updated_at: string
        }
        Insert: {
          applies_to: string
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          max_amount?: number | null
          metadata?: Json
          min_amount: number
          name: string
          organization_id: string
          priority?: number
          reason: string
          required_workflow_mode: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          max_amount?: number | null
          metadata?: Json
          min_amount?: number
          name?: string
          organization_id?: string
          priority?: number
          reason?: string
          required_workflow_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_policies_organization_id_fkey"
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
          draft_gaps: Json
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
          draft_gaps?: Json
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
          acknowledged_at: string | null
          assigned_user_id: string | null
          created_at: string
          customer_id: string | null
          data: Json
          external_id: string | null
          external_provider: string | null
          first_response_at: string | null
          id: string
          organization_id: string
          qualification_score: number | null
          received_at: string
          service_catalog_item_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json
          external_id?: string | null
          external_provider?: string | null
          first_response_at?: string | null
          id?: string
          organization_id: string
          qualification_score?: number | null
          received_at?: string
          service_catalog_item_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          data?: Json
          external_id?: string | null
          external_provider?: string | null
          first_response_at?: string | null
          id?: string
          organization_id?: string
          qualification_score?: number | null
          received_at?: string
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
      field_vehicles: {
        Row: {
          created_at: string
          external_ref: string | null
          id: string
          label: string
          metadata: Json
          organization_id: string
          registration: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_ref?: string | null
          id?: string
          label: string
          metadata?: Json
          organization_id: string
          registration?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_ref?: string | null
          id?: string
          label?: string
          metadata?: Json
          organization_id?: string
          registration?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_dispatch_assignments: {
        Row: {
          acknowledged_at: string | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          dispatch_status: string
          en_route_at: string | null
          id: string
          idempotency_key: string | null
          intervention_id: string
          organization_id: string
          route_order: number | null
          scheduled_end: string
          scheduled_start: string
          started_at: string | null
          technician_user_id: string
          updated_at: string
          vehicle_id: string | null
          version: number
        }
        Insert: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatch_status?: string
          en_route_at?: string | null
          id?: string
          idempotency_key?: string | null
          intervention_id: string
          organization_id: string
          route_order?: number | null
          scheduled_end: string
          scheduled_start: string
          started_at?: string | null
          technician_user_id: string
          updated_at?: string
          vehicle_id?: string | null
          version?: number
        }
        Update: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          dispatch_status?: string
          en_route_at?: string | null
          id?: string
          idempotency_key?: string | null
          intervention_id?: string
          organization_id?: string
          route_order?: number | null
          scheduled_end?: string
          scheduled_start?: string
          started_at?: string | null
          technician_user_id?: string
          updated_at?: string
          vehicle_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intervention_dispatch_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_availability_blocks: {
        Row: {
          created_at: string
          from_at: string
          id: string
          note: string | null
          organization_id: string
          reason: string
          source: string
          to_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_at: string
          id?: string
          note?: string | null
          organization_id: string
          reason: string
          source?: string
          to_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          reason?: string
          source?: string
          to_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_tracking_policies: {
        Row: {
          allowed_hours_json: Json | null
          created_at: string
          enabled: boolean
          freshness_seconds: number
          id: string
          organization_id: string
          purpose: string
          retention_days: number
          session_based: boolean
          updated_at: string
        }
        Insert: {
          allowed_hours_json?: Json | null
          created_at?: string
          enabled?: boolean
          freshness_seconds?: number
          id?: string
          organization_id: string
          purpose: string
          retention_days?: number
          session_based?: boolean
          updated_at?: string
        }
        Update: {
          allowed_hours_json?: Json | null
          created_at?: string
          enabled?: boolean
          freshness_seconds?: number
          id?: string
          organization_id?: string
          purpose?: string
          retention_days?: number
          session_based?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_tracking_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_location_pings: {
        Row: {
          accuracy_m: number | null
          captured_at: string
          created_at: string
          device_ref: string | null
          dispatch_assignment_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          offline_client_id: string | null
          organization_id: string
          provider_ref: string | null
          received_at: string
          source: string
          speed_kph: number | null
          technician_user_id: string | null
          vehicle_id: string
        }
        Insert: {
          accuracy_m?: number | null
          captured_at: string
          created_at?: string
          device_ref?: string | null
          dispatch_assignment_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          offline_client_id?: string | null
          organization_id: string
          provider_ref?: string | null
          received_at?: string
          source?: string
          speed_kph?: number | null
          technician_user_id?: string | null
          vehicle_id: string
        }
        Update: {
          accuracy_m?: number | null
          captured_at?: string
          created_at?: string
          device_ref?: string | null
          dispatch_assignment_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          offline_client_id?: string | null
          organization_id?: string
          provider_ref?: string | null
          received_at?: string
          source?: string
          speed_kph?: number | null
          technician_user_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_location_pings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_route_estimates: {
        Row: {
          calculated_at: string
          created_at: string
          dispatch_assignment_id: string
          distance_m: number | null
          duration_seconds: number | null
          failure_reason: string | null
          id: string
          organization_id: string
          provider_kind: string
          provider_ref: string | null
          status: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          dispatch_assignment_id: string
          distance_m?: number | null
          duration_seconds?: number | null
          failure_reason?: string | null
          id?: string
          organization_id: string
          provider_kind: string
          provider_ref?: string | null
          status: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          dispatch_assignment_id?: string
          distance_m?: number | null
          duration_seconds?: number | null
          failure_reason?: string | null
          id?: string
          organization_id?: string
          provider_kind?: string
          provider_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_route_estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_procedure_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          organization_id: string | null
          sector_key: string | null
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label: string
          organization_id?: string | null
          sector_key?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string | null
          sector_key?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      field_procedure_steps: {
        Row: {
          created_at: string
          human_wording: string
          id: string
          kind: string
          metadata: Json
          ordinal: number
          range_max: number | null
          range_min: number | null
          required: boolean
          template_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          human_wording: string
          id?: string
          kind: string
          metadata?: Json
          ordinal: number
          range_max?: number | null
          range_min?: number | null
          required?: boolean
          template_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          human_wording?: string
          id?: string
          kind?: string
          metadata?: Json
          ordinal?: number
          range_max?: number | null
          range_min?: number | null
          required?: boolean
          template_id?: string
          unit?: string | null
        }
        Relationships: []
      }
      intervention_procedure_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          intervention_id: string
          organization_id: string
          review_notes: string | null
          started_at: string | null
          status: string
          template_id: string
          template_version: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          intervention_id: string
          organization_id: string
          review_notes?: string | null
          started_at?: string | null
          status?: string
          template_id: string
          template_version: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          intervention_id?: string
          organization_id?: string
          review_notes?: string | null
          started_at?: string | null
          status?: string
          template_id?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      field_step_results: {
        Row: {
          actor_user_id: string
          captured_at: string
          conflict_reason: string | null
          created_at: string
          device_ref: string | null
          id: string
          offline_client_id: string | null
          organization_id: string
          run_id: string
          step_id: string
          sync_status: string
          value_json: Json
        }
        Insert: {
          actor_user_id: string
          captured_at: string
          conflict_reason?: string | null
          created_at?: string
          device_ref?: string | null
          id?: string
          offline_client_id?: string | null
          organization_id: string
          run_id: string
          step_id: string
          sync_status?: string
          value_json?: Json
        }
        Update: {
          actor_user_id?: string
          captured_at?: string
          conflict_reason?: string | null
          created_at?: string
          device_ref?: string | null
          id?: string
          offline_client_id?: string | null
          organization_id?: string
          run_id?: string
          step_id?: string
          sync_status?: string
          value_json?: Json
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          mime_type: string | null
          organization_id: string
          sha256: string
          size_bytes: number | null
          source_reference: string | null
          storage_bucket: string
          storage_path: string
          version: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          mime_type?: string | null
          organization_id: string
          sha256: string
          size_bytes?: number | null
          source_reference?: string | null
          storage_bucket: string
          storage_path: string
          version?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          sha256?: string
          size_bytes?: number | null
          source_reference?: string | null
          storage_bucket?: string
          storage_path?: string
          version?: number
        }
        Relationships: []
      }
      trust_providers: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          production_ready: boolean
          provider_kind: string
          region: string | null
          status: string
          supported_capabilities: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          production_ready?: boolean
          provider_kind: string
          region?: string | null
          status?: string
          supported_capabilities?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          production_ready?: boolean
          provider_kind?: string
          region?: string | null
          status?: string
          supported_capabilities?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      document_trust_requests: {
        Row: {
          created_at: string
          document_version_id: string
          external_ref: string | null
          id: string
          idempotency_key: string
          organization_id: string
          provider_id: string | null
          provider_snapshot: Json
          requested_capability: string
          requested_level: string
          status: string
          submitted_at: string | null
          terminal_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_version_id: string
          external_ref?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          provider_id?: string | null
          provider_snapshot?: Json
          requested_capability: string
          requested_level: string
          status?: string
          submitted_at?: string | null
          terminal_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_version_id?: string
          external_ref?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          provider_id?: string | null
          provider_snapshot?: Json
          requested_capability?: string
          requested_level?: string
          status?: string
          submitted_at?: string | null
          terminal_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_trust_evidence: {
        Row: {
          certificate_metadata: Json
          confirmed_at: string
          created_at: string
          id: string
          organization_id: string
          provider_ref: string
          raw_evidence_storage_path: string | null
          request_id: string
          signature_seal_level_reported_by_provider: string | null
          timestamp_token_reference: string | null
          verification_notes: string | null
          verification_performed_at: string | null
          verification_result: string
        }
        Insert: {
          certificate_metadata?: Json
          confirmed_at: string
          created_at?: string
          id?: string
          organization_id: string
          provider_ref: string
          raw_evidence_storage_path?: string | null
          request_id: string
          signature_seal_level_reported_by_provider?: string | null
          timestamp_token_reference?: string | null
          verification_notes?: string | null
          verification_performed_at?: string | null
          verification_result?: string
        }
        Update: {
          certificate_metadata?: Json
          confirmed_at?: string
          created_at?: string
          id?: string
          organization_id?: string
          provider_ref?: string
          raw_evidence_storage_path?: string | null
          request_id?: string
          signature_seal_level_reported_by_provider?: string | null
          timestamp_token_reference?: string | null
          verification_notes?: string | null
          verification_performed_at?: string | null
          verification_result?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          allowed_variables: string[]
          body_template: string
          created_at: string
          id: string
          key: string
          label: string
          organization_id: string
          quiet_hours_json: Json | null
          rate_limit_per_day: number
          timezone: string
          transactional: boolean
          updated_at: string
          version: number
        }
        Insert: {
          allowed_variables?: string[]
          body_template: string
          created_at?: string
          id?: string
          key: string
          label: string
          organization_id: string
          quiet_hours_json?: Json | null
          rate_limit_per_day?: number
          timezone?: string
          transactional?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          allowed_variables?: string[]
          body_template?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string
          quiet_hours_json?: Json | null
          rate_limit_per_day?: number
          timezone?: string
          transactional?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      sms_opt_outs: {
        Row: {
          created_at: string
          id: string
          note: string | null
          opted_out_at: string
          organization_id: string
          phone_e164: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          opted_out_at?: string
          organization_id: string
          phone_e164: string
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          opted_out_at?: string
          organization_id?: string
          phone_e164?: string
          source?: string
        }
        Relationships: []
      }
      binary_field_artifacts: {
        Row: {
          actual_sha256: string | null
          captured_at: string
          conflict_reason: string | null
          content_type: string | null
          created_at: string
          expected_sha256: string
          finalized_at: string | null
          id: string
          intervention_id: string
          kind: string
          offline_client_id: string | null
          organization_id: string
          payload_snapshot: Json
          run_id: string | null
          size_bytes: number | null
          step_result_id: string | null
          storage_bucket: string
          storage_path: string
          upload_status: string
          uploaded_by_user_id: string
        }
        Insert: {
          actual_sha256?: string | null
          captured_at: string
          conflict_reason?: string | null
          content_type?: string | null
          created_at?: string
          expected_sha256: string
          finalized_at?: string | null
          id?: string
          intervention_id: string
          kind: string
          offline_client_id?: string | null
          organization_id: string
          payload_snapshot?: Json
          run_id?: string | null
          size_bytes?: number | null
          step_result_id?: string | null
          storage_bucket?: string
          storage_path: string
          upload_status?: string
          uploaded_by_user_id: string
        }
        Update: {
          actual_sha256?: string | null
          captured_at?: string
          conflict_reason?: string | null
          content_type?: string | null
          created_at?: string
          expected_sha256?: string
          finalized_at?: string | null
          id?: string
          intervention_id?: string
          kind?: string
          offline_client_id?: string | null
          organization_id?: string
          payload_snapshot?: Json
          run_id?: string | null
          size_bytes?: number | null
          step_result_id?: string | null
          storage_bucket?: string
          storage_path?: string
          upload_status?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
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
      resolve_value_policy: {
        Args: {
          target_organization_id: string
          target_applies_to: string
          target_amount: number
          target_currency: string
        }
        Returns: {
          policy_id: string
          required_workflow_mode: string
          reason: string
        }[]
      }
      sold_not_scheduled_opportunities: {
        Args: {
          target_organization_id: string
          target_since: string
          target_marker_types: string[] | null
        }
        Returns: {
          opportunity_id: string
          customer_id: string
          estimated_value: number | null
          currency: string
          closed_at: string
          age_hours: number
        }[]
      }
      compute_staleness_signal: {
        Args: {
          target_organization_id: string
          target_quote_id: string
          target_now: string
        }
        Returns: {
          score: number
          band: string
          factors: Json
          explanation: string
        }[]
      }
      record_reply_objection: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_quote_id: string | null
          target_class: string
          target_severity: string
          target_extracted_amount: number | null
          target_extracted_currency: string | null
          target_summary: string | null
          target_confidence: number | null
        }
        Returns: {
          id: string
          created: boolean
        }[]
      }
      record_request_acknowledged: {
        Args: {
          target_organization_id: string
          target_request_id: string
        }
        Returns: boolean
      }
      record_request_first_response: {
        Args: {
          target_organization_id: string
          target_request_id: string
          target_responder_user_id: string
        }
        Returns: boolean
      }
      speed_to_lead_stats: {
        Args: {
          target_organization_id: string
          target_period_start: string
          target_period_end: string
        }
        Returns: {
          responded_count: number
          unresponded_count: number
          median_response_seconds: number | null
          p90_response_seconds: number | null
          fastest_response_seconds: number | null
          slowest_response_seconds: number | null
        }[]
      }
      record_quote_draft_gaps: {
        Args: {
          target_organization_id: string
          target_quote_id: string
          target_draft_gaps: Json
        }
        Returns: boolean
      }
      dormant_opportunities: {
        Args: {
          target_organization_id: string
          target_dormant_since_days: number
        }
        Returns: {
          opportunity_id: string
          customer_id: string
          commercial_state: string
          estimated_value: number | null
          currency: string
          opened_at: string
          last_activity_at: string
          dormant_days: number
        }[]
      }
      schedule_intervention: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_scheduled_at: string
          target_duration_minutes: number | null
        }
        Returns: boolean
      }
      complete_intervention: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_notes: string | null
        }
        Returns: boolean
      }
      transition_field_report_review: {
        Args: {
          target_organization_id: string
          target_report_id: string
          target_reviewer_user_id: string
          target_new_status: string
        }
        Returns: boolean
      }
      record_field_report_gaps: {
        Args: {
          target_organization_id: string
          target_report_id: string
          target_report_gaps: Json
        }
        Returns: boolean
      }
      record_document_classification: {
        Args: {
          target_organization_id: string
          target_document_id: string
          target_kind: string | null
          target_extracted_fields: Json | null
          target_extraction_confidence: number
        }
        Returns: boolean
      }
      validate_document: {
        Args: {
          target_organization_id: string
          target_document_id: string
          target_validator_user_id: string
        }
        Returns: boolean
      }
      reject_document: {
        Args: {
          target_organization_id: string
          target_document_id: string
          target_reason: string
        }
        Returns: boolean
      }
      archive_document: {
        Args: {
          target_organization_id: string
          target_document_id: string
        }
        Returns: boolean
      }
      record_invoice_issued: {
        Args: {
          target_organization_id: string
          target_invoice_id: string
          target_issued_at: string
          target_due_at: string | null
          target_external_ref: string | null
        }
        Returns: boolean
      }
      record_invoice_payment: {
        Args: {
          target_organization_id: string
          target_invoice_id: string
          target_amount: number
          target_paid_at: string
          target_metadata: Json
        }
        Returns: boolean
      }
      mark_invoice_overdue: {
        Args: {
          target_organization_id: string
          target_invoice_id: string
        }
        Returns: boolean
      }
      record_dunning_reminder: {
        Args: {
          target_organization_id: string
          target_invoice_id: string
          target_stage: number
          target_sent_by_user_id: string
        }
        Returns: boolean
      }
      overdue_invoices: {
        Args: {
          target_organization_id: string
          target_min_days_past_due: number
        }
        Returns: {
          invoice_id: string
          customer_id: string
          external_ref: string | null
          amount: number
          currency: string
          issued_at: string | null
          due_at: string | null
          days_past_due: number
          reminder_stage: number
          reminder_last_sent_at: string | null
        }[]
      }
      activate_maintenance_contract: {
        Args: {
          target_organization_id: string
          target_contract_id: string
          target_start_date: string
          target_end_date: string | null
          target_cadence_days: number
          target_amount: number | null
          target_currency: string | null
          target_external_ref: string | null
        }
        Returns: boolean
      }
      record_maintenance_visit: {
        Args: {
          target_organization_id: string
          target_contract_id: string
          target_intervention_id: string
          target_visited_at: string
        }
        Returns: boolean
      }
      scan_maintenance_renewals: {
        Args: {
          target_organization_id: string
          target_days_ahead: number
        }
        Returns: {
          contract_id: string
          new_status: string
        }[]
      }
      record_renewal_notice: {
        Args: {
          target_organization_id: string
          target_contract_id: string
          target_sent_by_user_id: string
        }
        Returns: boolean
      }
      cancel_maintenance_contract: {
        Args: {
          target_organization_id: string
          target_contract_id: string
          target_reason: string
        }
        Returns: boolean
      }
      due_maintenance_visits: {
        Args: {
          target_organization_id: string
          target_days_ahead: number
        }
        Returns: {
          contract_id: string
          customer_id: string
          title: string
          external_ref: string | null
          cadence_days: number
          next_visit_due_at: string | null
          last_visit_at: string | null
          end_date: string | null
        }[]
      }
      expiring_maintenance_contracts: {
        Args: {
          target_organization_id: string
          target_days_ahead: number
        }
        Returns: {
          contract_id: string
          customer_id: string
          title: string
          external_ref: string | null
          end_date: string | null
          amount: number | null
          currency: string
          renewal_notice_sent_at: string | null
          status: string
        }[]
      }
      activate_growth_campaign: {
        Args: {
          target_organization_id: string
          target_campaign_id: string
          target_start_at: string
          target_end_at: string | null
          target_budget: number | null
          target_currency: string | null
          target_external_ref: string | null
        }
        Returns: boolean
      }
      transition_growth_campaign: {
        Args: {
          target_organization_id: string
          target_campaign_id: string
          target_new_status: string
          target_reason: string | null
        }
        Returns: boolean
      }
      qualify_lead: {
        Args: {
          target_organization_id: string
          target_lead_id: string
          target_qualified_by_user_id: string
          target_notes: string | null
        }
        Returns: boolean
      }
      convert_lead: {
        Args: {
          target_organization_id: string
          target_lead_id: string
          target_opportunity_id: string
        }
        Returns: boolean
      }
      disqualify_lead: {
        Args: {
          target_organization_id: string
          target_lead_id: string
          target_reason: string
        }
        Returns: boolean
      }
      archive_lead: {
        Args: {
          target_organization_id: string
          target_lead_id: string
          target_reason: string | null
        }
        Returns: boolean
      }
      pending_leads: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          lead_id: string
          contact_name: string
          contact_email: string | null
          contact_phone: string | null
          source: string
          source_campaign_id: string | null
          status: string
          created_at: string
        }[]
      }
      active_growth_campaigns: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          campaign_id: string
          name: string
          channel: string
          external_ref: string | null
          budget: number | null
          currency: string
          start_at: string | null
          end_at: string | null
          status: string
        }[]
      }
      submit_content_for_review: {
        Args: {
          target_organization_id: string
          target_content_id: string
        }
        Returns: boolean
      }
      approve_content_piece: {
        Args: {
          target_organization_id: string
          target_content_id: string
          target_approver_user_id: string
        }
        Returns: boolean
      }
      archive_content_piece: {
        Args: {
          target_organization_id: string
          target_content_id: string
          target_reason: string
        }
        Returns: boolean
      }
      schedule_publication: {
        Args: {
          target_organization_id: string
          target_content_id: string
          target_campaign_id: string | null
          target_channel: string
          target_scheduled_for: string | null
        }
        Returns: string
      }
      mark_publication_published: {
        Args: {
          target_organization_id: string
          target_publication_id: string
          target_published_by_user_id: string
          target_external_ref: string
        }
        Returns: boolean
      }
      cancel_publication: {
        Args: {
          target_organization_id: string
          target_publication_id: string
          target_reason: string
        }
        Returns: boolean
      }
      record_conversation_reply: {
        Args: {
          target_organization_id: string
          target_conversation_id: string
          target_replied_by_user_id: string
        }
        Returns: boolean
      }
      close_conversation: {
        Args: {
          target_organization_id: string
          target_conversation_id: string
          target_reason: string | null
        }
        Returns: boolean
      }
      pending_content_reviews: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          content_id: string
          title: string
          kind: string
          language: string | null
          author_user_id: string | null
          updated_at: string
        }[]
      }
      upcoming_publications: {
        Args: {
          target_organization_id: string
          target_days_ahead: number
        }
        Returns: {
          publication_id: string
          content_piece_id: string
          channel: string
          scheduled_for: string | null
          campaign_id: string | null
        }[]
      }
      open_conversations: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          conversation_id: string
          lead_id: string | null
          channel: string
          external_thread_ref: string | null
          subject: string | null
          status: string
          last_inbound_at: string | null
          assigned_user_id: string | null
        }[]
      }
      record_opportunity_attribution: {
        Args: {
          target_organization_id: string
          target_opportunity_id: string
          target_source_type: string
          target_source_id: string | null
          target_confidence: string
          target_reason: string
          target_attributed_by_user_id: string | null
          target_provenance: Json
        }
        Returns: string
      }
      revoke_opportunity_attribution: {
        Args: {
          target_organization_id: string
          target_attribution_id: string
          target_revoked_by_user_id: string
          target_reason: string
        }
        Returns: boolean
      }
      attribution_report_by_source: {
        Args: {
          target_organization_id: string
          target_since: string
          target_until: string
        }
        Returns: {
          source_type: string
          source_id: string | null
          confidence: string
          opportunity_count: number
          distinct_opportunities: number
          total_estimated_value: number
          currency_mix: string[] | null
        }[]
      }
      opportunity_attributions_for: {
        Args: {
          target_organization_id: string
          target_opportunity_id: string
          target_include_revoked: boolean
        }
        Returns: {
          attribution_id: string
          source_type: string
          source_id: string | null
          confidence: string
          reason: string
          attributed_by_user_id: string | null
          attributed_at: string
          revoked_at: string | null
          revoked_by_user_id: string | null
          revoke_reason: string | null
          provenance: Json
        }[]
      }
      supersede_regulatory_gwp_value: {
        Args: {
          target_gwp_id: string
          target_effective_until: string
        }
        Returns: boolean
      }
      supersede_regulatory_leak_check_rule: {
        Args: {
          target_rule_id: string
          target_effective_until: string
        }
        Returns: boolean
      }
      supersede_regulatory_market_ban: {
        Args: {
          target_ban_id: string
          target_effective_until: string
        }
        Returns: boolean
      }
      record_regulatory_attestation: {
        Args: {
          target_organization_id: string
          target_attestation_kind: string
          target_scope: string
          target_holder_user_id: string | null
          target_reference_number: string
          target_issued_by: string
          target_issued_at: string
          target_valid_from: string
          target_valid_until: string
          target_document_id: string | null
        }
        Returns: string
      }
      revoke_regulatory_attestation: {
        Args: {
          target_organization_id: string
          target_attestation_id: string
          target_reason: string
        }
        Returns: boolean
      }
      current_gwp_value: {
        Args: {
          target_fluid_code: string
          target_at: string | null
        }
        Returns: {
          gwp_id: string
          fluid_name: string
          gwp_100y: number
          ipcc_assessment: string
          effective_from: string
          effective_until: string | null
          source_ref: string
        }[]
      }
      current_leak_check_rule: {
        Args: {
          target_tco2eq: number
          target_at: string | null
        }
        Returns: {
          rule_id: string
          rule_code: string
          min_tco2eq: number
          max_tco2eq: number | null
          cadence_days: number
          requires_leak_detector: boolean
          detector_reduction_factor: number | null
          effective_from: string
          effective_until: string | null
          source_ref: string
        }[]
      }
      active_regulatory_attestations: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          attestation_id: string
          attestation_kind: string
          scope: string
          holder_user_id: string | null
          reference_number: string
          issued_by: string
          valid_from: string
          valid_until: string
          days_until_expiry: number
        }[]
      }
      compute_equipment_tco2eq: {
        Args: {
          target_organization_id: string
          target_equipment_id: string
          target_at: string | null
        }
        Returns: {
          tco2eq: number
          fluid_code: string
          charge_kg: number
          gwp_value_id: string
          gwp_100y: number
          ipcc_assessment: string
          gwp_source_ref: string
          at_date: string
        }[]
      }
      compute_next_leak_check_due: {
        Args: {
          target_organization_id: string
          target_equipment_id: string
          target_at: string | null
        }
        Returns: {
          next_due_at: string
          cadence_days: number
          matched_rule_id: string
          matched_rule_code: string
          rule_source_ref: string
          hermetic_exempt: boolean
          mobile_not_yet_applies: boolean
          detector_doubled: boolean
          tco2eq_snapshot: number
          gwp_value_id_snapshot: string
          at_date: string
        }[]
      }
      emit_regulatory_leak_check_attention: {
        Args: {
          target_organization_id: string
          target_equipment_id: string
        }
        Returns: string | null
      }
      emit_regulatory_attestation_expiry_attention: {
        Args: {
          target_organization_id: string
          target_attestation_id: string
          target_days_before: number
        }
        Returns: string | null
      }
      mark_regulatory_attention_seen: {
        Args: {
          target_organization_id: string
          target_attention_id: string
          target_seen_by_user_id: string
        }
        Returns: boolean
      }
      resolve_regulatory_attention: {
        Args: {
          target_organization_id: string
          target_attention_id: string
          target_resolved_by_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      open_regulatory_attentions: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          attention_id: string
          category: string
          priority: string
          entity_type: string
          entity_id: string
          title: string
          explanation: string | null
          suggested_action: string | null
          rule_snapshot: Json
          seen_at: string | null
          seen_by_user_id: string | null
          created_at: string
        }[]
      }
      equipment_leak_check_pipeline: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          equipment_id: string
          label: string
          external_ref: string | null
          fluid_code: string
          charge_kg: number
          tco2eq: number
          last_leak_check_at: string | null
          next_due_at: string | null
          matched_rule_code: string | null
        }[]
      }
      generate_cerfa_intervention_export: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_generator_user_id: string
        }
        Returns: string
      }
      generate_annual_regulatory_bilan: {
        Args: {
          target_organization_id: string
          target_year: number
          target_generator_user_id: string
        }
        Returns: string
      }
      mark_regulatory_export_exported: {
        Args: {
          target_organization_id: string
          target_export_id: string
          target_exported_by_user_id: string
          target_export_format: string
        }
        Returns: boolean
      }
      regulatory_exports_for: {
        Args: {
          target_organization_id: string
          target_export_kind: string | null
          target_year: number | null
          target_intervention_id: string | null
          target_include_superseded: boolean
        }
        Returns: {
          export_id: string
          export_kind: string
          reference_year: number | null
          reference_intervention_id: string | null
          status: string
          payload_gap_count: number
          generated_by_user_id: string | null
          generated_at: string
          exported_at: string | null
          exported_by_user_id: string | null
          export_format: string | null
          superseded_at: string | null
        }[]
      }
      pending_cerfa_interventions: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          intervention_id: string
          title: string
          completed_at: string | null
          customer_id: string
        }[]
      }
      configure_einvoicing_provider: {
        Args: {
          target_organization_id: string
          target_provider_kind: string
          target_label: string
          target_supported_formats: string[]
          target_external_config: Json
        }
        Returns: string
      }
      prepare_einvoicing_submission: {
        Args: {
          target_organization_id: string
          target_invoice_id: string
          target_provider_id: string
          target_format: string
        }
        Returns: string
      }
      mark_einvoicing_submission_exported: {
        Args: {
          target_organization_id: string
          target_submission_id: string
          target_exported_by_user_id: string
        }
        Returns: boolean
      }
      record_einvoicing_provider_event: {
        Args: {
          target_organization_id: string
          target_submission_id: string
          target_event_kind: string
          target_external_ref: string | null
          target_payload: Json
        }
        Returns: string
      }
      cancel_einvoicing_submission: {
        Args: {
          target_organization_id: string
          target_submission_id: string
          target_reason: string
        }
        Returns: boolean
      }
      active_einvoicing_provider: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          provider_id: string
          provider_kind: string
          label: string
          status: string
          supported_formats: string[]
          activated_at: string | null
        }[]
      }
      einvoicing_submissions_for: {
        Args: {
          target_organization_id: string
          target_status_filter: string | null
        }
        Returns: {
          submission_id: string
          invoice_id: string
          provider_id: string
          provider_kind_snapshot: string
          format: string
          status: string
          payload_gap_count: number
          exported_at: string | null
          submitted_at: string | null
          accepted_at: string | null
          rejected_at: string | null
          external_ref: string | null
        }[]
      }
      configure_financing_partner: {
        Args: {
          target_organization_id: string
          target_partner_id: string | null
          target_name: string
          target_partner_type: string
          target_contact_email: string | null
          target_contact_phone: string | null
          target_external_ref: string | null
          target_commission_terms_note: string | null
        }
        Returns: string
      }
      archive_financing_partner: {
        Args: {
          target_organization_id: string
          target_partner_id: string
          target_reason: string
        }
        Returns: boolean
      }
      initiate_financing_referral: {
        Args: {
          target_organization_id: string
          target_customer_id: string
          target_partner_id: string
          target_opportunity_id: string | null
          target_quote_id: string | null
          target_referred_by_user_id: string
          target_consent_scope: string
          target_consent_evidence_note: string | null
          target_client_document_checklist: Json
        }
        Returns: string
      }
      transition_financing_referral_status: {
        Args: {
          target_organization_id: string
          target_referral_id: string
          target_new_status: string
          target_actor_user_id: string
          target_notes: string | null
        }
        Returns: boolean
      }
      record_financing_commission: {
        Args: {
          target_organization_id: string
          target_referral_id: string
          target_amount: number
          target_currency: string
          target_actor_user_id: string
          target_note: string | null
        }
        Returns: boolean
      }
      active_financing_partners: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          partner_id: string
          name: string
          partner_type: string
          external_ref: string | null
          contact_email: string | null
          contact_phone: string | null
          commission_terms_note: string | null
          status: string
          activated_at: string
        }[]
      }
      financing_referrals_for: {
        Args: {
          target_organization_id: string
          target_status_filter: string | null
          target_customer_id: string | null
        }
        Returns: {
          referral_id: string
          customer_id: string
          partner_id: string
          partner_name: string
          opportunity_id: string | null
          quote_id: string | null
          status: string
          referred_by_user_id: string
          referred_at: string
          status_changed_at: string | null
          status_notes: string | null
          commission_amount: number | null
          commission_currency: string | null
          checklist_item_count: number
        }[]
      }
      arrive_at_intervention: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_actor_user_id: string
          target_arrived_at: string
          target_offline_client_id: string | null
        }
        Returns: boolean
      }
      start_intervention_work: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_actor_user_id: string
          target_started_at: string
        }
        Returns: boolean
      }
      submit_intervention_field_artifact: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_artifact_kind: string
          target_payload: Json
          target_captured_at: string
          target_captured_by_user_id: string
          target_offline_client_id: string
        }
        Returns: {
          artifact_id: string
          upload_status: string
          conflict_reason: string | null
        }[]
      }
      resolve_field_artifact_conflict: {
        Args: {
          target_organization_id: string
          target_artifact_id: string
          target_actor_user_id: string
          target_new_status: string
          target_note: string | null
        }
        Returns: boolean
      }
      technician_day: {
        Args: {
          target_organization_id: string
          target_user_id: string
          target_date: string
        }
        Returns: {
          intervention_id: string
          title: string
          status: string
          customer_id: string
          customer_display_name: string | null
          customer_phone: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_city: string | null
          scheduled_at: string | null
          duration_minutes: number | null
          arrived_at: string | null
          started_at: string | null
          completed_at: string | null
          equipment_id: string | null
          quote_id: string | null
          opportunity_id: string | null
          notes: string | null
        }[]
      }
      intervention_field_artifacts_for: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
        }
        Returns: {
          artifact_id: string
          artifact_kind: string
          payload: Json
          captured_at: string
          captured_by_user_id: string
          offline_client_id: string
          upload_status: string
          conflict_reason: string | null
          uploaded_at: string
        }[]
      }
      pending_field_artifact_conflicts: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          artifact_id: string
          intervention_id: string
          artifact_kind: string
          captured_at: string
          captured_by_user_id: string
          conflict_reason: string | null
          uploaded_at: string
        }[]
      }
      upsert_voice_policy: {
        Args: {
          target_organization_id: string
          target_actor_user_id: string
          target_ai_disclosure_message: string
          target_ai_disclosure_version: string
          target_recording_notice_message: string
          target_recording_notice_version: string
          target_retention_recording_days: number
          target_retention_transcript_days: number
          target_opt_out_behavior: string
          target_synthetic_audio_watermark_enabled: boolean
          target_legal_hold_finality_note: string | null
        }
        Returns: string
      }
      mark_voice_policy_europe_verified: {
        Args: {
          target_organization_id: string
          target_verified_by_user_id: string
          target_verification_note: string
        }
        Returns: boolean
      }
      record_voice_call_received: {
        Args: {
          target_organization_id: string
          target_provider_kind: string
          target_external_call_ref: string
          target_caller_phone: string | null
          target_started_at: string | null
        }
        Returns: string
      }
      mark_voice_call_disclosures_played: {
        Args: {
          target_organization_id: string
          target_call_id: string
        }
        Returns: boolean
      }
      mark_voice_call_opted_out: {
        Args: {
          target_organization_id: string
          target_call_id: string
        }
        Returns: boolean
      }
      record_voice_call_recording: {
        Args: {
          target_organization_id: string
          target_call_id: string
          target_recording_ref: string
          target_duration_ms: number | null
        }
        Returns: boolean
      }
      record_voice_call_transcript: {
        Args: {
          target_organization_id: string
          target_call_id: string
          target_transcript_ref: string
        }
        Returns: boolean
      }
      record_voice_call_processed: {
        Args: {
          target_organization_id: string
          target_call_id: string
          target_processed_ai_run_id: string | null
          target_matched_customer_id: string | null
          target_matched_lead_id: string | null
          target_processed_request_id: string | null
          target_processed_attention_id: string | null
          target_metadata: Json
        }
        Returns: boolean
      }
      close_voice_call: {
        Args: {
          target_organization_id: string
          target_call_id: string
          target_ended_at: string | null
        }
        Returns: boolean
      }
      purge_expired_voice_recordings: {
        Args: {
          target_organization_id: string
          target_batch_limit: number
        }
        Returns: number
      }
      purge_expired_voice_transcripts: {
        Args: {
          target_organization_id: string
          target_batch_limit: number
        }
        Returns: number
      }
      voice_policy_for: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          policy_id: string
          ai_disclosure_message: string
          ai_disclosure_message_version: string
          recording_notice_message: string
          recording_notice_message_version: string
          retention_recording_days: number
          retention_transcript_days: number
          opt_out_behavior: string
          synthetic_audio_watermark_enabled: boolean
          region_europe_verified: boolean
          region_verified_at: string | null
          legal_hold_finality_note: string | null
        }[]
      }
      voice_calls_for: {
        Args: {
          target_organization_id: string
          target_status_filter: string | null
        }
        Returns: {
          call_id: string
          provider_kind: string
          external_call_ref: string
          caller_phone: string | null
          matched_customer_id: string | null
          matched_lead_id: string | null
          status: string
          ai_disclosure_played_at: string | null
          recording_notice_played_at: string | null
          opt_out_at: string | null
          duration_ms: number | null
          started_at: string
          ended_at: string | null
          retention_expires_at: string
          purged_recording_at: string | null
          purged_transcript_at: string | null
        }[]
      }
      configure_platform_component: {
        Args: {
          target_organization_id: string
          target_actor_user_id: string
          target_component_kind: string
          target_display_label: string
          target_provider_kind: string | null
          target_region: string | null
          target_config: Json
        }
        Returns: string
      }
      engage_kill_switch: {
        Args: {
          target_organization_id: string
          target_component_kind: string
          target_actor_user_id: string
          target_reason: string
        }
        Returns: boolean
      }
      release_kill_switch: {
        Args: {
          target_organization_id: string
          target_component_kind: string
          target_actor_user_id: string
          target_reason: string
        }
        Returns: boolean
      }
      is_platform_component_enabled: {
        Args: {
          target_organization_id: string
          target_component_kind: string
        }
        Returns: boolean
      }
      record_platform_component_event: {
        Args: {
          target_organization_id: string
          target_component_kind: string
          target_event_kind: string
          target_severity: string
          target_latency_ms: number | null
          target_external_ref: string | null
          target_error_code: string | null
          target_error_message: string | null
          target_metadata: Json
        }
        Returns: string
      }
      record_platform_component_backlog: {
        Args: {
          target_organization_id: string
          target_component_kind: string
          target_backlog_size: number
          target_oldest_item_age_seconds: number | null
          target_metadata: Json
        }
        Returns: string
      }
      platform_component_dashboard: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          component_id: string
          component_kind: string
          display_label: string
          provider_kind: string | null
          region: string | null
          status: string
          status_reason: string | null
          status_changed_at: string | null
          config: Json
          last_heartbeat_at: string | null
          last_success_at: string | null
          last_error_at: string | null
          last_error_message: string | null
          success_count_last_hour: number
          error_count_last_hour: number
          retry_count_last_hour: number
          fallback_count_last_hour: number
          avg_latency_ms_last_hour: number | null
          latest_backlog_size: number | null
          latest_backlog_measured_at: string | null
          latest_backlog_oldest_age_seconds: number | null
        }[]
      }
      platform_component_events_for: {
        Args: {
          target_organization_id: string
          target_component_kind: string
          target_since: string | null
          target_severity_filter: string | null
        }
        Returns: {
          event_id: string
          event_kind: string
          severity: string
          latency_ms: number | null
          external_ref: string | null
          error_code: string | null
          error_message: string | null
          metadata: Json
          recorded_at: string
        }[]
      }
      ai_provider_stats: {
        Args: {
          target_organization_id: string
          target_since: string
          target_until: string
        }
        Returns: {
          model: string
          provider: string
          call_count: number
          success_count: number
          error_count: number
          tokens_input: number
          tokens_output: number
          total_estimated_cost: number
          avg_latency_ms: number | null
          p95_latency_ms: number | null
        }[]
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
      assign_dispatch: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_technician_user_id: string
          target_vehicle_id: string | null
          target_scheduled_start: string
          target_scheduled_end: string
          target_idempotency_key: string | null
          target_version_expected: number | null
        }
        Returns: {
          assignment_id: string
          version: number
          created: boolean
        }[]
      }
      acknowledge_dispatch: {
        Args: {
          target_organization_id: string
          target_assignment_id: string
          target_acknowledged_by_user_id: string
          target_version_expected: number
        }
        Returns: boolean
      }
      mark_en_route: {
        Args: {
          target_organization_id: string
          target_assignment_id: string
          target_at: string
          target_version_expected: number
        }
        Returns: boolean
      }
      reorder_route: {
        Args: {
          target_organization_id: string
          target_technician_user_id: string
          target_day: string
          target_timezone: string
          target_ordered_assignment_ids: string[]
        }
        Returns: number
      }
      release_assignment: {
        Args: {
          target_organization_id: string
          target_assignment_id: string
          target_reason: string
          target_version_expected: number
        }
        Returns: boolean
      }
      get_team_dispatch_day: {
        Args: {
          target_organization_id: string
          target_day: string
          target_timezone: string
        }
        Returns: {
          technician_user_id: string
          assignment_id: string
          intervention_id: string
          vehicle_id: string | null
          dispatch_status: string
          scheduled_start: string
          scheduled_end: string
          route_order: number | null
          version: number
          intervention_title: string
          intervention_status: string
          customer_id: string
          customer_display_name: string | null
          address_line1: string | null
          address_city: string | null
        }[]
      }
      get_dispatch_conflicts: {
        Args: {
          target_organization_id: string
          target_horizon_days: number
        }
        Returns: {
          conflict_kind: string
          technician_user_id: string | null
          vehicle_id: string | null
          assignment_id_a: string
          assignment_id_b: string | null
          detail: string
        }[]
      }
      scan_dispatch_attentions: {
        Args: {
          target_organization_id: string
        }
        Returns: number
      }
      configure_fleet_tracking_policy: {
        Args: {
          target_organization_id: string
          target_enabled: boolean
          target_purpose: string
          target_retention_days: number
          target_allowed_hours: Json | null
          target_session_based: boolean
          target_freshness_seconds: number
        }
        Returns: string
      }
      record_fleet_location_ping: {
        Args: {
          target_organization_id: string
          target_vehicle_id: string
          target_technician_user_id: string | null
          target_dispatch_assignment_id: string | null
          target_captured_at: string
          target_latitude: number
          target_longitude: number
          target_accuracy_m: number | null
          target_speed_kph: number | null
          target_heading: number | null
          target_source: string
          target_provider_ref: string | null
          target_device_ref: string | null
          target_offline_client_id: string | null
        }
        Returns: {
          ping_id: string
          created: boolean
        }[]
      }
      record_fleet_route_estimate: {
        Args: {
          target_organization_id: string
          target_dispatch_assignment_id: string
          target_status: string
          target_provider_kind: string
          target_provider_ref: string | null
          target_distance_m: number | null
          target_duration_seconds: number | null
          target_failure_reason: string | null
        }
        Returns: string
      }
      latest_vehicle_positions: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          vehicle_id: string
          vehicle_label: string
          latest_ping_id: string | null
          captured_at: string | null
          received_at: string | null
          latitude: number | null
          longitude: number | null
          speed_kph: number | null
          heading: number | null
          age_seconds: number | null
          is_fresh: boolean
        }[]
      }
      dispatch_eta_snapshot: {
        Args: {
          target_organization_id: string
          target_dispatch_assignment_id: string
        }
        Returns: {
          estimate_id: string
          status: string
          provider_kind: string
          distance_m: number | null
          duration_seconds: number | null
          calculated_at: string
          failure_reason: string | null
        }[]
      }
      purge_expired_fleet_pings: {
        Args: {
          target_organization_id: string
        }
        Returns: number
      }
      scan_fleet_telemetry_attentions: {
        Args: {
          target_organization_id: string
        }
        Returns: number
      }
      start_procedure_run: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_template_id: string
          target_actor_user_id: string
        }
        Returns: string
      }
      submit_step_result: {
        Args: {
          target_organization_id: string
          target_run_id: string
          target_step_id: string
          target_value_json: Json
          target_captured_at: string
          target_actor_user_id: string
          target_offline_client_id: string | null
          target_device_ref: string | null
        }
        Returns: {
          result_id: string
          sync_status: string
          created: boolean
        }[]
      }
      reserve_binary_artifact: {
        Args: {
          target_organization_id: string
          target_intervention_id: string
          target_run_id: string | null
          target_kind: string
          target_expected_sha256: string
          target_captured_at: string
          target_uploaded_by_user_id: string
          target_offline_client_id: string | null
          target_payload_snapshot: Json
        }
        Returns: {
          artifact_id: string
          storage_bucket: string
          storage_path: string
          upload_status: string
          created: boolean
        }[]
      }
      finalize_binary_artifact: {
        Args: {
          target_organization_id: string
          target_artifact_id: string
          target_actual_sha256: string
          target_size_bytes: number
          target_content_type: string
        }
        Returns: {
          artifact_id: string
          upload_status: string
          conflict_reason: string | null
        }[]
      }
      submit_signature_evidence: {
        Args: {
          target_organization_id: string
          target_run_id: string
          target_artifact_id: string
          target_signer_name: string
          target_signer_role: string
          target_consent_version: string
        }
        Returns: boolean
      }
      mark_run_ready_for_review: {
        Args: {
          target_organization_id: string
          target_run_id: string
        }
        Returns: boolean
      }
      complete_run: {
        Args: {
          target_organization_id: string
          target_run_id: string
          target_review_notes: string | null
        }
        Returns: boolean
      }
      resolve_step_conflict: {
        Args: {
          target_organization_id: string
          target_result_id: string
          target_actor_user_id: string
          target_decision: string
          target_note: string | null
        }
        Returns: boolean
      }
      record_sms_intent: {
        Args: {
          target_organization_id: string
          target_idempotency_key: string
          target_template_key: string
          target_template_version: number
          target_to_phone: string
          target_body_text: string
          target_variables_json: Json
          target_execution_mode: string
        }
        Returns: {
          message_id: string
          status: string
          created: boolean
        }[]
      }
      approve_sms: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_approver_user_id: string
        }
        Returns: boolean
      }
      mark_sms_sent: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_integration_id: string
          target_provider_message_id: string
          target_sent_at: string
        }
        Returns: boolean
      }
      mark_sms_delivered: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_delivered_at: string
        }
        Returns: boolean
      }
      mark_sms_undeliverable: {
        Args: {
          target_organization_id: string
          target_message_id: string
          target_error_class: string
          target_error_message: string
        }
        Returns: boolean
      }
      record_sms_opt_out: {
        Args: {
          target_organization_id: string
          target_phone_e164: string
          target_source: string
          target_note: string | null
        }
        Returns: string
      }
      create_document_version: {
        Args: {
          target_organization_id: string
          target_document_id: string
          target_sha256: string
          target_storage_bucket: string
          target_storage_path: string
          target_mime_type: string | null
          target_size_bytes: number | null
          target_source_reference: string | null
        }
        Returns: string
      }
      request_document_trust: {
        Args: {
          target_organization_id: string
          target_document_version_id: string
          target_capability: string
          target_requested_level: string
          target_provider_id: string | null
          target_idempotency_key: string
        }
        Returns: {
          request_id: string
          status: string
          created: boolean
        }[]
      }
      mark_trust_request_ready: {
        Args: {
          target_organization_id: string
          target_request_id: string
        }
        Returns: boolean
      }
      mark_trust_request_submitted: {
        Args: {
          target_organization_id: string
          target_request_id: string
          target_external_ref: string
        }
        Returns: boolean
      }
      record_trust_evidence: {
        Args: {
          target_organization_id: string
          target_request_id: string
          target_provider_ref: string
          target_confirmed_at: string
          target_raw_evidence_storage_path: string | null
          target_certificate_metadata: Json
          target_timestamp_token_reference: string | null
          target_signature_seal_level_reported_by_provider: string | null
          target_outcome: string
        }
        Returns: string | null
      }
      verify_trust_evidence: {
        Args: {
          target_organization_id: string
          target_evidence_id: string
          target_verification_result: string
          target_verification_notes: string | null
        }
        Returns: boolean
      }
      cancel_trust_request: {
        Args: {
          target_organization_id: string
          target_request_id: string
          target_reason: string
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

