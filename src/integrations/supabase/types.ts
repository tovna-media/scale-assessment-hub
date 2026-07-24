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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          ghl_enabled: boolean
          ghl_webhook_url: string | null
          id: number
          updated_at: string
        }
        Insert: {
          ghl_enabled?: boolean
          ghl_webhook_url?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          ghl_enabled?: boolean
          ghl_webhook_url?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      assessee_status: {
        Row: {
          assessee_id: string
          coach_id: string | null
          status: Database["public"]["Enums"]["assessee_pipeline_status"]
          updated_at: string
        }
        Insert: {
          assessee_id: string
          coach_id?: string | null
          status?: Database["public"]["Enums"]["assessee_pipeline_status"]
          updated_at?: string
        }
        Update: {
          assessee_id?: string
          coach_id?: string | null
          status?: Database["public"]["Enums"]["assessee_pipeline_status"]
          updated_at?: string
        }
        Relationships: []
      }
      assessment_sessions: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at: string
          gap_report: string | null
          id: string
          overall_level: string | null
          overall_score: number
          primary_gap: string | null
          primary_gap_level: string | null
          primary_gap_score: number | null
          responses: Json
          secondary_gap: string | null
          secondary_gap_score: number | null
          subcategory_scores: Json
          user_id: string
        }
        Insert: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          gap_report?: string | null
          id?: string
          overall_level?: string | null
          overall_score?: number
          primary_gap?: string | null
          primary_gap_level?: string | null
          primary_gap_score?: number | null
          responses?: Json
          secondary_gap?: string | null
          secondary_gap_score?: number | null
          subcategory_scores?: Json
          user_id: string
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          gap_report?: string | null
          id?: string
          overall_level?: string | null
          overall_score?: number
          primary_gap?: string | null
          primary_gap_level?: string | null
          primary_gap_score?: number | null
          responses?: Json
          secondary_gap?: string | null
          secondary_gap_score?: number | null
          subcategory_scores?: Json
          user_id?: string
        }
        Relationships: []
      }
      coach_notes: {
        Row: {
          assessee_id: string
          coach_id: string
          created_at: string
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          assessee_id: string
          coach_id: string
          created_at?: string
          id?: string
          note: string
          updated_at?: string
        }
        Update: {
          assessee_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_habit_checks: {
        Row: {
          check_date: string
          created_at: string
          habit_key: string
          user_id: string
        }
        Insert: {
          check_date: string
          created_at?: string
          habit_key: string
          user_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          habit_key?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      gap_reports: {
        Row: {
          business_score: number | null
          created_at: string
          generated_at: string
          ghl_sent_at: string | null
          id: string
          inner_capacity_level: string | null
          inner_capacity_score: number | null
          leadership_score: number | null
          pdf_path: string | null
          primary_gap: string | null
          primary_gap_level: string | null
          report_data: Json
          user_id: string
        }
        Insert: {
          business_score?: number | null
          created_at?: string
          generated_at?: string
          ghl_sent_at?: string | null
          id?: string
          inner_capacity_level?: string | null
          inner_capacity_score?: number | null
          leadership_score?: number | null
          pdf_path?: string | null
          primary_gap?: string | null
          primary_gap_level?: string | null
          report_data?: Json
          user_id: string
        }
        Update: {
          business_score?: number | null
          created_at?: string
          generated_at?: string
          ghl_sent_at?: string | null
          id?: string
          inner_capacity_level?: string | null
          inner_capacity_score?: number | null
          leadership_score?: number | null
          pdf_path?: string | null
          primary_gap?: string | null
          primary_gap_level?: string | null
          report_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      leadership_dashboard_snapshots: {
        Row: {
          created_at: string
          cycle_number: number
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_number?: number
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_number?: number
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      optimizer_section_progress: {
        Row: {
          completed: boolean
          created_at: string
          data: Json
          id: string
          priority_gap: string | null
          priority_gap_score: number | null
          section_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          data?: Json
          id?: string
          priority_gap?: string | null
          priority_gap_score?: number | null
          section_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          data?: Json
          id?: string
          priority_gap?: string | null
          priority_gap_score?: number | null
          section_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          free_pass_used: boolean
          full_name: string | null
          id: string
          last_action_reminder_on: string | null
          last_name: string | null
          phone: string | null
          subscribed: boolean
          timezone: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          free_pass_used?: boolean
          full_name?: string | null
          id: string
          last_action_reminder_on?: string | null
          last_name?: string | null
          phone?: string | null
          subscribed?: boolean
          timezone?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          free_pass_used?: boolean
          full_name?: string | null
          id?: string
          last_action_reminder_on?: string | null
          last_name?: string | null
          phone?: string | null
          subscribed?: boolean
          timezone?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          event_id: string
          processed_at: string
          type: string
        }
        Insert: {
          event_id: string
          processed_at?: string
          type: string
        }
        Update: {
          event_id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          past_due_since: string | null
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          past_due_since?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          past_due_since?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      success_image_reads: {
        Row: {
          created_at: string
          read_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          read_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          read_date?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_action_state: {
        Row: {
          action_key: string
          carried_at: string | null
          closed_at: string | null
          done_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_key: string
          carried_at?: string | null
          closed_at?: string | null
          done_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_key?: string
          carried_at?: string | null
          closed_at?: string | null
          done_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_email: { Args: { _email: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "assessee" | "coach"
      assessee_pipeline_status: "New" | "Contacted" | "Booked" | "Client"
      assessment_type:
        | "inner_capacity"
        | "personal_leadership"
        | "business_audit"
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
    Enums: {
      app_role: ["assessee", "coach"],
      assessee_pipeline_status: ["New", "Contacted", "Booked", "Client"],
      assessment_type: [
        "inner_capacity",
        "personal_leadership",
        "business_audit",
      ],
    },
  },
} as const
