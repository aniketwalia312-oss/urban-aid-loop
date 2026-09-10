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
      challenge_messages: {
        Row: {
          author_name: string | null
          body: string
          challenge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          body: string
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          body?: string
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_routes: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          institution_id: string
          match_score: number
          rationale: string | null
          status: Database["public"]["Enums"]["route_status"]
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          institution_id: string
          match_score?: number
          rationale?: string | null
          status?: Database["public"]["Enums"]["route_status"]
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          match_score?: number
          rationale?: string | null
          status?: Database["public"]["Enums"]["route_status"]
        }
        Relationships: [
          {
            foreignKeyName: "challenge_routes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_routes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_supports: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_supports_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          address: string | null
          ai_confidence: number
          ai_rationale: string | null
          ai_summary: string | null
          beneficiaries: number
          created_at: string
          description: string
          district: string | null
          document_paths: string[]
          domain: string
          duplicate_of: string | null
          id: string
          latitude: number | null
          longitude: number | null
          media_paths: string[]
          organisation_name: string | null
          priority_score: number
          severity_score: number
          status: Database["public"]["Enums"]["challenge_status"]
          submitter_id: string | null
          submitter_type: Database["public"]["Enums"]["submitter_type"]
          support_count: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_confidence?: number
          ai_rationale?: string | null
          ai_summary?: string | null
          beneficiaries?: number
          created_at?: string
          description: string
          district?: string | null
          document_paths?: string[]
          domain?: string
          duplicate_of?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_paths?: string[]
          organisation_name?: string | null
          priority_score?: number
          severity_score?: number
          status?: Database["public"]["Enums"]["challenge_status"]
          submitter_id?: string | null
          submitter_type?: Database["public"]["Enums"]["submitter_type"]
          support_count?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_confidence?: number
          ai_rationale?: string | null
          ai_summary?: string | null
          beneficiaries?: number
          created_at?: string
          description?: string
          district?: string | null
          document_paths?: string[]
          domain?: string
          duplicate_of?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_paths?: string[]
          organisation_name?: string | null
          priority_score?: number
          severity_score?: number
          status?: Database["public"]["Enums"]["challenge_status"]
          submitter_id?: string | null
          submitter_type?: Database["public"]["Enums"]["submitter_type"]
          support_count?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
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
      institutions: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          district: string | null
          domains: string[]
          id: string
          name: string
          owner_id: string | null
          type: Database["public"]["Enums"]["institution_type"]
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          domains?: string[]
          id?: string
          name: string
          owner_id?: string | null
          type: Database["public"]["Enums"]["institution_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          domains?: string[]
          id?: string
          name?: string
          owner_id?: string | null
          type?: Database["public"]["Enums"]["institution_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          amount_inr: number
          created_at: string
          created_by: string | null
          id: string
          institution_id: string
          notes: string | null
          partner_type: Database["public"]["Enums"]["partnership_type"]
          project_id: string
          status: Database["public"]["Enums"]["partnership_status"]
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          partner_type?: Database["public"]["Enums"]["partnership_type"]
          project_id: string
          status?: Database["public"]["Enums"]["partnership_status"]
        }
        Update: {
          amount_inr?: number
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          partner_type?: Database["public"]["Enums"]["partnership_type"]
          project_id?: string
          status?: Database["public"]["Enums"]["partnership_status"]
        }
        Relationships: [
          {
            foreignKeyName: "partnerships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      projects: {
        Row: {
          beneficiaries: number
          challenge_id: string
          created_at: string
          id: string
          institution_id: string
          outcome_summary: string | null
          patents: number
          progress: number
          proposal_id: string | null
          started_at: string
          startups_created: number
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          beneficiaries?: number
          challenge_id: string
          created_at?: string
          id?: string
          institution_id: string
          outcome_summary?: string | null
          patents?: number
          progress?: number
          proposal_id?: string | null
          started_at?: string
          startups_created?: number
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          beneficiaries?: number
          challenge_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          outcome_summary?: string | null
          patents?: number
          progress?: number
          proposal_id?: string | null
          started_at?: string
          startups_created?: number
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          abstract: string
          approach: string | null
          budget_inr: number
          challenge_id: string
          created_at: string
          created_by: string | null
          duration_weeks: number
          faculty_mentor: string | null
          id: string
          institution_id: string
          review_notes: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          team_members: Json
          title: string
          updated_at: string
        }
        Insert: {
          abstract: string
          approach?: string | null
          budget_inr?: number
          challenge_id: string
          created_at?: string
          created_by?: string | null
          duration_weeks?: number
          faculty_mentor?: string | null
          id?: string
          institution_id: string
          review_notes?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          team_members?: Json
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string
          approach?: string | null
          budget_inr?: number
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          duration_weeks?: number
          faculty_mentor?: string | null
          id?: string
          institution_id?: string
          review_notes?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          team_members?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
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
      app_role:
        | "citizen"
        | "worker"
        | "official_admin"
        | "university"
        | "industry"
        | "government"
      challenge_status:
        | "submitted"
        | "validated"
        | "routed"
        | "proposal_received"
        | "in_project"
        | "completed"
        | "rejected"
        | "duplicate"
      institution_type:
        | "university"
        | "industry"
        | "startup"
        | "msme"
        | "csr"
        | "research_lab"
        | "incubator"
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
      milestone_status: "pending" | "in_progress" | "done" | "blocked"
      partnership_status: "proposed" | "active" | "completed" | "withdrawn"
      partnership_type:
        | "mentorship"
        | "funding"
        | "prototyping"
        | "pilot"
        | "tech_transfer"
        | "csr_grant"
      project_status:
        | "planning"
        | "in_progress"
        | "testing"
        | "piloting"
        | "deployed"
        | "completed"
        | "stalled"
      proposal_status: "draft" | "submitted" | "approved" | "rejected"
      route_status: "routed" | "accepted" | "declined"
      submitter_type:
        | "citizen"
        | "community_org"
        | "panchayat"
        | "urban_local_body"
        | "government_dept"
        | "ngo"
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
      app_role: [
        "citizen",
        "worker",
        "official_admin",
        "university",
        "industry",
        "government",
      ],
      challenge_status: [
        "submitted",
        "validated",
        "routed",
        "proposal_received",
        "in_project",
        "completed",
        "rejected",
        "duplicate",
      ],
      institution_type: [
        "university",
        "industry",
        "startup",
        "msme",
        "csr",
        "research_lab",
        "incubator",
      ],
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
      milestone_status: ["pending", "in_progress", "done", "blocked"],
      partnership_status: ["proposed", "active", "completed", "withdrawn"],
      partnership_type: [
        "mentorship",
        "funding",
        "prototyping",
        "pilot",
        "tech_transfer",
        "csr_grant",
      ],
      project_status: [
        "planning",
        "in_progress",
        "testing",
        "piloting",
        "deployed",
        "completed",
        "stalled",
      ],
      proposal_status: ["draft", "submitted", "approved", "rejected"],
      route_status: ["routed", "accepted", "declined"],
      submitter_type: [
        "citizen",
        "community_org",
        "panchayat",
        "urban_local_body",
        "government_dept",
        "ngo",
      ],
      verification_vote: ["resolved", "partially_resolved", "still_present"],
    },
  },
} as const
