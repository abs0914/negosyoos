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
      payment_checkouts: {
        Row: {
          id: string
          organization_id: string
          plan_key: string
          billing_interval: string
          branch_limit: number
          amount_centavos: number
          currency: string
          livemode: boolean
          status: string
          provider_session_id: string | null
          provider_payment_id: string | null
          checkout_url: string | null
          created_at: string
          paid_at: string | null
          period_start: string | null
          period_end: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          plan_key: string
          billing_interval: string
          branch_limit: number
          amount_centavos: number
          currency?: string
          livemode: boolean
          status?: string
          provider_session_id?: string | null
          provider_payment_id?: string | null
          checkout_url?: string | null
          created_at?: string
          paid_at?: string | null
          period_start?: string | null
          period_end?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          plan_key?: string
          billing_interval?: string
          branch_limit?: number
          amount_centavos?: number
          currency?: string
          livemode?: boolean
          status?: string
          provider_session_id?: string | null
          provider_payment_id?: string | null
          checkout_url?: string | null
          created_at?: string
          paid_at?: string | null
          period_start?: string | null
          period_end?: string | null
        }
        Relationships: []
      }
      accounting_integration_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          created_at: string
          event_key: string
          event_type: string
          id: string
          last_error: string | null
          organization_id: string
          payload: Json
          processed_at: string | null
          processing_status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempt_count?: number
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          last_error?: string | null
          organization_id: string
          payload: Json
          processed_at?: string | null
          processing_status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempt_count?: number
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          last_error?: string | null
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_integration_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_business_query_definitions: {
        Row: {
          created_at: string
          date_behavior: string
          description: string
          is_enabled: boolean
          key: string
          label: string
          required_permission: string
        }
        Insert: {
          created_at?: string
          date_behavior: string
          description: string
          is_enabled?: boolean
          key: string
          label: string
          required_permission: string
        }
        Update: {
          created_at?: string
          date_behavior?: string
          description?: string
          is_enabled?: boolean
          key?: string
          label?: string
          required_permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_business_query_definitions_required_permission_fkey"
            columns: ["required_permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      ai_advisor_conversations: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_conversations_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_advisor_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_advisor_events: {
        Row: {
          actor_id: string
          assistant_message_id: string | null
          business_query_keys: string[]
          conversation_id: string
          created_at: string
          event: string
          id: string
          metric_keys: string[]
          organization_id: string
        }
        Insert: {
          actor_id: string
          assistant_message_id?: string | null
          business_query_keys?: string[]
          conversation_id: string
          created_at?: string
          event: string
          id?: string
          metric_keys?: string[]
          organization_id: string
        }
        Update: {
          actor_id?: string
          assistant_message_id?: string | null
          business_query_keys?: string[]
          conversation_id?: string
          created_at?: string
          event?: string
          id?: string
          metric_keys?: string[]
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_events_assistant_message_id_fkey"
            columns: ["assistant_message_id"]
            isOneToOne: false
            referencedRelation: "ai_advisor_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_advisor_events_conversation_id_organization_id_fkey"
            columns: ["conversation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_advisor_conversations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_advisor_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_advisor_messages: {
        Row: {
          business_query_evidence: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          metric_evidence: Json | null
          organization_id: string
          response_data: Json | null
          role: string
        }
        Insert: {
          business_query_evidence?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metric_evidence?: Json | null
          organization_id: string
          response_data?: Json | null
          role: string
        }
        Update: {
          business_query_evidence?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metric_evidence?: Json | null
          organization_id?: string
          response_data?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_advisor_messages_conversation_id_organization_id_fkey"
            columns: ["conversation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_advisor_conversations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_advisor_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          interview_id: string
          organization_id: string
          role: string
          stage: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          interview_id: string
          organization_id: string
          role: string
          stage: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          interview_id?: string
          organization_id?: string
          role?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_business_interview_message_interview_id_organization_id_fkey"
            columns: ["interview_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_business_interviews"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_business_interview_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_interviews: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          current_stage: string
          id: string
          organization_id: string
          profile: Json
          recommendation: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_stage?: string
          id?: string
          organization_id: string
          profile?: Json
          recommendation?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_stage?: string
          id?: string
          organization_id?: string
          profile?: Json
          recommendation?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_business_interviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_configurations: {
        Row: {
          created_at: string
          feature_config: Json
          id: string
          is_enabled: boolean
          model: string
          organization_id: string
          policy_config: Json
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_config?: Json
          id?: string
          is_enabled?: boolean
          model: string
          organization_id: string
          policy_config?: Json
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_config?: Json
          id?: string
          is_enabled?: boolean
          model?: string
          organization_id?: string
          policy_config?: Json
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendation_events: {
        Row: {
          actor_id: string
          created_at: string
          event: string
          from_status: string | null
          id: string
          organization_id: string
          recommendation_id: string
          to_status: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event: string
          from_status?: string | null
          id?: string
          organization_id: string
          recommendation_id: string
          to_status: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          recommendation_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendation_events_recommendation_id_organization_id_fkey"
            columns: ["recommendation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          dismissed_at: string | null
          evidence_fingerprint: string
          id: string
          organization_id: string
          potential_action: string
          priority: string
          reason: string
          recommendation_type: string
          required_permissions: string[]
          rule_key: string
          status: string
          summary: string
          supporting_metrics: Json
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          dismissed_at?: string | null
          evidence_fingerprint: string
          id?: string
          organization_id: string
          potential_action: string
          priority: string
          reason: string
          recommendation_type: string
          required_permissions: string[]
          rule_key: string
          status?: string
          summary: string
          supporting_metrics: Json
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          dismissed_at?: string | null
          evidence_fingerprint?: string
          id?: string
          organization_id?: string
          potential_action?: string
          priority?: string
          reason?: string
          recommendation_type?: string
          required_permissions?: string[]
          rule_key?: string
          status?: string
          summary?: string
          supporting_metrics?: Json
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_system_builder_events: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          id: string
          message_id: string | null
          organization_id: string
          proposal_id: string | null
          session_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          message_id?: string | null
          organization_id: string
          proposal_id?: string | null
          session_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          message_id?: string | null
          organization_id?: string
          proposal_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_system_builder_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_system_builder_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_system_builder_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_system_builder_events_proposal_id_organization_id_fkey"
            columns: ["proposal_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "configuration_change_sets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_system_builder_events_session_id_organization_id_fkey"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_system_builder_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ai_system_builder_messages: {
        Row: {
          content: string
          created_at: string
          explanation: Json | null
          id: string
          organization_id: string
          proposal_id: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          explanation?: Json | null
          id?: string
          organization_id: string
          proposal_id?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          explanation?: Json | null
          id?: string
          organization_id?: string
          proposal_id?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_system_builder_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_system_builder_messages_proposal_id_organization_id_fkey"
            columns: ["proposal_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "configuration_change_sets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_system_builder_messages_session_id_organization_id_fkey"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_system_builder_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ai_system_builder_sessions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_system_builder_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metric_definitions: {
        Row: {
          created_at: string
          default_period: string
          description: string
          is_enabled: boolean
          key: string
          label: string
          required_permission: string
          supports_branch_filter: boolean
          supports_date_filter: boolean
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          default_period: string
          description: string
          is_enabled?: boolean
          key: string
          label: string
          required_permission: string
          supports_branch_filter?: boolean
          supports_date_filter: boolean
          updated_at?: string
          value_type: string
        }
        Update: {
          created_at?: string
          default_period?: string
          description?: string
          is_enabled?: boolean
          key?: string
          label?: string
          required_permission?: string
          supports_branch_filter?: boolean
          supports_date_filter?: boolean
          updated_at?: string
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metric_definitions_required_permission_fkey"
            columns: ["required_permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      appointment_audit_history: {
        Row: {
          actor_id: string
          appointment_id: string
          created_at: string
          details: Json
          event: string
          from_status: string | null
          id: string
          organization_id: string
          to_status: string | null
        }
        Insert: {
          actor_id: string
          appointment_id: string
          created_at?: string
          details?: Json
          event: string
          from_status?: string | null
          id?: string
          organization_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string
          appointment_id?: string
          created_at?: string
          details?: Json
          event?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_audit_history_appointment_id_organization_id_fkey"
            columns: ["appointment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "appointment_audit_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_counters: {
        Row: {
          next_value: number
          organization_id: string
        }
        Insert: {
          next_value?: number
          organization_id: string
        }
        Update: {
          next_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_staff: {
        Row: {
          color: string
          created_at: string
          display_name: string
          id: string
          membership_id: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name: string
          id?: string
          membership_id: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          membership_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_staff_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "appointment_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_number: string
          branch_id: string
          created_at: string
          created_by: string
          customer_id: string
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          service_id: string
          staff_id: string
          start_time: string
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          appointment_date: string
          appointment_number: string
          branch_id: string
          created_at?: string
          created_by: string
          customer_id: string
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          service_id: string
          staff_id: string
          start_time: string
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          appointment_date?: string
          appointment_number?: string
          branch_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          service_id?: string
          staff_id?: string
          start_time?: string
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "appointments_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_organization_id_fkey"
            columns: ["service_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "appointments_staff_id_organization_id_fkey"
            columns: ["staff_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "appointment_staff"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      approval_audit_history: {
        Row: {
          actor_id: string
          approval_request_id: string
          approval_step_id: string | null
          created_at: string
          details: Json
          event: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          approval_request_id: string
          approval_step_id?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          approval_request_id?: string
          approval_step_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_audit_history_approval_request_id_organization_id_fkey"
            columns: ["approval_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "approval_audit_history_approval_step_id_organization_id_fkey"
            columns: ["approval_step_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      approval_decisions: {
        Row: {
          approval_request_id: string
          approval_step_id: string
          comment: string | null
          decided_at: string
          decided_by: string
          decision: string
          id: string
          organization_id: string
        }
        Insert: {
          approval_request_id: string
          approval_step_id: string
          comment?: string | null
          decided_at?: string
          decided_by: string
          decision: string
          id?: string
          organization_id: string
        }
        Update: {
          approval_request_id?: string
          approval_step_id?: string
          comment?: string | null
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_approval_request_id_organization_id_fkey"
            columns: ["approval_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "approval_decisions_approval_step_id_organization_id_fkey"
            columns: ["approval_step_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_by: string | null
          category: string
          completed_at: string | null
          created_at: string
          current_step_position: number
          description: string | null
          id: string
          organization_id: string
          requester_id: string
          source_object_definition_id: string | null
          source_record_id: string | null
          status: string
          title: string
          total_steps: number
          updated_at: string
          workflow_execution_step_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_step_position?: number
          description?: string | null
          id?: string
          organization_id: string
          requester_id: string
          source_object_definition_id?: string | null
          source_record_id?: string | null
          status?: string
          title: string
          total_steps?: number
          updated_at?: string
          workflow_execution_step_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_step_position?: number
          description?: string | null
          id?: string
          organization_id?: string
          requester_id?: string
          source_object_definition_id?: string | null
          source_record_id?: string | null
          status?: string
          title?: string
          total_steps?: number
          updated_at?: string
          workflow_execution_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_source_object_definition_id_organization_fkey"
            columns: ["source_object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_approval_requests_execution_step_id_organization__fkey"
            columns: ["workflow_execution_step_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_execution_steps"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approval_requests_source_record_id_organization_i_fkey"
            columns: ["source_record_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_records"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          activated_at: string | null
          approval_request_id: string
          approver_role_key: string | null
          approver_type: string
          approver_user_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          key: string
          name: string
          organization_id: string
          position: number
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          approval_request_id: string
          approver_role_key?: string | null
          approver_type: string
          approver_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          key: string
          name: string
          organization_id: string
          position: number
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          approval_request_id?: string
          approver_role_key?: string | null
          approver_type?: string
          approver_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          key?: string
          name?: string
          organization_id?: string
          position?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_approval_request_id_organization_id_fkey"
            columns: ["approval_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ar_payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          idempotency_key: string
          organization_id: string
          payment_date: string
          payment_method: string
          payment_number: string
          reference: string | null
          unapplied_amount: number
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          idempotency_key: string
          organization_id: string
          payment_date: string
          payment_method: string
          payment_number: string
          reference?: string | null
          unapplied_amount: number
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          payment_date?: string
          payment_method?: string
          payment_number?: string
          reference?: string | null
          unapplied_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_payments_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ar_payments_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ar_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          device_info: Json
          employee_id: string
          event_type: string
          id: string
          idempotency_key: string
          latitude: number | null
          longitude: number | null
          occurred_at: string
          organization_id: string
          session_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          device_info?: Json
          employee_id: string
          event_type: string
          id?: string
          idempotency_key: string
          latitude?: number | null
          longitude?: number | null
          occurred_at: string
          organization_id: string
          session_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          device_info?: Json
          employee_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          latitude?: number | null
          longitude?: number | null
          occurred_at?: string
          organization_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_events_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_events_session_id_organization_id_fkey"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          branch_id: string
          break_minutes: number
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          created_by: string
          employee_id: string
          exported_at: string | null
          id: string
          is_late: boolean
          organization_id: string
          overtime_minutes: number | null
          payroll_reference: string | null
          payroll_status: string
          regular_minutes: number | null
          status: string
          updated_at: string
          work_date: string
          worked_minutes: number | null
        }
        Insert: {
          branch_id: string
          break_minutes?: number
          clock_in_at: string
          clock_out_at?: string | null
          created_at?: string
          created_by: string
          employee_id: string
          exported_at?: string | null
          id?: string
          is_late?: boolean
          organization_id: string
          overtime_minutes?: number | null
          payroll_reference?: string | null
          payroll_status?: string
          regular_minutes?: number | null
          status?: string
          updated_at?: string
          work_date: string
          worked_minutes?: number | null
        }
        Update: {
          branch_id?: string
          break_minutes?: number
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          created_by?: string
          employee_id?: string
          exported_at?: string | null
          id?: string
          is_late?: boolean
          organization_id?: string
          overtime_minutes?: number | null
          payroll_reference?: string | null
          payroll_status?: string
          regular_minutes?: number | null
          status?: string
          updated_at?: string
          work_date?: string
          worked_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_sessions_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          branch_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_metadata: Json
          occurred_at: string
          organization_id: string
          source: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_metadata?: Json
          occurred_at?: string
          organization_id: string
          source: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_metadata?: Json
          occurred_at?: string
          organization_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          actor_id: string | null
          details: Json
          event_type: string
          external_event_id: string | null
          from_plan_key: string | null
          id: string
          idempotency_key: string
          occurred_at: string
          organization_id: string
          provider: string
          subscription_id: string | null
          to_plan_key: string | null
        }
        Insert: {
          actor_id?: string | null
          details?: Json
          event_type: string
          external_event_id?: string | null
          from_plan_key?: string | null
          id?: string
          idempotency_key: string
          occurred_at?: string
          organization_id: string
          provider?: string
          subscription_id?: string | null
          to_plan_key?: string | null
        }
        Update: {
          actor_id?: string | null
          details?: Json
          event_type?: string
          external_event_id?: string | null
          from_plan_key?: string | null
          id?: string
          idempotency_key?: string
          occurred_at?: string
          organization_id?: string
          provider?: string
          subscription_id?: string | null
          to_plan_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_from_plan_key_fkey"
            columns: ["from_plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_organization_id_fkey"
            columns: ["subscription_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "billing_events_to_plan_key_fkey"
            columns: ["to_plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      branches: {
        Row: {
          address: Json
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: Json
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: Json
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_health_assessments: {
        Row: {
          completed_at: string
          completed_by: string
          created_at: string
          id: string
          industry: string
          organization_id: string
          priorities: string[]
          responses: Json
          scores: Json
          strengths: string[]
        }
        Insert: {
          completed_at?: string
          completed_by: string
          created_at?: string
          id?: string
          industry: string
          organization_id: string
          priorities: string[]
          responses: Json
          scores: Json
          strengths: string[]
        }
        Update: {
          completed_at?: string
          completed_by?: string
          created_at?: string
          id?: string
          industry?: string
          organization_id?: string
          priorities?: string[]
          responses?: Json
          scores?: Json
          strengths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "business_health_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_os_installation_events: {
        Row: {
          actor_id: string
          created_at: string
          created_count: number
          details: Json
          event: string
          from_version: number | null
          id: string
          installation_id: string
          organization_id: string
          preserved_count: number
          to_version: number
        }
        Insert: {
          actor_id: string
          created_at?: string
          created_count?: number
          details?: Json
          event: string
          from_version?: number | null
          id?: string
          installation_id: string
          organization_id: string
          preserved_count?: number
          to_version: number
        }
        Update: {
          actor_id?: string
          created_at?: string
          created_count?: number
          details?: Json
          event?: string
          from_version?: number | null
          id?: string
          installation_id?: string
          organization_id?: string
          preserved_count?: number
          to_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_os_installation_even_installation_id_organization_fkey"
            columns: ["installation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "business_os_installations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      business_os_installation_resources: {
        Row: {
          id: string
          installation_id: string
          installed_at: string
          organization_id: string
          resource_key: string
          resource_type: string
          source_version_id: string
          template_snapshot: Json
          tenant_resource_id: string | null
        }
        Insert: {
          id?: string
          installation_id: string
          installed_at?: string
          organization_id: string
          resource_key: string
          resource_type: string
          source_version_id: string
          template_snapshot: Json
          tenant_resource_id?: string | null
        }
        Update: {
          id?: string
          installation_id?: string
          installed_at?: string
          organization_id?: string
          resource_key?: string
          resource_type?: string
          source_version_id?: string
          template_snapshot?: Json
          tenant_resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_os_installation_reso_installation_id_organization_fkey"
            columns: ["installation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "business_os_installations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "business_os_installation_resources_source_version_id_fkey"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "business_os_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_os_installations: {
        Row: {
          id: string
          installed_at: string
          installed_by: string
          installed_version_id: string
          organization_id: string
          status: string
          template_id: string
          terminology: Json
          updated_at: string
        }
        Insert: {
          id?: string
          installed_at?: string
          installed_by: string
          installed_version_id: string
          organization_id: string
          status?: string
          template_id: string
          terminology?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          installed_at?: string
          installed_by?: string
          installed_version_id?: string
          organization_id?: string
          status?: string
          template_id?: string
          terminology?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_os_installations_installed_version_id_template_id_fkey"
            columns: ["installed_version_id", "template_id"]
            isOneToOne: false
            referencedRelation: "business_os_template_versions"
            referencedColumns: ["id", "template_id"]
          },
          {
            foreignKeyName: "business_os_installations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_os_installations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_os_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_os_template_modules: {
        Row: {
          created_at: string
          default_config: Json
          module_id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          default_config?: Json
          module_id: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          default_config?: Json
          module_id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_os_template_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_os_template_modules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_os_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_os_template_versions: {
        Row: {
          change_summary: string
          created_at: string
          definition: Json
          id: string
          published_at: string | null
          status: string
          template_id: string
          updated_at: string
          version: number
        }
        Insert: {
          change_summary: string
          created_at?: string
          definition: Json
          id?: string
          published_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          version: number
        }
        Update: {
          change_summary?: string
          created_at?: string
          definition?: Json
          id?: string
          published_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_os_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_os_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_os_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          industry_code: string
          key: string
          manifest: Json
          minimum_plan: string
          name: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          industry_code: string
          key: string
          manifest?: Json
          minimum_plan?: string
          name: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          industry_code?: string
          key?: string
          manifest?: Json
          minimum_plan?: string
          name?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          latest_assessment_id: string | null
          organization_id: string
          profile: Json
          updated_at: string
          updated_by: string
        }
        Insert: {
          latest_assessment_id?: string | null
          organization_id: string
          profile?: Json
          updated_at?: string
          updated_by: string
        }
        Update: {
          latest_assessment_id?: string | null
          organization_id?: string
          profile?: Json
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_latest_assessment_id_organization_id_fkey"
            columns: ["latest_assessment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "business_health_assessments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "business_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          accent_color: string
          created_at: string
          date_format: string
          fiscal_year_start_month: number
          locale: string
          organization_id: string
          primary_color: string
          secondary_color: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          accent_color?: string
          created_at?: string
          date_format?: string
          fiscal_year_start_month?: number
          locale?: string
          organization_id: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          accent_color?: string
          created_at?: string
          date_format?: string
          fiscal_year_start_month?: number
          locale?: string
          organization_id?: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_trial_adoption_events: {
        Row: {
          actor_id: string
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          occurred_at: string
          organization_id: string
          resource_key: string
        }
        Insert: {
          actor_id: string
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          occurred_at?: string
          organization_id: string
          resource_key: string
        }
        Update: {
          actor_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          occurred_at?: string
          organization_id?: string
          resource_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_trial_adoption_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "business_trials"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      business_trial_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string
          due_day: number
          evidence: Json
          id: string
          milestone_key: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          due_day: number
          evidence?: Json
          id?: string
          milestone_key: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          due_day?: number
          evidence?: Json
          id?: string
          milestone_key?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_trial_milestones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "business_trials"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      business_trials: {
        Row: {
          activated_by: string
          converted_at: string | null
          created_at: string
          installation_id: string
          organization_id: string
          trial_end_date: string
          trial_start_date: string
          trial_status: string
          updated_at: string
        }
        Insert: {
          activated_by: string
          converted_at?: string | null
          created_at?: string
          installation_id: string
          organization_id: string
          trial_end_date: string
          trial_start_date: string
          trial_status?: string
          updated_at?: string
        }
        Update: {
          activated_by?: string
          converted_at?: string | null
          created_at?: string
          installation_id?: string
          organization_id?: string
          trial_end_date?: string
          trial_start_date?: string
          trial_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_trials_installation_id_organization_id_fkey"
            columns: ["installation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "business_os_installations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "business_trials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_change_set_events: {
        Row: {
          actor_id: string
          change_set_id: string
          created_at: string
          details: Json
          event: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          change_set_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          change_set_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_change_set_even_change_set_id_organization_i_fkey"
            columns: ["change_set_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "configuration_change_sets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "configuration_change_set_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_change_sets: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          base_revision: number
          created_at: string
          failure_reason: string | null
          id: string
          operations: Json
          organization_id: string
          proposed_by: string | null
          reviewed_at: string | null
          rollback_revision: number | null
          rollback_snapshot: Json | null
          rolled_back_at: string | null
          source: string
          status: string
          summary: string
          target_revision: number
          title: string
          updated_at: string
          validation_result: Json
          warnings: Json
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          base_revision: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          operations: Json
          organization_id: string
          proposed_by?: string | null
          reviewed_at?: string | null
          rollback_revision?: number | null
          rollback_snapshot?: Json | null
          rolled_back_at?: string | null
          source: string
          status?: string
          summary: string
          target_revision: number
          title: string
          updated_at?: string
          validation_result?: Json
          warnings?: Json
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          base_revision?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          operations?: Json
          organization_id?: string
          proposed_by?: string | null
          reviewed_at?: string | null
          rollback_revision?: number | null
          rollback_snapshot?: Json | null
          rolled_back_at?: string | null
          source?: string
          status?: string
          summary?: string
          target_revision?: number
          title?: string
          updated_at?: string
          validation_result?: Json
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuration_change_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_version_restores: {
        Row: {
          base_revision: number
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          organization_id: string
          requested_by: string
          status: string
          target_version: number
        }
        Insert: {
          base_revision: number
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          organization_id: string
          requested_by: string
          status: string
          target_version: number
        }
        Update: {
          base_revision?: number
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          organization_id?: string
          requested_by?: string
          status?: string
          target_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuration_version_restore_organization_id_target_versi_fkey"
            columns: ["organization_id", "target_version"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["organization_id", "version"]
          },
          {
            foreignKeyName: "configuration_version_restores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_versions: {
        Row: {
          author_id: string
          change_set_id: string | null
          changes: Json
          created_at: string
          description: string
          id: string
          organization_id: string
          restores_version: number | null
          rollback_snapshot: Json | null
          source: string
          version: number
        }
        Insert: {
          author_id: string
          change_set_id?: string | null
          changes: Json
          created_at?: string
          description: string
          id?: string
          organization_id: string
          restores_version?: number | null
          rollback_snapshot?: Json | null
          source: string
          version: number
        }
        Update: {
          author_id?: string
          change_set_id?: string | null
          changes?: Json
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          restores_version?: number | null
          rollback_snapshot?: Json | null
          source?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuration_versions_change_set_id_organization_id_fkey"
            columns: ["change_set_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "configuration_change_sets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "configuration_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_versions_organization_id_restores_version_fkey"
            columns: ["organization_id", "restores_version"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["organization_id", "version"]
          },
        ]
      }
      customer_loyalty_activity: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          organization_id: string
          points_delta: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by: string
          customer_id: string
          description?: string | null
          id?: string
          organization_id: string
          points_delta: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          organization_id?: string
          points_delta?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_activity_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customer_loyalty_balances: {
        Row: {
          customer_id: string
          lifetime_earned: number
          lifetime_expired: number
          lifetime_redeemed: number
          organization_id: string
          points_balance: number
          updated_at: string
        }
        Insert: {
          customer_id: string
          lifetime_earned?: number
          lifetime_expired?: number
          lifetime_redeemed?: number
          organization_id: string
          points_balance?: number
          updated_at?: string
        }
        Update: {
          customer_id?: string
          lifetime_earned?: number
          lifetime_expired?: number
          lifetime_redeemed?: number
          organization_id?: string
          points_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_balances_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "customer_loyalty_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          id: string
          note: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          note: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          note?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          layout_config: Json
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          layout_config?: Json
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          layout_config?: Json
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          assigned_driver_id: string | null
          contact_number: string
          courier_metadata: Json
          courier_provider: string
          created_at: string
          created_by: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string
          delivery_number: string
          external_reference: string | null
          failure_reason: string | null
          id: string
          organization_id: string
          related_transaction_id: string | null
          scheduled_at: string
          source_branch_id: string
          status: string
          updated_at: string
          updated_by: string
          vehicle: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          contact_number: string
          courier_metadata?: Json
          courier_provider?: string
          created_at?: string
          created_by: string
          customer_id: string
          delivered_at?: string | null
          delivery_address: string
          delivery_number: string
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          organization_id: string
          related_transaction_id?: string | null
          scheduled_at: string
          source_branch_id: string
          status?: string
          updated_at?: string
          updated_by: string
          vehicle?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          contact_number?: string
          courier_metadata?: Json
          courier_provider?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_number?: string
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          organization_id?: string
          related_transaction_id?: string | null
          scheduled_at?: string
          source_branch_id?: string
          status?: string
          updated_at?: string
          updated_by?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_assigned_driver_id_organization_id_fkey"
            columns: ["assigned_driver_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_related_transaction_id_organization_id_fkey"
            columns: ["related_transaction_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "deliveries_source_branch_id_organization_id_fkey"
            columns: ["source_branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      delivery_counters: {
        Row: {
          next_value: number
          organization_id: string
        }
        Insert: {
          next_value?: number
          organization_id: string
        }
        Update: {
          next_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          created_at: string
          display_name: string
          id: string
          membership_id: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          membership_id: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          membership_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "delivery_drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_proofs: {
        Row: {
          created_at: string
          delivery_id: string
          file_name: string
          id: string
          mime_type: string
          notes: string | null
          organization_id: string
          path: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          file_name: string
          id?: string
          mime_type: string
          notes?: string | null
          organization_id: string
          path: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          notes?: string | null
          organization_id?: string
          path?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_delivery_id_organization_id_fkey"
            columns: ["delivery_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          actor_id: string
          delivery_id: string
          from_status: string | null
          id: string
          notes: string | null
          occurred_at: string
          organization_id: string
          to_status: string
        }
        Insert: {
          actor_id: string
          delivery_id: string
          from_status?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id: string
          to_status: string
        }
        Update: {
          actor_id?: string
          delivery_id?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_delivery_id_organization_id_fkey"
            columns: ["delivery_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      employee_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          employee_id: string
          event: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          employee_id: string
          event: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          employee_id?: string
          event?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_audit_history_employee_id_organization_id_fkey"
            columns: ["employee_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      employee_counters: {
        Row: {
          next_value: number
          organization_id: string
        }
        Insert: {
          next_value?: number
          organization_id: string
        }
        Update: {
          next_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string
          contact: string
          created_at: string
          created_by: string
          employee_number: string
          employment_status: string
          hire_date: string
          id: string
          membership_id: string | null
          name: string
          organization_id: string
          position: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          branch_id: string
          contact?: string
          created_at?: string
          created_by: string
          employee_number: string
          employment_status?: string
          hire_date: string
          id?: string
          membership_id?: string | null
          name: string
          organization_id: string
          position: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          branch_id?: string
          contact?: string
          created_at?: string
          created_by?: string
          employee_number?: string
          employment_status?: string
          hire_date?: string
          id?: string
          membership_id?: string | null
          name?: string
          organization_id?: string
          position?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "employees_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approval_links: {
        Row: {
          approval_request_id: string
          created_at: string
          expense_id: string
          organization_id: string
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          expense_id: string
          organization_id: string
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          expense_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_links_approval_request_id_organization_id_fkey"
            columns: ["approval_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "expense_approval_links_expense_id_organization_id_fkey"
            columns: ["expense_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      expense_audit_events: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          id: string
          organization_id: string
          specific_expense_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          organization_id: string
          specific_expense_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          organization_id?: string
          specific_expense_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_audit_events_specific_expense_id_organization_id_fkey"
            columns: ["specific_expense_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_number_counters: {
        Row: {
          calendar_year: number
          last_value: number
          organization_id: string
        }
        Insert: {
          calendar_year: number
          last_value?: number
          organization_id: string
        }
        Update: {
          calendar_year?: number
          last_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approval_status: string
          branch_id: string
          category_id: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          expense_number: string
          id: string
          idempotency_key: string
          organization_id: string
          payment_method: string
          receipt_file_name: string | null
          receipt_mime_type: string | null
          receipt_path: string | null
          receipt_size_bytes: number | null
          supplier_payee: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_status?: string
          branch_id: string
          category_id: string
          created_at?: string
          created_by: string
          description?: string | null
          expense_date: string
          expense_number: string
          id?: string
          idempotency_key: string
          organization_id: string
          payment_method: string
          receipt_file_name?: string | null
          receipt_mime_type?: string | null
          receipt_path?: string | null
          receipt_size_bytes?: number | null
          supplier_payee: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_status?: string
          branch_id?: string
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          expense_number?: string
          id?: string
          idempotency_key?: string
          organization_id?: string
          payment_method?: string
          receipt_file_name?: string | null
          receipt_mime_type?: string | null
          receipt_path?: string | null
          receipt_size_bytes?: number | null
          supplier_payee?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "expenses_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_definitions: {
        Row: {
          config: Json
          created_at: string
          data_type: string
          id: string
          is_required: boolean
          is_unique: boolean
          key: string
          label: string
          object_definition_id: string
          organization_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          data_type: string
          id?: string
          is_required?: boolean
          is_unique?: boolean
          key: string
          label: string
          object_definition_id: string
          organization_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          data_type?: string
          id?: string
          is_required?: boolean
          is_unique?: boolean
          key?: string
          label?: string
          object_definition_id?: string
          organization_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_definitions_object_definition_id_organization_id_fkey"
            columns: ["object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "field_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          key: string
          mode: string
          name: string
          object_definition_id: string
          organization_id: string
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          key: string
          mode?: string
          name: string
          object_definition_id: string
          organization_id: string
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          key?: string
          mode?: string
          name?: string
          object_definition_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_definitions_object_definition_id_organization_id_fkey"
            columns: ["object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "form_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_layouts: {
        Row: {
          created_at: string
          form_definition_id: string
          id: string
          organization_id: string
          sections: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          form_definition_id: string
          id?: string
          organization_id: string
          sections: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          form_definition_id?: string
          id?: string
          organization_id?: string
          sections?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_layouts_organization_id_form_definition_id_fkey"
            columns: ["organization_id", "form_definition_id"]
            isOneToOne: true
            referencedRelation: "form_definitions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          goods_receipt_id: string
          id: string
          inventory_item_id: string
          organization_id: string
          purchase_order_line_id: string
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          goods_receipt_id: string
          id?: string
          inventory_item_id: string
          organization_id: string
          purchase_order_line_id: string
          quantity_received: number
          unit_cost: number
        }
        Update: {
          goods_receipt_id?: string
          id?: string
          inventory_item_id?: string
          organization_id?: string
          purchase_order_line_id?: string
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_organization_id_fkey"
            columns: ["goods_receipt_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_purchase_order_line_id_organization_id_fkey"
            columns: ["purchase_order_line_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          idempotency_key: string
          inventory_location_id: string
          notes: string | null
          organization_id: string
          purchase_order_id: string
          receipt_number: string
          received_at: string
          received_by: string
          supplier_delivery_reference: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          inventory_location_id: string
          notes?: string | null
          organization_id: string
          purchase_order_id: string
          receipt_number: string
          received_at: string
          received_by: string
          supplier_delivery_reference?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          inventory_location_id?: string
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string
          receipt_number?: string
          received_at?: string
          received_by?: string
          supplier_delivery_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "goods_receipts_inventory_location_id_organization_id_fkey"
            columns: ["inventory_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_organization_id_fkey"
            columns: ["purchase_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          is_tracked: boolean
          low_stock_threshold: number
          organization_id: string
          product_variant_id: string
          reorder_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_tracked?: boolean
          low_stock_threshold?: number
          organization_id: string
          product_variant_id: string
          reorder_level?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_tracked?: boolean
          low_stock_threshold?: number
          organization_id?: string
          product_variant_id?: string
          reorder_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      invoice_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          id: string
          invoice_id: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          invoice_id: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          invoice_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_audit_history_invoice_id_organization_id_fkey"
            columns: ["invoice_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          description: string
          discount_amount: number
          id: string
          invoice_id: string
          organization_id: string
          position: number
          product_variant_id: string | null
          quantity: number
          sku: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          description: string
          discount_amount?: number
          id?: string
          invoice_id: string
          organization_id: string
          position: number
          product_variant_id?: string | null
          quantity: number
          sku?: string | null
          subtotal: number
          tax_amount: number
          tax_rate?: number
          total: number
          unit: string
          unit_price: number
        }
        Update: {
          description?: string
          discount_amount?: number
          id?: string
          invoice_id?: string
          organization_id?: string
          position?: number
          product_variant_id?: string | null
          quantity?: number
          sku?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_organization_id_fkey"
            columns: ["invoice_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "invoice_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      invoice_number_counters: {
        Row: {
          last_number: number
          organization_id: string
          year: number
        }
        Insert: {
          last_number?: number
          organization_id: string
          year: number
        }
        Update: {
          last_number?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          branch_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          credit_terms_days: number
          customer_id: string
          discount_total: number
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          source_id: string | null
          source_type: string
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          branch_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          credit_terms_days?: number
          customer_id: string
          discount_total?: number
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          source_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          branch_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          credit_terms_days?: number
          customer_id?: string
          discount_total?: number
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          source_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_order_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          job_order_id: string
          mime_type: string
          organization_id: string
          path: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          job_order_id: string
          mime_type: string
          organization_id: string
          path: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          job_order_id?: string
          mime_type?: string
          organization_id?: string
          path?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_order_attachments_job_order_id_organization_id_fkey"
            columns: ["job_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      job_order_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          from_status: string | null
          id: string
          job_order_id: string
          organization_id: string
          to_status: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          from_status?: string | null
          id?: string
          job_order_id: string
          organization_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          from_status?: string | null
          id?: string
          job_order_id?: string
          organization_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_order_audit_history_job_order_id_organization_id_fkey"
            columns: ["job_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      job_order_counters: {
        Row: {
          next_value: number
          organization_id: string
        }
        Insert: {
          next_value?: number
          organization_id: string
        }
        Update: {
          next_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_order_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_order_labor_items: {
        Row: {
          amount: number
          description: string
          hourly_rate: number
          hours: number
          id: string
          job_order_id: string
          organization_id: string
          position: number
        }
        Insert: {
          amount: number
          description: string
          hourly_rate: number
          hours: number
          id?: string
          job_order_id: string
          organization_id: string
          position: number
        }
        Update: {
          amount?: number
          description?: string
          hourly_rate?: number
          hours?: number
          id?: string
          job_order_id?: string
          organization_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_order_labor_items_job_order_id_organization_id_fkey"
            columns: ["job_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      job_order_material_items: {
        Row: {
          amount: number
          consumed_quantity: number
          description: string
          id: string
          inventory_item_id: string
          inventory_location_id: string
          job_order_id: string
          organization_id: string
          planned_quantity: number
          position: number
          product_variant_id: string
          unit_cost: number
        }
        Insert: {
          amount: number
          consumed_quantity?: number
          description: string
          id?: string
          inventory_item_id: string
          inventory_location_id: string
          job_order_id: string
          organization_id: string
          planned_quantity: number
          position: number
          product_variant_id: string
          unit_cost: number
        }
        Update: {
          amount?: number
          consumed_quantity?: number
          description?: string
          id?: string
          inventory_item_id?: string
          inventory_location_id?: string
          job_order_id?: string
          organization_id?: string
          planned_quantity?: number
          position?: number
          product_variant_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_order_material_items_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_order_material_items_inventory_location_id_organizatio_fkey"
            columns: ["inventory_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_order_material_items_job_order_id_organization_id_fkey"
            columns: ["job_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_order_material_items_product_variant_id_organization_i_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      job_order_staff: {
        Row: {
          created_at: string
          display_name: string
          id: string
          membership_id: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          membership_id: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          membership_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_order_staff_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_order_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          assigned_staff_id: string | null
          branch_id: string
          completed_date: string | null
          created_at: string
          created_by: string
          customer_id: string
          description: string
          due_date: string | null
          id: string
          job_number: string
          labor_total: number
          material_total: number
          notes: string | null
          organization_id: string
          priority: string
          service_id: string | null
          service_type: string
          start_date: string | null
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          assigned_staff_id?: string | null
          branch_id: string
          completed_date?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          description: string
          due_date?: string | null
          id?: string
          job_number: string
          labor_total?: number
          material_total?: number
          notes?: string | null
          organization_id: string
          priority?: string
          service_id?: string | null
          service_type: string
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          assigned_staff_id?: string | null
          branch_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string
          due_date?: string | null
          id?: string
          job_number?: string
          labor_total?: number
          material_total?: number
          notes?: string | null
          organization_id?: string
          priority?: string
          service_id?: string | null
          service_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_assigned_staff_id_organization_id_fkey"
            columns: ["assigned_staff_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "job_order_staff"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_orders_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_orders_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_service_id_organization_id_fkey"
            columns: ["service_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      loyalty_award_receipts: {
        Row: {
          customer_id: string
          id: string
          idempotency_key: string
          loyalty_transaction_id: string | null
          organization_id: string
          points_awarded: number
          processed_at: string
          rule_id: string | null
          sale_id: string
        }
        Insert: {
          customer_id: string
          id?: string
          idempotency_key: string
          loyalty_transaction_id?: string | null
          organization_id: string
          points_awarded: number
          processed_at?: string
          rule_id?: string | null
          sale_id: string
        }
        Update: {
          customer_id?: string
          id?: string
          idempotency_key?: string
          loyalty_transaction_id?: string | null
          organization_id?: string
          points_awarded?: number
          processed_at?: string
          rule_id?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_award_receipts_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_award_receipts_loyalty_transaction_id_organization_fkey"
            columns: ["loyalty_transaction_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_award_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_award_receipts_rule_id_organization_id_fkey"
            columns: ["rule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rules"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_award_receipts_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      loyalty_point_lots: {
        Row: {
          created_at: string
          customer_id: string
          earning_transaction_id: string
          expires_at: string | null
          id: string
          organization_id: string
          original_points: number
          remaining_points: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          earning_transaction_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          original_points: number
          remaining_points: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          earning_transaction_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          original_points?: number
          remaining_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_point_lots_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_point_lots_earning_transaction_id_organization_id_fkey"
            columns: ["earning_transaction_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      loyalty_redemption_allocations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          point_lot_id: string
          points_allocated: number
          redemption_transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          point_lot_id: string
          points_allocated: number
          redemption_transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          point_lot_id?: string
          points_allocated?: number
          redemption_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemption_allocation_point_lot_id_organization_id_fkey"
            columns: ["point_lot_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_point_lots"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_redemption_allocation_redemption_transaction_id_or_fkey"
            columns: ["redemption_transaction_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      loyalty_rules: {
        Row: {
          created_at: string
          created_by: string
          expiry_days: number | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          points_amount: number
          priority: number
          redemption_value: number | null
          rule_type: string
          spend_amount: number | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expiry_days?: number | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          points_amount: number
          priority?: number
          redemption_value?: number | null
          rule_type: string
          spend_amount?: number | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expiry_days?: number | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          points_amount?: number
          priority?: number
          redemption_value?: number | null
          rule_type?: string
          spend_amount?: number | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          idempotency_key: string
          monetary_value: number
          organization_id: string
          points_delta: number
          rule_id: string | null
          sale_id: string | null
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by: string
          customer_id: string
          description?: string | null
          id?: string
          idempotency_key: string
          monetary_value?: number
          organization_id: string
          points_delta: number
          rule_id?: string | null
          sale_id?: string | null
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          idempotency_key?: string
          monetary_value?: number
          organization_id?: string
          points_delta?: number
          rule_id?: string | null
          sale_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_rule_id_organization_id_fkey"
            columns: ["rule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rules"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      membership_branch_access: {
        Row: {
          branch_id: string
          created_at: string
          membership_id: string
          organization_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          membership_id: string
          organization_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          membership_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_branch_access_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "membership_branch_access_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "membership_branch_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_roles: {
        Row: {
          created_at: string
          membership_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          membership_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          membership_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_definitions: {
        Row: {
          category: string
          configuration_schema: Json
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          manifest: Json
          minimum_plan: string
          name: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          configuration_schema?: Json
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          manifest?: Json
          minimum_plan?: string
          name: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          configuration_schema?: Json
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          manifest?: Json
          minimum_plan?: string
          name?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      module_dependencies: {
        Row: {
          created_at: string
          dependency_module_key: string
          module_key: string
        }
        Insert: {
          created_at?: string
          dependency_module_key: string
          module_key: string
        }
        Update: {
          created_at?: string
          dependency_module_key?: string
          module_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_dependencies_dependency_module_key_fkey"
            columns: ["dependency_module_key"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "module_dependencies_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      negosyo_coach_progress: {
        Row: {
          completed_at: string | null
          dismissed_at: string | null
          id: string
          last_task_key: string | null
          organization_id: string
          playbook_key: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          dismissed_at?: string | null
          id?: string
          last_task_key?: string | null
          organization_id: string
          playbook_key: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          dismissed_at?: string | null
          id?: string
          last_task_key?: string | null
          organization_id?: string
          playbook_key?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negosyo_coach_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          destination: string | null
          id: string
          last_error: string | null
          next_attempt_at: string | null
          notification_id: string
          organization_id: string
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          destination?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          notification_id: string
          organization_id: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          destination?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          notification_id?: string
          organization_id?: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_organization_id_fkey"
            columns: ["notification_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          created_at: string
          is_enabled: boolean
          organization_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          is_enabled?: boolean
          organization_id: string
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          is_enabled?: boolean
          organization_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string
          created_by: string | null
          deep_link_template: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string
          source: string
          subject_template: string | null
          updated_at: string
          updated_by: string | null
          variable_keys: string[]
        }
        Insert: {
          body_template: string
          channel: string
          created_at?: string
          created_by?: string | null
          deep_link_template?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id: string
          source: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
          variable_keys?: string[]
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          deep_link_template?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string
          source?: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
          variable_keys?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          data: Json
          deep_link: string | null
          id: string
          idempotency_key: string
          organization_id: string
          priority: string
          read_at: string | null
          recipient_user_id: string
          source: string
          template_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          data?: Json
          deep_link?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          priority?: string
          read_at?: string | null
          recipient_user_id: string
          source: string
          template_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          data?: Json
          deep_link?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          priority?: string
          read_at?: string | null
          recipient_user_id?: string
          source?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_template_id_organization_id_fkey"
            columns: ["template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      object_definitions: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          key: string
          module_id: string | null
          organization_id: string
          plural_label: string
          singular_label: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          key: string
          module_id?: string | null
          organization_id: string
          plural_label: string
          singular_label: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          module_id?: string | null
          organization_id?: string
          plural_label?: string
          singular_label?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_definitions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      object_records: {
        Row: {
          archived_at: string | null
          attributes: Json
          branch_id: string | null
          created_at: string
          created_by: string
          display_value: string
          id: string
          object_definition_id: string
          organization_id: string
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          archived_at?: string | null
          attributes?: Json
          branch_id?: string | null
          created_at?: string
          created_by: string
          display_value: string
          id?: string
          object_definition_id: string
          organization_id: string
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          archived_at?: string | null
          attributes?: Json
          branch_id?: string | null
          created_at?: string
          created_by?: string
          display_value?: string
          id?: string
          object_definition_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_records_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "object_records_object_definition_id_organization_id_fkey"
            columns: ["object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "object_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_configuration_revisions: {
        Row: {
          organization_id: string
          revision: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          organization_id: string
          revision?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          organization_id?: string
          revision?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_configuration_revisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_entity_labels: {
        Row: {
          created_at: string
          created_by: string
          entity_key: string
          id: string
          organization_id: string
          plural_label: string
          singular_label: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_key: string
          id?: string
          organization_id: string
          plural_label: string
          singular_label: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_key?: string
          id?: string
          organization_id?: string
          plural_label?: string
          singular_label?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_entity_labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          branch_access_mode: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_access_mode?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_access_mode?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          config: Json
          created_at: string
          enabled_at: string
          enabled_by: string
          id: string
          is_enabled: boolean
          module_id: string
          organization_id: string
          source_template_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled_at?: string
          enabled_by: string
          id?: string
          is_enabled?: boolean
          module_id: string
          organization_id: string
          source_template_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled_at?: string
          enabled_by?: string
          id?: string
          is_enabled?: boolean
          module_id?: string
          organization_id?: string
          source_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "business_os_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json
          business_type: string
          country_code: string
          created_at: string
          created_by: string
          currency_code: string
          display_name: string
          email: string | null
          id: string
          industry_code: string
          legal_name: string
          logo_path: string | null
          phone: string | null
          slug: string
          status: string
          tax_identifiers: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: Json
          business_type?: string
          country_code?: string
          created_at?: string
          created_by: string
          currency_code?: string
          display_name: string
          email?: string | null
          id?: string
          industry_code: string
          legal_name: string
          logo_path?: string | null
          phone?: string | null
          slug: string
          status?: string
          tax_identifiers?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: Json
          business_type?: string
          country_code?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          display_name?: string
          email?: string | null
          id?: string
          industry_code?: string
          legal_name?: string
          logo_path?: string | null
          phone?: string | null
          slug?: string
          status?: string
          tax_identifiers?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string
          amount: number
          id: string
          invoice_id: string
          organization_id: string
          payment_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by: string
          amount: number
          id?: string
          invoice_id: string
          organization_id: string
          payment_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string
          amount?: number
          id?: string
          invoice_id?: string
          organization_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_organization_id_fkey"
            columns: ["invoice_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_organization_id_fkey"
            columns: ["payment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ar_payments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      payment_number_counters: {
        Row: {
          last_number: number
          organization_id: string
          year: number
        }
        Insert: {
          last_number?: number
          organization_id: string
          year: number
        }
        Update: {
          last_number?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_verification_history: {
        Row: {
          actor_id: string
          created_at: string
          from_status: string
          id: string
          organization_id: string
          payment_id: string
          reason: string
          to_status: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          from_status: string
          id?: string
          organization_id: string
          payment_id: string
          reason: string
          to_status: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          from_status?: string
          id?: string
          organization_id?: string
          payment_id?: string
          reason?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_verification_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_verification_payment_tenant_fk"
            columns: ["payment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_payments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string
          domain: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          domain: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          domain?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string
          grace_period_days: number
          is_active: boolean
          is_public: boolean
          key: string
          name: string
          tier_rank: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          grace_period_days?: number
          is_active?: boolean
          is_public?: boolean
          key: string
          name: string
          tier_rank: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          grace_period_days?: number
          is_active?: boolean
          is_public?: boolean
          key?: string
          name?: string
          tier_rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admin_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_metadata: Json
          occurred_at: string
          source: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_metadata?: Json
          occurred_at?: string
          source?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_metadata?: Json
          occurred_at?: string
          source?: string
        }
        Relationships: []
      }
      platform_administrators: {
        Row: {
          created_at: string
          granted_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_ai_usage_events: {
        Row: {
          feature: string
          id: string
          input_tokens: number
          metadata: Json
          model: string
          occurred_at: string
          organization_id: string
          output_tokens: number
          request_count: number
        }
        Insert: {
          feature: string
          id?: string
          input_tokens?: number
          metadata?: Json
          model: string
          occurred_at?: string
          organization_id: string
          output_tokens?: number
          request_count?: number
        }
        Update: {
          feature?: string
          id?: string
          input_tokens?: number
          metadata?: Json
          model?: string
          occurred_at?: string
          organization_id?: string
          output_tokens?: number
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_business_feature_overrides: {
        Row: {
          created_at: string
          feature_key: string
          organization_id: string
          reason: string
          state: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          organization_id: string
          reason: string
          state: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          organization_id?: string
          reason?: string
          state?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_business_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "platform_feature_flags"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "platform_business_feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          conditions: Json
          created_at: string
          description: string
          is_enabled: boolean
          key: string
          name: string
          rollout_percentage: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          description?: string
          is_enabled?: boolean
          key: string
          name: string
          rollout_percentage?: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string
          is_enabled?: boolean
          key?: string
          name?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      platform_health_checks: {
        Row: {
          checked_at: string
          message: string
          metrics: Json
          service: string
          status: string
          updated_by: string | null
        }
        Insert: {
          checked_at?: string
          message?: string
          metrics?: Json
          service: string
          status: string
          updated_by?: string | null
        }
        Update: {
          checked_at?: string
          message?: string
          metrics?: Json
          service?: string
          status?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_support_access_requests: {
        Row: {
          access_enabled: boolean
          created_at: string
          customer_approved_at: string | null
          customer_approved_by: string | null
          expires_at: string
          id: string
          organization_id: string
          reason: string
          requested_by: string
          requested_scopes: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_enabled?: boolean
          created_at?: string
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          expires_at: string
          id?: string
          organization_id: string
          reason: string
          requested_by: string
          requested_scopes: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_enabled?: boolean
          created_at?: string
          customer_approved_at?: string | null
          customer_approved_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          reason?: string
          requested_by?: string
          requested_scopes?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_commands: {
        Row: {
          actor_user_id: string
          applied_at: string | null
          branch_id: string
          command_id: string
          command_type: string
          error_code: string | null
          error_message: string | null
          id: string
          mode: string
          occurred_at: string
          organization_id: string
          payload_hash: string
          provisional_receipt_number: string | null
          received_at: string
          register_id: string
          register_session_id: string
          result: Json | null
          schema_version: number
          status: string
        }
        Insert: {
          actor_user_id: string
          applied_at?: string | null
          branch_id: string
          command_id: string
          command_type: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          mode: string
          occurred_at: string
          organization_id: string
          payload_hash: string
          provisional_receipt_number?: string | null
          received_at?: string
          register_id: string
          register_session_id: string
          result?: Json | null
          schema_version: number
          status?: string
        }
        Update: {
          actor_user_id?: string
          applied_at?: string | null
          branch_id?: string
          command_id?: string
          command_type?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          mode?: string
          occurred_at?: string
          organization_id?: string
          payload_hash?: string
          provisional_receipt_number?: string | null
          received_at?: string
          register_id?: string
          register_session_id?: string
          result?: Json | null
          schema_version?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_commands_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_commands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_commands_register_id_organization_id_fkey"
            columns: ["register_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_commands_register_session_id_organization_id_fkey"
            columns: ["register_session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_register_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      pos_document_sequences: {
        Row: {
          branch_id: string
          document_type: string
          next_number: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          document_type: string
          next_number?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          document_type?: string
          next_number?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_document_sequences_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_document_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_offline_leases: {
        Row: {
          allowed_commands: string[]
          created_at: string
          expires_at: string
          id: string
          issued_at: string
          last_used_at: string | null
          organization_id: string
          register_id: string
          register_session_id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          allowed_commands?: string[]
          created_at?: string
          expires_at: string
          id?: string
          issued_at?: string
          last_used_at?: string | null
          organization_id: string
          register_id: string
          register_session_id: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          allowed_commands?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          issued_at?: string
          last_used_at?: string | null
          organization_id?: string
          register_id?: string
          register_session_id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_offline_leases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_offline_leases_register_id_organization_id_fkey"
            columns: ["register_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_offline_leases_register_session_id_organization_id_fkey"
            columns: ["register_session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_register_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      pos_reconciliation_cases: {
        Row: {
          branch_id: string
          case_type: string
          command_id: string | null
          created_at: string
          details: Json
          id: string
          organization_id: string
          payment_id: string | null
          register_id: string | null
          register_session_id: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          sale_id: string | null
          severity: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          case_type: string
          command_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id: string
          payment_id?: string | null
          register_id?: string | null
          register_session_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id?: string | null
          severity?: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          case_type?: string
          command_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string
          payment_id?: string | null
          register_id?: string | null
          register_session_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sale_id?: string | null
          severity?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_reconciliation_cases_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_reconciliation_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_reconciliation_cases_register_id_organization_id_fkey"
            columns: ["register_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_reconciliation_cases_register_session_id_organization__fkey"
            columns: ["register_session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_register_sessions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_reconciliation_cases_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_reconciliation_payment_tenant_fk"
            columns: ["payment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_payments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      pos_register_sessions: {
        Row: {
          actual_cash: number | null
          branch_id: string
          cash_variance: number | null
          cashier_id: string
          client_session_id: string
          closed_at: string | null
          created_at: string
          expected_cash: number
          id: string
          inventory_location_id: string
          opened_at: string
          opening_cash: number
          organization_id: string
          reconciled_at: string | null
          register_id: string
          status: string
        }
        Insert: {
          actual_cash?: number | null
          branch_id: string
          cash_variance?: number | null
          cashier_id: string
          client_session_id: string
          closed_at?: string | null
          created_at?: string
          expected_cash?: number
          id?: string
          inventory_location_id: string
          opened_at?: string
          opening_cash?: number
          organization_id: string
          reconciled_at?: string | null
          register_id: string
          status?: string
        }
        Update: {
          actual_cash?: number | null
          branch_id?: string
          cash_variance?: number | null
          cashier_id?: string
          client_session_id?: string
          closed_at?: string | null
          created_at?: string
          expected_cash?: number
          id?: string
          inventory_location_id?: string
          opened_at?: string
          opening_cash?: number
          organization_id?: string
          reconciled_at?: string | null
          register_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_register_sessions_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_register_sessions_inventory_location_id_organization_i_fkey"
            columns: ["inventory_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_register_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_register_sessions_register_id_organization_id_fkey"
            columns: ["register_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      pos_registers: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          enrolled_by: string
          id: string
          inventory_location_id: string
          last_seen_at: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          enrolled_by: string
          id: string
          inventory_location_id: string
          last_seen_at?: string | null
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          enrolled_by?: string
          id?: string
          inventory_location_id?: string
          last_seen_at?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_registers_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_registers_inventory_location_id_organization_id_fkey"
            columns: ["inventory_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pos_registers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          barcode: string | null
          cost_price: number | null
          created_at: string
          id: string
          name: string
          organization_id: string
          product_id: string
          selling_price: number | null
          sku: string
          sort_order: number
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          product_id: string
          selling_price?: number | null
          sku: string
          sort_order?: number
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          product_id?: string
          selling_price?: number | null
          sku?: string
          sort_order?: number
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      products: {
        Row: {
          branch_id: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          created_by: string
          default_unit: string
          description: string | null
          has_variants: boolean
          id: string
          name: string
          organization_id: string
          product_type: string
          selling_price: number
          status: string
          tax_rate: number
          tax_type: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          branch_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price: number
          created_at?: string
          created_by: string
          default_unit: string
          description?: string | null
          has_variants?: boolean
          id?: string
          name: string
          organization_id: string
          product_type: string
          selling_price: number
          status?: string
          tax_rate: number
          tax_type: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          branch_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string
          default_unit?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          name?: string
          organization_id?: string
          product_type?: string
          selling_price?: number
          status?: string
          tax_rate?: number
          tax_type?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_brand_id_organization_id_fkey"
            columns: ["brand_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          description: string
          id: string
          organization_id: string
          position: number
          product_variant_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_cost: number
        }
        Insert: {
          description: string
          id?: string
          organization_id: string
          position: number
          product_variant_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          subtotal: number
          tax_amount: number
          tax_rate?: number
          total: number
          unit_cost: number
        }
        Update: {
          description?: string
          id?: string
          organization_id?: string
          position?: number
          product_variant_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_organization_id_fkey"
            columns: ["purchase_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          issued_at: string | null
          notes: string | null
          order_date: string
          order_number: string
          organization_id: string
          purchase_request_id: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_reference: string | null
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          expected_date?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          order_date: string
          order_number: string
          organization_id: string
          purchase_request_id?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_reference?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          organization_id?: string
          purchase_request_id?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_reference?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_organization_id_fkey"
            columns: ["purchase_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      purchase_request_lines: {
        Row: {
          description: string
          estimated_unit_cost: number
          id: string
          organization_id: string
          position: number
          product_variant_id: string
          purchase_request_id: string
          quantity: number
        }
        Insert: {
          description: string
          estimated_unit_cost: number
          id?: string
          organization_id: string
          position: number
          product_variant_id: string
          purchase_request_id: string
          quantity: number
        }
        Update: {
          description?: string
          estimated_unit_cost?: number
          id?: string
          organization_id?: string
          position?: number
          product_variant_id?: string
          purchase_request_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_request_lines_purchase_request_id_organization_id_fkey"
            columns: ["purchase_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approval_request_id: string | null
          branch_id: string
          created_at: string
          estimated_total: number
          id: string
          needed_by: string | null
          organization_id: string
          purpose: string
          request_number: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          branch_id: string
          created_at?: string
          estimated_total?: number
          id?: string
          needed_by?: string | null
          organization_id: string
          purpose: string
          request_number: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          branch_id?: string
          created_at?: string
          estimated_total?: number
          id?: string
          needed_by?: string | null
          organization_id?: string
          purpose?: string
          request_number?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: true
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "purchase_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasing_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          event: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          event: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          event?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchasing_audit_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasing_document_counters: {
        Row: {
          document_type: string
          document_year: number
          next_value: number
          organization_id: string
        }
        Insert: {
          document_type: string
          document_year: number
          next_value?: number
          organization_id: string
        }
        Update: {
          document_type?: string
          document_year?: number
          next_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchasing_document_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          id: string
          organization_id: string
          quotation_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          organization_id: string
          quotation_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          organization_id?: string
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_audit_history_quotation_id_organization_id_fkey"
            columns: ["quotation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      quotation_lines: {
        Row: {
          discount_amount: number
          id: string
          organization_id: string
          position: number
          product_name: string
          product_variant_id: string
          quantity: number
          quotation_id: string
          sku: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          tax_type: string
          total: number
          unit: string
          unit_price: number
          variant_name: string
        }
        Insert: {
          discount_amount?: number
          id?: string
          organization_id: string
          position: number
          product_name: string
          product_variant_id: string
          quantity: number
          quotation_id: string
          sku: string
          subtotal: number
          tax_amount: number
          tax_rate?: number
          tax_type: string
          total: number
          unit: string
          unit_price: number
          variant_name: string
        }
        Update: {
          discount_amount?: number
          id?: string
          organization_id?: string
          position?: number
          product_name?: string
          product_variant_id?: string
          quantity?: number
          quotation_id?: string
          sku?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total?: number
          unit?: string
          unit_price?: number
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotation_lines_quotation_id_organization_id_fkey"
            columns: ["quotation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      quotation_number_counters: {
        Row: {
          last_number: number
          organization_id: string
          year: number
        }
        Insert: {
          last_number?: number
          organization_id: string
          year: number
        }
        Update: {
          last_number?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_shares: {
        Row: {
          channel: string
          created_at: string
          created_by: string
          delivery_status: string
          failure_message: string | null
          id: string
          organization_id: string
          quotation_id: string
          recipient: string | null
          sent_at: string | null
          share_token: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by: string
          delivery_status?: string
          failure_message?: string | null
          id?: string
          organization_id: string
          quotation_id: string
          recipient?: string | null
          sent_at?: string | null
          share_token?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string
          delivery_status?: string
          failure_message?: string | null
          id?: string
          organization_id?: string
          quotation_id?: string
          recipient?: string | null
          sent_at?: string | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_shares_quotation_id_organization_id_fkey"
            columns: ["quotation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      quotations: {
        Row: {
          accepted_at: string | null
          approval_request_id: string | null
          approval_status: string
          assigned_salesperson_id: string
          branch_id: string
          converted_at: string | null
          converted_sale_id: string | null
          converted_sales_order_id: string | null
          created_at: string
          created_by: string
          customer_id: string
          discount_total: number
          id: string
          notes: string | null
          organization_id: string
          quotation_number: string
          rejected_at: string | null
          revision_number: number
          revision_of_id: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string
        }
        Insert: {
          accepted_at?: string | null
          approval_request_id?: string | null
          approval_status?: string
          assigned_salesperson_id: string
          branch_id: string
          converted_at?: string | null
          converted_sale_id?: string | null
          converted_sales_order_id?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          discount_total?: number
          id?: string
          notes?: string | null
          organization_id: string
          quotation_number: string
          rejected_at?: string | null
          revision_number?: number
          revision_of_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until: string
        }
        Update: {
          accepted_at?: string | null
          approval_request_id?: string | null
          approval_status?: string
          assigned_salesperson_id?: string
          branch_id?: string
          converted_at?: string | null
          converted_sale_id?: string | null
          converted_sales_order_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_total?: number
          id?: string
          notes?: string | null
          organization_id?: string
          quotation_number?: string
          rejected_at?: string | null
          revision_number?: number
          revision_of_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_assigned_salesperson_id_organization_id_fkey"
            columns: ["assigned_salesperson_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["user_id", "organization_id"]
          },
          {
            foreignKeyName: "quotations_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotations_converted_sale_id_organization_id_fkey"
            columns: ["converted_sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotations_converted_sales_order_id_organization_id_fkey"
            columns: ["converted_sales_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotations_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_revision_of_id_organization_id_fkey"
            columns: ["revision_of_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      recommendation_business_query_definitions: {
        Row: {
          created_at: string
          date_behavior: string
          description: string
          is_enabled: boolean
          key: string
          label: string
          required_permissions: string[]
        }
        Insert: {
          created_at?: string
          date_behavior: string
          description: string
          is_enabled?: boolean
          key: string
          label: string
          required_permissions: string[]
        }
        Update: {
          created_at?: string
          date_behavior?: string
          description?: string
          is_enabled?: boolean
          key?: string
          label?: string
          required_permissions?: string[]
        }
        Relationships: []
      }
      recurring_expense_definitions: {
        Row: {
          amount: number
          branch_id: string
          category_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          name: string
          next_due_date: string
          organization_id: string
          payment_method: string
          supplier_payee: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          category_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          name: string
          next_due_date: string
          organization_id: string
          payment_method: string
          supplier_payee: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          name?: string
          next_due_date?: string
          organization_id?: string
          payment_method?: string
          supplier_payee?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_definitions_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recurring_expense_definitions_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recurring_expense_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expense_occurrences: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          organization_id: string
          recurring_expense_id: string
          scheduled_date: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          organization_id: string
          recurring_expense_id: string
          scheduled_date: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          organization_id?: string
          recurring_expense_id?: string
          scheduled_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_occurrences_expense_id_organization_id_fkey"
            columns: ["expense_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recurring_expense_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_occurrences_recurring_expense_id_organiz_fkey"
            columns: ["recurring_expense_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "recurring_expense_definitions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      relationship_definitions: {
        Row: {
          cardinality: string
          created_at: string
          id: string
          key: string
          organization_id: string
          source_label: string
          source_object_id: string
          status: string
          target_label: string
          target_object_id: string
          updated_at: string
        }
        Insert: {
          cardinality: string
          created_at?: string
          id?: string
          key: string
          organization_id: string
          source_label: string
          source_object_id: string
          status?: string
          target_label: string
          target_object_id: string
          updated_at?: string
        }
        Update: {
          cardinality?: string
          created_at?: string
          id?: string
          key?: string
          organization_id?: string
          source_label?: string
          source_object_id?: string
          status?: string
          target_label?: string
          target_object_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_definitions_source_object_id_organization_id_fkey"
            columns: ["source_object_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "relationship_definitions_target_object_id_organization_id_fkey"
            columns: ["target_object_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          organization_id: string
          query_config: Json
          status: string
          updated_at: string
          visualization_config: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          organization_id: string
          query_config?: Json
          status?: string
          updated_at?: string
          visualization_config?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          organization_id?: string
          query_config?: Json
          status?: string
          updated_at?: string
          visualization_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_audit_events: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event: string
          id: string
          organization_id: string
          sale_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          organization_id: string
          sale_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          organization_id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_audit_events_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_customers: {
        Row: {
          address: Json
          birthdate: string | null
          branch_id: string
          company: string | null
          created_at: string
          customer_type: string
          email: string | null
          id: string
          last_transaction_at: string | null
          name: string
          notes: string | null
          organization_id: string
          outstanding_balance: number
          phone: string | null
          tags: string[]
          total_spend: number
          transaction_count: number
          updated_at: string
          visit_count: number
        }
        Insert: {
          address?: Json
          birthdate?: string | null
          branch_id: string
          company?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          id?: string
          last_transaction_at?: string | null
          name: string
          notes?: string | null
          organization_id: string
          outstanding_balance?: number
          phone?: string | null
          tags?: string[]
          total_spend?: number
          transaction_count?: number
          updated_at?: string
          visit_count?: number
        }
        Update: {
          address?: Json
          birthdate?: string | null
          branch_id?: string
          company?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          id?: string
          last_transaction_at?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          outstanding_balance?: number
          phone?: string | null
          tags?: string[]
          total_spend?: number
          transaction_count?: number
          updated_at?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customers_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_lines: {
        Row: {
          discount_amount: number
          id: string
          inventory_item_id: string | null
          organization_id: string
          product_name: string
          product_variant_id: string
          quantity: number
          returned_quantity: number
          sale_id: string
          sku: string
          subtotal: number
          tax_amount: number
          total: number
          unit_cost: number
          unit_price: number
          variant_name: string
        }
        Insert: {
          discount_amount?: number
          id?: string
          inventory_item_id?: string | null
          organization_id: string
          product_name: string
          product_variant_id: string
          quantity: number
          returned_quantity?: number
          sale_id: string
          sku: string
          subtotal: number
          tax_amount: number
          total: number
          unit_cost: number
          unit_price: number
          variant_name: string
        }
        Update: {
          discount_amount?: number
          id?: string
          inventory_item_id?: string | null
          organization_id?: string
          product_name?: string
          product_variant_id?: string
          quantity?: number
          returned_quantity?: number
          sale_id?: string
          sku?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          unit_cost?: number
          unit_price?: number
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lines_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_lines_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_order_lines: {
        Row: {
          discount_amount: number
          id: string
          organization_id: string
          position: number
          product_name: string
          product_variant_id: string
          quantity: number
          sales_order_id: string
          sku: string
          tax_amount: number
          total: number
          unit: string
          unit_price: number
          variant_name: string
        }
        Insert: {
          discount_amount: number
          id?: string
          organization_id: string
          position: number
          product_name: string
          product_variant_id: string
          quantity: number
          sales_order_id: string
          sku: string
          tax_amount: number
          total: number
          unit: string
          unit_price: number
          variant_name: string
        }
        Update: {
          discount_amount?: number
          id?: string
          organization_id?: string
          position?: number
          product_name?: string
          product_variant_id?: string
          quantity?: number
          sales_order_id?: string
          sku?: string
          tax_amount?: number
          total?: number
          unit?: string
          unit_price?: number
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_order_lines_sales_order_id_organization_id_fkey"
            columns: ["sales_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          customer_id: string
          discount_total: number
          id: string
          order_number: string
          organization_id: string
          quotation_id: string
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          customer_id: string
          discount_total: number
          id?: string
          order_number: string
          organization_id: string
          quotation_id: string
          status?: string
          subtotal: number
          tax_total: number
          total: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_total?: number
          id?: string
          order_number?: string
          organization_id?: string
          quotation_id?: string
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_organization_id_fkey"
            columns: ["quotation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          organization_id: string
          payment_method: string
          provider: string | null
          reference: string | null
          sale_id: string
          status: string
          verification_note: string | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          organization_id: string
          payment_method: string
          provider?: string | null
          reference?: string | null
          sale_id: string
          status?: string
          verification_note?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          organization_id?: string
          payment_method?: string
          provider?: string | null
          reference?: string | null
          sale_id?: string
          status?: string
          verification_note?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_payments_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          organization_id: string
          payment_method: string
          reference: string | null
          return_id: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          payment_method: string
          reference?: string | null
          return_id?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          payment_method?: string
          reference?: string | null
          return_id?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_refunds_return_id_organization_id_fkey"
            columns: ["return_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_refunds_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_return_lines: {
        Row: {
          amount: number
          id: string
          organization_id: string
          quantity: number
          return_id: string
          sale_line_id: string
        }
        Insert: {
          amount: number
          id?: string
          organization_id: string
          quantity: number
          return_id: string
          sale_line_id: string
        }
        Update: {
          amount?: number
          id?: string
          organization_id?: string
          quantity?: number
          return_id?: string
          sale_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_lines_return_id_organization_id_fkey"
            columns: ["return_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_return_lines_sale_line_id_fkey"
            columns: ["sale_line_id"]
            isOneToOne: false
            referencedRelation: "sales_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          client_return_id: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          reason: string
          sale_id: string
          status: string
          total: number
        }
        Insert: {
          client_return_id: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          reason: string
          sale_id: string
          status?: string
          total?: number
        }
        Update: {
          client_return_id?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          reason?: string
          sale_id?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_sale_id_organization_id_fkey"
            columns: ["sale_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          amount_paid: number
          branch_id: string
          change_amount: number
          client_created_at: string
          client_transaction_id: string
          command_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          discount_total: number
          id: string
          inventory_location_id: string
          organization_id: string
          provisional_receipt_number: string | null
          receipt_number: string
          register_id: string | null
          register_session_id: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number
          branch_id: string
          change_amount?: number
          client_created_at: string
          client_transaction_id: string
          command_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          id?: string
          inventory_location_id: string
          organization_id: string
          provisional_receipt_number?: string | null
          receipt_number: string
          register_id?: string | null
          register_session_id?: string | null
          status: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number
          branch_id?: string
          change_amount?: number
          client_created_at?: string
          client_transaction_id?: string
          command_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          id?: string
          inventory_location_id?: string
          organization_id?: string
          provisional_receipt_number?: string | null
          receipt_number?: string
          register_id?: string | null
          register_session_id?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_transactions_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_transactions_inventory_location_id_organization_id_fkey"
            columns: ["inventory_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_register_fk"
            columns: ["register_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_transactions_register_session_fk"
            columns: ["register_session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "pos_register_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_adjustment_lines: {
        Row: {
          adjustment_id: string
          counted_quantity: number | null
          id: string
          inventory_item_id: string
          organization_id: string
          posted_delta: number | null
          requested_delta: number | null
          system_quantity: number | null
          unit_cost: number | null
        }
        Insert: {
          adjustment_id: string
          counted_quantity?: number | null
          id?: string
          inventory_item_id: string
          organization_id: string
          posted_delta?: number | null
          requested_delta?: number | null
          system_quantity?: number | null
          unit_cost?: number | null
        }
        Update: {
          adjustment_id?: string
          counted_quantity?: number | null
          id?: string
          inventory_item_id?: string
          organization_id?: string
          posted_delta?: number | null
          requested_delta?: number | null
          system_quantity?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_lines_adjustment_id_organization_id_fkey"
            columns: ["adjustment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_adjustment_lines_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          approval_request_id: string | null
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          location_id: string
          organization_id: string
          physical_count: boolean
          posted_at: string | null
          reason: string
          status: string
        }
        Insert: {
          approval_request_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          location_id: string
          organization_id: string
          physical_count: boolean
          posted_at?: string | null
          reason: string
          status?: string
        }
        Update: {
          approval_request_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          location_id?: string
          organization_id?: string
          physical_count?: boolean
          posted_at?: string | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          average_unit_cost: number
          id: string
          inventory_item_id: string
          last_movement_at: string | null
          location_id: string
          organization_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          average_unit_cost?: number
          id?: string
          inventory_item_id: string
          last_movement_at?: string | null
          location_id: string
          organization_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          average_unit_cost?: number
          id?: string
          inventory_item_id?: string
          last_movement_at?: string | null
          location_id?: string
          organization_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_balances_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          adjustment_id: string | null
          balance_after: number
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          inventory_item_id: string
          location_id: string
          movement_type: string
          notes: string | null
          occurred_at: string
          organization_id: string
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
          transfer_id: string | null
          unit_cost: number
        }
        Insert: {
          adjustment_id?: string | null
          balance_after: number
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          inventory_item_id: string
          location_id: string
          movement_type: string
          notes?: string | null
          occurred_at?: string
          organization_id: string
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
          transfer_id?: string | null
          unit_cost: number
        }
        Update: {
          adjustment_id?: string | null
          balance_after?: number
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          inventory_item_id?: string
          location_id?: string
          movement_type?: string
          notes?: string | null
          occurred_at?: string
          organization_id?: string
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
          transfer_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_adjustment_id_organization_id_fkey"
            columns: ["adjustment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_movements_transfer_id_organization_id_fkey"
            columns: ["transfer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          id: string
          inventory_item_id: string
          organization_id: string
          quantity: number
          transfer_id: string
          unit_cost: number
        }
        Insert: {
          id?: string
          inventory_item_id: string
          organization_id: string
          quantity: number
          transfer_id: string
          unit_cost: number
        }
        Update: {
          id?: string
          inventory_item_id?: string
          organization_id?: string
          quantity?: number
          transfer_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_inventory_item_id_organization_id_fkey"
            columns: ["inventory_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_organization_id_fkey"
            columns: ["transfer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          from_location_id: string
          id: string
          idempotency_key: string
          notes: string | null
          organization_id: string
          status: string
          to_location_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          from_location_id: string
          id?: string
          idempotency_key: string
          notes?: string | null
          organization_id: string
          status?: string
          to_location_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          from_location_id?: string
          id?: string
          idempotency_key?: string
          notes?: string | null
          organization_id?: string
          status?: string
          to_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_organization_id_fkey"
            columns: ["from_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "stock_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_organization_id_fkey"
            columns: ["to_location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      subscription_features: {
        Row: {
          configuration: Json
          created_at: string
          feature_key: string
          is_enabled: boolean
          plan_key: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          feature_key: string
          is_enabled?: boolean
          plan_key: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          feature_key?: string
          is_enabled?: boolean
          plan_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_features_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          id: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string
          usage_key: string
          used_quantity: number
        }
        Insert: {
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string
          usage_key: string
          used_quantity?: number
        }
        Update: {
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          usage_key?: string
          used_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          entitlements: Json
          expired_at: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          grace_period_end: string | null
          id: string
          organization_id: string
          pending_plan_key: string | null
          plan_key: string
          provider: string
          provider_metadata: Json
          started_at: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlements?: Json
          expired_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          grace_period_end?: string | null
          id?: string
          organization_id: string
          pending_plan_key?: string | null
          plan_key: string
          provider?: string
          provider_metadata?: Json
          started_at?: string | null
          status: string
          updated_at?: string
          version?: number
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlements?: Json
          expired_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          grace_period_end?: string | null
          id?: string
          organization_id?: string
          pending_plan_key?: string | null
          plan_key?: string
          provider?: string
          provider_metadata?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pending_plan_key_fkey"
            columns: ["pending_plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          due_date: string
          id: string
          invoice_date: string
          notes: string | null
          organization_id: string
          purchase_order_id: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_invoice_number: string
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          invoice_date: string
          notes?: string | null
          organization_id: string
          purchase_order_id?: string | null
          status?: string
          subtotal: number
          supplier_id: string
          supplier_invoice_number: string
          tax_total?: number
          total: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          invoice_date?: string
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_invoice_number?: string
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "supplier_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_purchase_order_id_organization_id_fkey"
            columns: ["purchase_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          mobile: string | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms_days: number
          status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          mobile?: string | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms_days?: number
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms_days?: number
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          created_at: string
          enforcement_mode: string
          limit_value: number | null
          period: string
          plan_key: string
          usage_key: string
        }
        Insert: {
          created_at?: string
          enforcement_mode: string
          limit_value?: number | null
          period: string
          plan_key: string
          usage_key: string
        }
        Update: {
          created_at?: string
          enforcement_mode?: string
          limit_value?: number | null
          period?: string
          plan_key?: string
          usage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      view_definitions: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          filters: Json
          id: string
          key: string
          name: string
          object_definition_id: string
          organization_id: string
          owner_user_id: string
          scope: string
          selected_columns: string[]
          status: string
          updated_at: string
          view_type: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          key: string
          name: string
          object_definition_id: string
          organization_id: string
          owner_user_id: string
          scope?: string
          selected_columns: string[]
          status?: string
          updated_at?: string
          view_type?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          key?: string
          name?: string
          object_definition_id?: string
          organization_id?: string
          owner_user_id?: string
          scope?: string
          selected_columns?: string[]
          status?: string
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_definitions_object_definition_id_organization_id_fkey"
            columns: ["object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "view_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_audit_history: {
        Row: {
          actor_id: string
          created_at: string
          event: string
          id: string
          organization_id: string
          snapshot: Json
          version: number
          workflow_definition_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event: string
          id?: string
          organization_id: string
          snapshot: Json
          version: number
          workflow_definition_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event?: string
          id?: string
          organization_id?: string
          snapshot?: Json
          version?: number
          workflow_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_audit_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_history_workflow_definition_id_organization_fkey"
            columns: ["workflow_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string
          description: string | null
          disabled_at: string | null
          id: string
          key: string
          name: string
          organization_id: string
          retry_policy: Json
          status: string
          steps: Json
          trigger_config: Json
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by: string
          description?: string | null
          disabled_at?: string | null
          id?: string
          key: string
          name: string
          organization_id: string
          retry_policy?: Json
          status?: string
          steps?: Json
          trigger_config?: Json
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          disabled_at?: string | null
          id?: string
          key?: string
          name?: string
          organization_id?: string
          retry_policy?: Json
          status?: string
          steps?: Json
          trigger_config?: Json
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_steps: {
        Row: {
          action_key: string
          action_type: string
          attempt: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          execution_id: string
          id: string
          input: Json
          organization_id: string
          output: Json
          position: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_key: string
          action_type: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          execution_id: string
          id?: string
          input?: Json
          organization_id: string
          output?: Json
          position: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          action_type?: string
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input?: Json
          organization_id?: string
          output?: Json
          position?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_organization_id_fkey"
            columns: ["execution_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          attempt: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          initiated_by: string
          input: Json
          max_attempts: number
          next_retry_at: string | null
          organization_id: string
          source_object_definition_id: string | null
          source_record_id: string | null
          started_at: string | null
          status: string
          test_run: boolean
          trigger_type: string
          updated_at: string
          workflow_definition_id: string
          workflow_version: number
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          initiated_by: string
          input?: Json
          max_attempts: number
          next_retry_at?: string | null
          organization_id: string
          source_object_definition_id?: string | null
          source_record_id?: string | null
          started_at?: string | null
          status?: string
          test_run?: boolean
          trigger_type: string
          updated_at?: string
          workflow_definition_id: string
          workflow_version: number
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          initiated_by?: string
          input?: Json
          max_attempts?: number
          next_retry_at?: string | null
          organization_id?: string
          source_object_definition_id?: string | null
          source_record_id?: string | null
          started_at?: string | null
          status?: string
          test_run?: boolean
          trigger_type?: string
          updated_at?: string
          workflow_definition_id?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_source_object_definition_id_organizati_fkey"
            columns: ["source_object_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_executions_source_record_id_organization_id_fkey"
            columns: ["source_record_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_records"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_definition_id_organization_id_fkey"
            columns: ["workflow_definition_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      workflow_notifications: {
        Row: {
          created_at: string
          execution_step_id: string
          id: string
          message: string
          organization_id: string
          recipient_role_key: string | null
          recipient_user_id: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          execution_step_id: string
          id?: string
          message: string
          organization_id: string
          recipient_role_key?: string | null
          recipient_user_id?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          execution_step_id?: string
          id?: string
          message?: string
          organization_id?: string
          recipient_role_key?: string | null
          recipient_user_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_notifications_execution_step_id_organization_id_fkey"
            columns: ["execution_step_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_execution_steps"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assignee_user_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          execution_step_id: string
          id: string
          organization_id: string
          source_record_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          execution_step_id: string
          id?: string
          organization_id: string
          source_record_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          execution_step_id?: string
          id?: string
          organization_id?: string
          source_record_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_branch_id_organization_id_fkey"
            columns: ["branch_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_tasks_execution_step_id_organization_id_fkey"
            columns: ["execution_step_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "workflow_execution_steps"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "workflow_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_source_record_id_organization_id_fkey"
            columns: ["source_record_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "object_records"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_customer_note: {
        Args: {
          requested_customer_id: string
          requested_note: string
          requested_organization_id: string
        }
        Returns: string
      }
      settle_paymongo_checkout: {
        Args: { requested_checkout_id: string; requested_session_id: string; requested_payment_id: string; requested_amount: number; requested_currency: string; requested_livemode: boolean }
        Returns: string
      }
      apply_subscription_billing_event: {
        Args: {
          requested_event_type: string
          requested_external_event_id: string
          requested_organization_id: string
          requested_payload?: Json
          requested_period_end: string
          requested_period_start: string
          requested_plan_key: string
          requested_provider: string
        }
        Returns: string
      }
      archive_dynamic_view: {
        Args: {
          requested_organization_id: string
          requested_view_definition_id: string
        }
        Returns: undefined
      }
      archive_object_field: {
        Args: {
          requested_field_id: string
          requested_object_definition_id: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      assert_subscription_feature: {
        Args: {
          requested_feature_key: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      assign_delivery_driver: {
        Args: {
          requested_delivery_id: string
          requested_driver_id: string
          requested_organization_id: string
          requested_vehicle: string
        }
        Returns: undefined
      }
      assign_member_access: {
        Args: {
          requested_branch_access_mode: string
          requested_branch_ids?: string[]
          requested_membership_id: string
          requested_organization_id: string
          requested_role_ids: string[]
        }
        Returns: undefined
      }
      attach_delivery_proof: {
        Args: {
          requested_delivery_id: string
          requested_file_name: string
          requested_mime_type: string
          requested_notes: string
          requested_organization_id: string
          requested_path: string
          requested_size: number
        }
        Returns: string
      }
      attach_expense_receipt: {
        Args: {
          requested_expense_id: string
          requested_file_name: string
          requested_mime_type: string
          requested_organization_id: string
          requested_path: string
          requested_size: number
        }
        Returns: undefined
      }
      attach_job_order_file: {
        Args: {
          requested_file_name: string
          requested_job_order_id: string
          requested_mime_type: string
          requested_organization_id: string
          requested_path: string
          requested_size: number
        }
        Returns: string
      }
      award_sale_loyalty: {
        Args: {
          requested_idempotency_key: string
          requested_organization_id: string
          requested_sale_id: string
        }
        Returns: string
      }
      begin_ai_configuration_apply: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
        }
        Returns: Json
      }
      begin_ai_configuration_rollback: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
        }
        Returns: Json
      }
      begin_configuration_version_restore: {
        Args: {
          requested_organization_id: string
          requested_target_version: number
        }
        Returns: Json
      }
      bootstrap_pos_register: {
        Args: {
          requested_branch_id: string
          requested_client_session_id: string
          requested_device_name: string
          requested_inventory_location_id: string
          requested_opening_cash: number
          requested_organization_id: string
          requested_register_id: string
        }
        Returns: Json
      }
      can_business_permission: {
        Args: {
          requested_branch_id?: string
          requested_organization_id: string
          requested_permission: string
        }
        Returns: boolean
      }
      cancel_approval: {
        Args: {
          requested_approval_request_id: string
          requested_organization_id: string
          requested_reason: string
        }
        Returns: undefined
      }
      cancel_invoice: {
        Args: {
          requested_invoice_id: string
          requested_organization_id: string
          requested_reason: string
        }
        Returns: undefined
      }
      change_appointment_status: {
        Args: {
          requested_appointment_id: string
          requested_notes: string
          requested_organization_id: string
          requested_status: string
        }
        Returns: undefined
      }
      change_delivery_status: {
        Args: {
          requested_delivery_id: string
          requested_notes: string
          requested_organization_id: string
          requested_status: string
        }
        Returns: undefined
      }
      change_job_order_status: {
        Args: {
          requested_job_order_id: string
          requested_notes: string
          requested_organization_id: string
          requested_status: string
        }
        Returns: undefined
      }
      check_subscription_limit: {
        Args: {
          requested_delta?: number
          requested_organization_id: string
          requested_usage_key: string
        }
        Returns: Json
      }
      complete_ai_configuration_apply: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
          requested_rollback_snapshot: Json
        }
        Returns: undefined
      }
      complete_ai_configuration_rollback: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
        }
        Returns: undefined
      }
      complete_configuration_version_restore: {
        Args: {
          requested_organization_id: string
          requested_restore_id: string
        }
        Returns: number
      }
      complete_stock_transfer: {
        Args: {
          requested_from_location_id: string
          requested_idempotency_key: string
          requested_lines: Json
          requested_notes: string
          requested_organization_id: string
          requested_to_location_id: string
        }
        Returns: string
      }
      configure_inventory_item: {
        Args: {
          requested_inventory_item_id: string
          requested_is_tracked: boolean
          requested_low_stock_threshold: number
          requested_organization_id: string
          requested_product_variant_id: string
          requested_reorder_level: number
        }
        Returns: string
      }
      consume_job_order_materials: {
        Args: {
          requested_job_order_id: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      convert_business_trial: {
        Args: { requested_organization_id: string }
        Returns: undefined
      }
      convert_quotation_to_sale: {
        Args: {
          requested_location_id: string
          requested_organization_id: string
          requested_quotation_id: string
        }
        Returns: string
      }
      convert_quotation_to_sales_order: {
        Args: {
          requested_organization_id: string
          requested_quotation_id: string
        }
        Returns: string
      }
      copy_quotation: {
        Args: {
          requested_as_revision: boolean
          requested_organization_id: string
          requested_quotation_id: string
        }
        Returns: string
      }
      create_approval_request: {
        Args: {
          requested_category: string
          requested_description: string
          requested_organization_id: string
          requested_source_object_definition_id: string
          requested_source_record_id: string
          requested_steps: Json
          requested_title: string
          requested_workflow_execution_step_id: string
        }
        Returns: string
      }
      create_business: {
        Args: {
          requested_address: Json
          requested_business_type: string
          requested_email?: string
          requested_industry: string
          requested_legal_name: string
          requested_phone?: string
          requested_slug: string
          requested_tax_identifiers?: Json
          requested_trade_name: string
        }
        Returns: string
      }
      create_custom_role: {
        Args: {
          requested_description: string
          requested_key: string
          requested_name: string
          requested_organization_id: string
          requested_permissions: string[]
        }
        Returns: string
      }
      create_dynamic_object: {
        Args: {
          requested_description?: string
          requested_key: string
          requested_organization_id: string
          requested_plural_label: string
          requested_singular_label: string
        }
        Returns: string
      }
      create_invoice_from_sale: {
        Args: {
          requested_due_date: string
          requested_issue: boolean
          requested_organization_id: string
          requested_sale_id: string
        }
        Returns: string
      }
      create_platform_template_version: {
        Args: {
          requested_change_summary: string
          requested_definition: Json
          requested_template_id: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          requested_expected_date: string
          requested_notes: string
          requested_order_date: string
          requested_organization_id: string
          requested_purchase_request_id: string
          requested_supplier_id: string
          requested_supplier_reference: string
          requested_tax_rate: number
        }
        Returns: string
      }
      create_stock_adjustment: {
        Args: {
          requested_approver_role_key: string
          requested_idempotency_key: string
          requested_lines: Json
          requested_location_id: string
          requested_organization_id: string
          requested_physical_count: boolean
          requested_reason: string
          requested_require_approval: boolean
        }
        Returns: string
      }
      decide_approval: {
        Args: {
          requested_approval_request_id: string
          requested_approval_step_id: string
          requested_comment: string
          requested_decision: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      dispatch_business_notification: {
        Args: {
          requested_body: string
          requested_data: Json
          requested_deep_link: string
          requested_idempotency_key: string
          requested_organization_id: string
          requested_priority: string
          requested_recipient_role_key: string
          requested_recipient_user_id: string
          requested_source: string
          requested_title: string
        }
        Returns: string[]
      }
      expense_summary: {
        Args: {
          requested_from: string
          requested_organization_id: string
          requested_to: string
        }
        Returns: Json
      }
      fail_ai_configuration_apply: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
          requested_reason: string
        }
        Returns: undefined
      }
      fail_ai_configuration_rollback: {
        Args: {
          requested_organization_id: string
          requested_proposal_id: string
          requested_reason: string
        }
        Returns: undefined
      }
      fail_configuration_version_restore: {
        Args: {
          requested_organization_id: string
          requested_reason: string
          requested_restore_id: string
        }
        Returns: undefined
      }
      generate_recurring_expense: {
        Args: {
          requested_idempotency_key: string
          requested_organization_id: string
          requested_recurring_id: string
          requested_scheduled_date: string
        }
        Returns: string
      }
      get_business_trial_dashboard: {
        Args: { requested_organization_id: string }
        Returns: Json
      }
      get_business_trial_value_report: {
        Args: { requested_organization_id: string }
        Returns: Json
      }
      get_subscription_dashboard: {
        Args: { requested_organization_id: string }
        Returns: Json
      }
      has_org_permission: {
        Args: {
          requested_organization_id: string
          requested_permission: string
        }
        Returns: boolean
      }
      install_business_os_template: {
        Args: {
          requested_organization_id: string
          requested_version_id: string
        }
        Returns: string
      }
      list_object_records_page: {
        Args: {
          requested_cursor_created_at?: string
          requested_cursor_id?: string
          requested_limit?: number
          requested_object_definition_id: string
          requested_organization_id: string
        }
        Returns: {
          archived_at: string | null
          attributes: Json
          branch_id: string | null
          created_at: string
          created_by: string
          display_value: string
          id: string
          object_definition_id: string
          organization_id: string
          status: string
          updated_at: string
          updated_by: string
        }[]
        SetofOptions: {
          from: "*"
          to: "object_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_all_notifications_read: {
        Args: { requested_organization_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: {
          requested_notification_id: string
          requested_organization_id: string
          requested_read?: boolean
        }
        Returns: undefined
      }
      platform_admin_dashboard: { Args: never; Returns: Json }
      pos_catalog_snapshot: {
        Args: {
          requested_known_revision?: string
          requested_location_id: string
          requested_organization_id: string
        }
        Returns: Json
      }
      pos_operations_dashboard: {
        Args: { requested_organization_id: string }
        Returns: Json
      }
      post_stock_adjustment: {
        Args: {
          requested_adjustment_id: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      process_loyalty_expiries: {
        Args: { requested_as_of: string; requested_organization_id: string }
        Returns: number
      }
      process_pos_command: {
        Args: {
          requested_command_id: string
          requested_lease_token: string
          requested_mode: string
          requested_occurred_at: string
          requested_organization_id: string
          requested_payload: Json
          requested_register_id: string
          requested_schema_version: number
          requested_session_id: string
        }
        Returns: Json
      }
      publish_platform_template_version: {
        Args: { requested_version_id: string }
        Returns: undefined
      }
      query_advisor_business_data: {
        Args: {
          requested_branch_id?: string
          requested_date_from?: string
          requested_date_to?: string
          requested_limit?: number
          requested_organization_id: string
          requested_query_key: string
        }
        Returns: Json
      }
      query_business_metric: {
        Args: {
          requested_branch_id?: string
          requested_date_from?: string
          requested_date_to?: string
          requested_limit?: number
          requested_metric_key: string
          requested_organization_id: string
        }
        Returns: Json
      }
      query_recommendation_business_data: {
        Args: {
          requested_branch_id?: string
          requested_date_from?: string
          requested_date_to?: string
          requested_limit?: number
          requested_organization_id: string
          requested_query_key: string
        }
        Returns: Json
      }
      queue_quotation_share: {
        Args: {
          requested_channel: string
          requested_organization_id: string
          requested_quotation_id: string
          requested_recipient: string
        }
        Returns: string
      }
      receivables_dashboard: {
        Args: { requested_as_of?: string; requested_organization_id: string }
        Returns: Json
      }
      receive_purchase_order: {
        Args: {
          requested_idempotency_key: string
          requested_lines: Json
          requested_location_id: string
          requested_notes: string
          requested_organization_id: string
          requested_purchase_order_id: string
          requested_received_at: string
          requested_supplier_delivery_reference: string
        }
        Returns: string
      }
      record_ai_advisor_exchange: {
        Args: {
          assistant_content: string
          assistant_response: Json
          business_queries: Json
          metrics: Json
          outcome: string
          queried_business_query_keys: string[]
          queried_metric_keys: string[]
          requested_conversation_id: string
          requested_organization_id: string
          user_question: string
        }
        Returns: undefined
      }
      record_ai_business_interview_turn: {
        Args: {
          assistant_response: string
          expected_stage: string
          generated_recommendation?: Json
          next_stage: string
          requested_interview_id: string
          requested_organization_id: string
          updated_profile: Json
          user_answer: string
        }
        Returns: undefined
      }
      record_ai_system_builder_exchange: {
        Args: {
          assistant_response: string
          change_explanation?: Json
          linked_proposal_id?: string
          outcome?: string
          requested_organization_id: string
          requested_session_id: string
          user_request: string
        }
        Returns: undefined
      }
      record_ar_payment: {
        Args: {
          requested_allocations: Json
          requested_amount: number
          requested_branch_id: string
          requested_customer_id: string
          requested_idempotency_key: string
          requested_method: string
          requested_organization_id: string
          requested_payment_date: string
          requested_reference: string
        }
        Returns: string
      }
      record_attendance_event: {
        Args: {
          requested_branch_id: string
          requested_device_info: Json
          requested_employee_id: string
          requested_event_type: string
          requested_idempotency_key: string
          requested_latitude: number
          requested_longitude: number
          requested_occurred_at: string
          requested_organization_id: string
        }
        Returns: string
      }
      record_business_trial_adoption: {
        Args: {
          requested_event_type: string
          requested_idempotency_key: string
          requested_metadata?: Json
          requested_organization_id: string
          requested_resource_key: string
        }
        Returns: string
      }
      record_customer_loyalty: {
        Args: {
          requested_customer_id: string
          requested_description: string
          requested_organization_id: string
          requested_points: number
          requested_reference_id: string
          requested_reference_type: string
          requested_type: string
        }
        Returns: string
      }
      record_stock_movement: {
        Args: {
          requested_idempotency_key: string
          requested_inventory_item_id: string
          requested_location_id: string
          requested_movement_type: string
          requested_notes: string
          requested_organization_id: string
          requested_quantity_delta: number
          requested_unit_cost: number
        }
        Returns: string
      }
      record_workflow_audit_event: {
        Args: {
          requested_event: string
          requested_organization_id: string
          requested_workflow_definition_id: string
        }
        Returns: undefined
      }
      redeem_loyalty_points: {
        Args: {
          requested_customer_id: string
          requested_description: string
          requested_idempotency_key: string
          requested_organization_id: string
          requested_points: number
          requested_rule_id: string
        }
        Returns: string
      }
      refresh_overdue_invoices: {
        Args: { requested_organization_id: string }
        Returns: number
      }
      reorder_object_fields: {
        Args: {
          requested_field_ids: string[]
          requested_object_definition_id: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      request_platform_support_access: {
        Args: {
          requested_expires_at: string
          requested_organization_id: string
          requested_reason: string
          requested_scopes: string[]
        }
        Returns: string
      }
      request_subscription_change: {
        Args: {
          requested_idempotency_key: string
          requested_operation: string
          requested_organization_id: string
          requested_plan_key: string
        }
        Returns: string
      }
      resolve_pos_reconciliation_case: {
        Args: {
          requested_case_id: string
          requested_disposition: string
          requested_organization_id: string
          requested_resolution: string
        }
        Returns: undefined
      }
      return_sale: {
        Args: {
          requested_client_return_id: string
          requested_lines: Json
          requested_organization_id: string
          requested_reason: string
          requested_refund_payments: Json
          requested_sale_id: string
        }
        Returns: string
      }
      review_ai_business_interview: {
        Args: {
          decision: string
          requested_interview_id: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      review_ai_configuration_proposal: {
        Args: {
          requested_decision: string
          requested_organization_id: string
          requested_proposal_id: string
        }
        Returns: undefined
      }
      review_platform_support_access: {
        Args: { requested_approve: boolean; requested_request_id: string }
        Returns: undefined
      }
      save_ai_recommendations: {
        Args: {
          recommendations?: Json
          requested_branch_id?: string
          requested_organization_id: string
        }
        Returns: number
      }
      save_appointment: {
        Args: {
          requested_appointment_id: string
          requested_branch_id: string
          requested_customer_id: string
          requested_date: string
          requested_end_time: string
          requested_notes: string
          requested_organization_id: string
          requested_service_id: string
          requested_staff_id: string
          requested_start_time: string
          requested_status: string
        }
        Returns: string
      }
      save_business_health_assessment: {
        Args: {
          requested_industry: string
          requested_organization_id: string
          requested_priorities: string[]
          requested_responses: Json
          requested_scores: Json
          requested_strengths: string[]
        }
        Returns: string
      }
      save_catalog_product: {
        Args: {
          requested_branch_id: string
          requested_brand_id: string
          requested_category_id: string
          requested_cost_price: number
          requested_default_unit: string
          requested_description: string
          requested_has_variants: boolean
          requested_images: Json
          requested_name: string
          requested_organization_id: string
          requested_product_id: string
          requested_product_type: string
          requested_selling_price: number
          requested_status: string
          requested_tax_rate: number
          requested_tax_type: string
          requested_variants: Json
        }
        Returns: string
      }
      save_crm_customer: {
        Args: {
          requested_address: Json
          requested_birthdate: string
          requested_branch_id: string
          requested_company: string
          requested_customer_id: string
          requested_customer_type: string
          requested_email: string
          requested_mobile: string
          requested_name: string
          requested_notes: string
          requested_organization_id: string
          requested_tags: string[]
        }
        Returns: string
      }
      save_customer_segment: {
        Args: {
          requested_criteria: Json
          requested_description: string
          requested_is_active: boolean
          requested_key: string
          requested_name: string
          requested_organization_id: string
          requested_segment_id: string
        }
        Returns: string
      }
      save_delivery: {
        Args: {
          requested_address: string
          requested_contact: string
          requested_courier_provider: string
          requested_customer_id: string
          requested_organization_id: string
          requested_scheduled_at: string
          requested_source_branch_id: string
          requested_transaction_id: string
          requested_vehicle: string
        }
        Returns: string
      }
      save_dynamic_form: {
        Args: {
          requested_description: string
          requested_form_definition_id?: string
          requested_key: string
          requested_mode: string
          requested_name: string
          requested_object_definition_id: string
          requested_organization_id: string
          requested_sections: Json
        }
        Returns: string
      }
      save_dynamic_view: {
        Args: {
          requested_columns: string[]
          requested_configuration: Json
          requested_description: string
          requested_filters: Json
          requested_key: string
          requested_name: string
          requested_object_definition_id: string
          requested_organization_id: string
          requested_scope: string
          requested_type: string
          requested_view_definition_id?: string
        }
        Returns: string
      }
      save_employee: {
        Args: {
          requested_branch_id: string
          requested_contact: string
          requested_employee_id: string
          requested_employment_status: string
          requested_hire_date: string
          requested_membership_id: string
          requested_name: string
          requested_organization_id: string
          requested_position: string
        }
        Returns: string
      }
      save_expense: {
        Args: {
          requested_amount: number
          requested_branch_id: string
          requested_category_id: string
          requested_description: string
          requested_expense_date: string
          requested_expense_id: string
          requested_idempotency_key: string
          requested_organization_id: string
          requested_payment_method: string
          requested_submit: boolean
          requested_supplier_payee: string
        }
        Returns: string
      }
      save_expense_category: {
        Args: {
          requested_category_id: string
          requested_description: string
          requested_is_active: boolean
          requested_name: string
          requested_organization_id: string
        }
        Returns: string
      }
      save_inventory_location: {
        Args: {
          requested_branch_id: string
          requested_code: string
          requested_is_active: boolean
          requested_location_id: string
          requested_name: string
          requested_organization_id: string
          requested_type: string
        }
        Returns: string
      }
      save_invoice: {
        Args: {
          requested_branch_id: string
          requested_customer_id: string
          requested_due_date: string
          requested_invoice_date: string
          requested_invoice_id: string
          requested_issue: boolean
          requested_lines: Json
          requested_notes: string
          requested_organization_id: string
        }
        Returns: string
      }
      save_job_order: {
        Args: {
          requested_branch_id: string
          requested_customer_id: string
          requested_description: string
          requested_due_date: string
          requested_labor_items: Json
          requested_material_items: Json
          requested_notes: string
          requested_organization_id: string
          requested_priority: string
          requested_service_id: string
          requested_service_type: string
          requested_staff_id: string
          requested_start_date: string
        }
        Returns: string
      }
      save_loyalty_rule: {
        Args: {
          requested_expiry_days: number
          requested_is_active: boolean
          requested_name: string
          requested_organization_id: string
          requested_points_amount: number
          requested_priority: number
          requested_redemption_value: number
          requested_rule_id: string
          requested_rule_type: string
          requested_spend_amount: number
        }
        Returns: string
      }
      save_negosyo_coach_progress: {
        Args: {
          requested_completed?: boolean
          requested_dismissed?: boolean
          requested_last_task_key?: string
          requested_organization_id: string
          requested_playbook_key: string
        }
        Returns: string
      }
      save_notification_preference: {
        Args: {
          requested_channel: string
          requested_enabled: boolean
          requested_organization_id: string
          requested_source: string
        }
        Returns: undefined
      }
      save_notification_template: {
        Args: {
          requested_body_template: string
          requested_channel: string
          requested_deep_link_template: string
          requested_is_active: boolean
          requested_key: string
          requested_name: string
          requested_organization_id: string
          requested_source: string
          requested_subject_template: string
          requested_template_id: string
          requested_variable_keys: string[]
        }
        Returns: string
      }
      save_object_record: {
        Args: {
          requested_attributes?: Json
          requested_branch_id?: string
          requested_object_definition_id: string
          requested_organization_id: string
          requested_record_id?: string
        }
        Returns: string
      }
      save_platform_feature_flag: {
        Args: {
          requested_description: string
          requested_enabled: boolean
          requested_key: string
          requested_name: string
          requested_rollout: number
        }
        Returns: undefined
      }
      save_pos_transaction: {
        Args: {
          requested_branch_id: string
          requested_client_created_at: string
          requested_client_transaction_id: string
          requested_customer_id: string
          requested_inventory_location_id: string
          requested_lines: Json
          requested_organization_id: string
          requested_payments: Json
          requested_sale_id: string
          requested_status: string
        }
        Returns: string
      }
      save_product_brand: {
        Args: {
          requested_brand_id: string
          requested_description: string
          requested_name: string
          requested_organization_id: string
          requested_status: string
        }
        Returns: string
      }
      save_product_category: {
        Args: {
          requested_category_id: string
          requested_description: string
          requested_name: string
          requested_organization_id: string
          requested_status: string
        }
        Returns: string
      }
      save_purchase_request: {
        Args: {
          requested_approver_role_key: string
          requested_branch_id: string
          requested_lines: Json
          requested_needed_by: string
          requested_organization_id: string
          requested_purpose: string
          requested_require_approval: boolean
          requested_submit: boolean
        }
        Returns: string
      }
      save_quotation: {
        Args: {
          requested_branch_id: string
          requested_customer_id: string
          requested_lines: Json
          requested_notes: string
          requested_organization_id: string
          requested_quotation_id: string
          requested_salesperson_id: string
          requested_submit: boolean
          requested_terms: string
          requested_valid_until: string
        }
        Returns: string
      }
      save_recurring_expense: {
        Args: {
          requested_amount: number
          requested_branch_id: string
          requested_category_id: string
          requested_description: string
          requested_end_date: string
          requested_frequency: string
          requested_is_active: boolean
          requested_name: string
          requested_next_due_date: string
          requested_organization_id: string
          requested_payment_method: string
          requested_recurring_id: string
          requested_supplier_payee: string
        }
        Returns: string
      }
      save_sales_customer: {
        Args: {
          requested_customer_id: string
          requested_email: string
          requested_name: string
          requested_organization_id: string
          requested_phone: string
        }
        Returns: string
      }
      save_supplier: {
        Args: {
          requested_address: string
          requested_contact_person: string
          requested_email: string
          requested_mobile: string
          requested_name: string
          requested_notes: string
          requested_organization_id: string
          requested_payment_terms_days: number
          requested_status: string
          requested_supplier_id: string
          requested_tax_id: string
        }
        Returns: string
      }
      save_supplier_invoice: {
        Args: {
          requested_branch_id: string
          requested_due_date: string
          requested_invoice_date: string
          requested_invoice_number: string
          requested_notes: string
          requested_organization_id: string
          requested_purchase_order_id: string
          requested_subtotal: number
          requested_supplier_id: string
          requested_tax_total: number
        }
        Returns: string
      }
      save_workflow_definition: {
        Args: {
          requested_actions: Json
          requested_conditions: Json
          requested_description: string
          requested_key: string
          requested_name: string
          requested_organization_id: string
          requested_retry_policy: Json
          requested_status: string
          requested_trigger: Json
          requested_workflow_definition_id?: string
        }
        Returns: string
      }
      set_business_module_state: {
        Args: {
          requested_configuration?: Json
          requested_enabled: boolean
          requested_module_key: string
          requested_organization_id: string
        }
        Returns: undefined
      }
      set_custom_role_permissions: {
        Args: {
          requested_organization_id: string
          requested_permissions: string[]
          requested_role_id: string
        }
        Returns: undefined
      }
      set_platform_business_status: {
        Args: { requested_organization_id: string; requested_status: string }
        Returns: undefined
      }
      set_platform_module_status: {
        Args: { requested_key: string; requested_status: string }
        Returns: undefined
      }
      set_platform_subscription: {
        Args: {
          requested_organization_id: string
          requested_plan: string
          requested_status: string
        }
        Returns: undefined
      }
      set_platform_template_status: {
        Args: { requested_status: string; requested_template_id: string }
        Returns: undefined
      }
      start_ai_advisor_conversation: {
        Args: {
          requested_branch_id?: string
          requested_organization_id: string
        }
        Returns: string
      }
      start_ai_business_interview: {
        Args: { initial_prompt: string; requested_organization_id: string }
        Returns: string
      }
      start_ai_system_builder_session: {
        Args: {
          initial_message: string
          requested_organization_id: string
          requested_title: string
        }
        Returns: string
      }
      submit_ai_configuration_proposal: {
        Args: {
          requested_base_revision: number
          requested_operations: Json
          requested_organization_id: string
          requested_summary: string
          requested_title: string
          requested_warnings?: Json
        }
        Returns: string
      }
      transition_ai_recommendation: {
        Args: {
          next_status: string
          requested_organization_id: string
          requested_recommendation_id: string
        }
        Returns: undefined
      }
      transition_quotation: {
        Args: {
          requested_organization_id: string
          requested_quotation_id: string
          requested_status: string
        }
        Returns: undefined
      }
      update_platform_health_check: {
        Args: {
          requested_message: string
          requested_metrics?: Json
          requested_service: string
          requested_status: string
        }
        Returns: undefined
      }
      upsert_object_field: {
        Args: {
          requested_config: Json
          requested_field_id?: string
          requested_key: string
          requested_label: string
          requested_object_definition_id: string
          requested_organization_id: string
          requested_required: boolean
          requested_type: string
          requested_unique: boolean
        }
        Returns: string
      }
      void_sale: {
        Args: {
          requested_organization_id: string
          requested_reason: string
          requested_sale_id: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

