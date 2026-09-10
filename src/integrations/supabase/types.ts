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
      civic_issues: {
        Row: {
          address: string | null
          admin_review_flag: boolean
          assigned_worker_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          evidence_count: number
          failure_count: number
          id: string
          latitude: number
          longitude: number
          priority_score: number
          report_count: number
          severity_score: number
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          address?: string | null
          admin_review_flag?: boolean
          assigned_worker_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          evidence_count?: number
          failure_count?: number
          id?: string
          latitude: number
          longitude: number
          priority_score?: number
          report_count?: number
          severity_score?: number
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address?: string | null
          admin_review_flag?: boolean
          assigned_worker_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evidence_count?: number
          failure_count?: number
          id?: string
          latitude?: number
          longitude?: number
          priority_score?: number
          report_count?: number
          severity_score?: number
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_summary: string | null
          civic_issue_id: string
          created_at: string
          device_lat: number | null
          device_lng: number | null
          exif_lat: number | null
          exif_lng: number | null
          exif_timestamp: string | null
          fraud_reason: string | null
          id: string
          image_url: string
          is_flagged_fraud: boolean
          phash: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          civic_issue_id: string
          created_at?: string
          device_lat?: number | null
          device_lng?: number | null
          exif_lat?: number | null
          exif_lng?: number | null
          exif_timestamp?: string | null
          fraud_reason?: string | null
          id?: string
          image_url: string
          is_flagged_fraud?: boolean
          phash?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          civic_issue_id?: string
          created_at?: string
          device_lat?: number | null
          device_lng?: number | null
          exif_lat?: number | null
          exif_lng?: number | null
          exif_timestamp?: string | null
          fraud_reason?: string | null
          id?: string
          image_url?: string
          is_flagged_fraud?: boolean
          phash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_civic_issue_id_fkey"
            columns: ["civic_issue_id"]
            isOneToOne: false
            referencedRelation: "civic_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_proofs: {
        Row: {
          after_image_url: string
          ai_analysis_summary: string
          ai_confidence_score: number
          before_image_url: string
          civic_issue_id: string
          id: string
          is_same_scene: boolean
          issue_resolved: boolean
          potential_anomaly: boolean
          submitted_at: string
          worker_id: string | null
          worker_notes: string
        }
        Insert: {
          after_image_url: string
          ai_analysis_summary?: string
          ai_confidence_score?: number
          before_image_url: string
          civic_issue_id: string
          id?: string
          is_same_scene?: boolean
          issue_resolved?: boolean
          potential_anomaly?: boolean
          submitted_at?: string
          worker_id?: string | null
          worker_notes?: string
        }
        Update: {
          after_image_url?: string
          ai_analysis_summary?: string
          ai_confidence_score?: number
          before_image_url?: string
          civic_issue_id?: string
          id?: string
          is_same_scene?: boolean
          issue_resolved?: boolean
          potential_anomaly?: boolean
          submitted_at?: string
          worker_id?: string | null
          worker_notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_proofs_civic_issue_id_fkey"
            columns: ["civic_issue_id"]
            isOneToOne: true
            referencedRelation: "civic_issues"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      verifications: {
        Row: {
          civic_issue_id: string
          created_at: string
          feedback: string | null
          id: string
          user_id: string
          vote: Database["public"]["Enums"]["verification_vote"]
        }
        Insert: {
          civic_issue_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          user_id: string
          vote: Database["public"]["Enums"]["verification_vote"]
        }
        Update: {
          civic_issue_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["verification_vote"]
        }
        Relationships: [
          {
            foreignKeyName: "verifications_civic_issue_id_fkey"
            columns: ["civic_issue_id"]
            isOneToOne: false
            referencedRelation: "civic_issues"
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
      app_role: "citizen" | "worker" | "official_admin"
      issue_status:
        | "reported"
        | "clustered_duplicate"
        | "assigned_to_worker"
        | "in_progress"
        | "resolved_pending_audit"
        | "closed_verified"
        | "resolution_anomaly"
        | "reopened_failed_resolution"
        | "flagged_admin_review"
      verification_vote: "resolved" | "partially_resolved" | "still_present"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["citizen", "worker", "official_admin"],
      issue_status: [
        "reported",
        "clustered_duplicate",
        "assigned_to_worker",
        "in_progress",
        "resolved_pending_audit",
        "closed_verified",
        "resolution_anomaly",
        "reopened_failed_resolution",
        "flagged_admin_review",
      ],
      verification_vote: ["resolved", "partially_resolved", "still_present"],
    },
  },
} as const
