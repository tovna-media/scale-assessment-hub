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
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
