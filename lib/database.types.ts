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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      courses: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          overview: string | null
          program_id: string | null
          sequence_order: number
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          overview?: string | null
          program_id?: string | null
          sequence_order?: number
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          overview?: string | null
          program_id?: string | null
          sequence_order?: number
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          instructors: string[] | null
          sequence_order: number
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructors?: string[] | null
          sequence_order?: number
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructors?: string[] | null
          sequence_order?: number
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          has_quiz: boolean | null
          id: string
          lesson_id: string | null
          quiz_type: string | null
          sequence_order: number
          status: string | null
          title: string
          updated_at: string | null
          video_required: boolean | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          has_quiz?: boolean | null
          id?: string
          lesson_id?: string | null
          quiz_type?: string | null
          sequence_order?: number
          status?: string | null
          title: string
          updated_at?: string | null
          video_required?: boolean | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          has_quiz?: boolean | null
          id?: string
          lesson_id?: string | null
          quiz_type?: string | null
          sequence_order?: number
          status?: string | null
          title?: string
          updated_at?: string | null
          video_required?: boolean | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          departments: string[] | null
          description: string | null
          id: string
          published_at: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          departments?: string[] | null
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          departments?: string[] | null
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answer_text: string
          id: string
          is_correct: boolean
          question_id: string | null
          sequence_order: number
        }
        Insert: {
          answer_text: string
          id?: string
          is_correct: boolean
          question_id?: string | null
          sequence_order?: number
        }
        Update: {
          answer_text?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          question: string
          question_type: string
          sequence_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          question: string
          question_type: string
          sequence_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          question?: string
          question_type?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          app_event_reminders: boolean | null
          app_new_messages: boolean | null
          app_promotional_alerts: boolean | null
          app_reservation_updates: boolean | null
          created_at: string | null
          email_account_notifications: boolean | null
          email_marketing_notifications: boolean | null
          email_weekly_newsletter: boolean | null
          id: string
          text_account_notifications: boolean | null
          text_booking_confirmations: boolean | null
          text_marketing_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_event_reminders?: boolean | null
          app_new_messages?: boolean | null
          app_promotional_alerts?: boolean | null
          app_reservation_updates?: boolean | null
          created_at?: string | null
          email_account_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_weekly_newsletter?: boolean | null
          id?: string
          text_account_notifications?: boolean | null
          text_booking_confirmations?: boolean | null
          text_marketing_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_event_reminders?: boolean | null
          app_new_messages?: boolean | null
          app_promotional_alerts?: boolean | null
          app_reservation_updates?: boolean | null
          created_at?: string | null
          email_account_notifications?: boolean | null
          email_marketing_notifications?: boolean | null
          email_weekly_newsletter?: boolean | null
          id?: string
          text_account_notifications?: boolean | null
          text_booking_confirmations?: boolean | null
          text_marketing_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_program_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          id: string
          program_id: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          program_id?: string | null
          started_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          program_id?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_program_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          attempts: number | null
          completed_at: string | null
          completion_percentage: number | null
          id: string
          last_video_position: number | null
          module_id: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          last_video_position?: number | null
          module_id?: string | null
          started_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          id?: string
          last_video_position?: number | null
          module_id?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          id: string
          module_id: string | null
          passed: boolean
          score: number
          user_id: string | null
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          id?: string
          module_id?: string | null
          passed: boolean
          score: number
          user_id?: string | null
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          id?: string
          module_id?: string | null
          passed?: boolean
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          employee_id: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          title: string | null
          training_manager: boolean | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          training_manager?: boolean | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          training_manager?: boolean | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_program_completion: {
        Args: {
          program_id: string
          user_id: string
        }
        Returns: number
      }
      make_user_admin: {
        Args: {
          user_id: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
