import { User, Role, UserRole, Program, Course, Module, Lesson, UserProgress } from './database.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'created_at' | 'updated_at'>>
      }
      roles: {
        Row: Role
        Insert: Omit<Role, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Role, 'created_at' | 'updated_at'>>
      }
      user_roles: {
        Row: UserRole
        Insert: Omit<UserRole, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserRole, 'created_at' | 'updated_at'>>
      }
      programs: {
        Row: Program
        Insert: Omit<Program, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Program, 'created_at' | 'updated_at'>>
      }
      courses: {
        Row: Course
        Insert: Omit<Course, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Course, 'created_at' | 'updated_at'>>
      }
      modules: {
        Row: Module
        Insert: Omit<Module, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Module, 'created_at' | 'updated_at'>>
      }
      lessons: {
        Row: Lesson
        Insert: Omit<Lesson, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lesson, 'created_at' | 'updated_at'>>
      }
      user_progress: {
        Row: UserProgress
        Insert: Omit<UserProgress, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProgress, 'created_at' | 'updated_at'>>
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          name: string
          description: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          name: string
          description: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      permissions: {
        Row: {
          id: string
          code: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          code: string
          description: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          code: string
          description: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          role_id: string
          permission_id: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          role_id: string
          permission_id: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      quiz_questions: {
        Row: {
          id: string
          module_id: string
          question_text: string
          question_type: string
          sequence_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          module_id: string
          question_text: string
          question_type: string
          sequence_order: number
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          module_id: string
          question_text: string
          question_type: string
          sequence_order: number
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      user_quiz_attempts: {
        Row: {
          id: string
          user_id: string
          module_id: string
          score: number
          passed: boolean
          completed_at: string
          attempts: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          user_id: string
          module_id: string
          score: number
          passed: boolean
          completed_at: string
          attempts: number
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          user_id: string
          module_id: string
          score: number
          passed: boolean
          completed_at: string
          attempts: number
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          email_weekly_digest: boolean
          email_account_updates: boolean
          email_marketing_emails: boolean
          text_account_notifications: boolean
          text_booking_confirmations: boolean
          text_marketing_messages: boolean
          app_new_messages: boolean
          app_event_reminders: boolean
          app_promotions_alerts: boolean
          app_reservation_updates: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          user_id: string
          email_weekly_digest: boolean
          email_account_updates: boolean
          email_marketing_emails: boolean
          text_account_notifications: boolean
          text_booking_confirmations: boolean
          text_marketing_messages: boolean
          app_new_messages: boolean
          app_event_reminders: boolean
          app_promotions_alerts: boolean
          app_reservation_updates: boolean
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          user_id: string
          email_weekly_digest: boolean
          email_account_updates: boolean
          email_marketing_emails: boolean
          text_account_notifications: boolean
          text_booking_confirmations: boolean
          text_marketing_messages: boolean
          app_new_messages: boolean
          app_event_reminders: boolean
          app_promotions_alerts: boolean
          app_reservation_updates: boolean
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      user_program_progress: {
        Row: {
          id: string
          user_id: string
          program_id: string
          status: string
          completion_percentage: number
          started_at: string
          completed_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          user_id: string
          program_id: string
          status: string
          completion_percentage: number
          started_at: string
          completed_at: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          user_id: string
          program_id: string
          status: string
          completion_percentage: number
          started_at: string
          completed_at: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string
          code: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<{
          id: string
          name: string
          description: string
          code: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>
        Update: Partial<Omit<{
          id: string
          name: string
          description: string
          code: string
          created_at: string
          updated_at: string
        }, 'created_at' | 'updated_at'>>
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
  }
} 