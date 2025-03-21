export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  department?: string[];
  department_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  rank: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  venue_id?: string;
  department_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  departments: string[];
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  is_published?: boolean;
}

export interface Course {
  id: string;
  program_id: string;
  title: string;
  description: string;
  overview?: string;
  sequence_order: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  content: string;
  video_url?: string;
  video_required: boolean;
  sequence_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  instructors: string[];
  sequence_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: string;
  completion_percentage: number;
  started_at?: string;
  completed_at?: string;
  last_video_position?: number;
  attempts: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: Omit<Role, 'id' | 'created_at'>;
        Update: Partial<Omit<Role, 'id' | 'created_at'>>;
      };
      chat_rooms: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          name: string;
          description: string;
          created_by?: string | null;
        };
        Update: Partial<{
          name: string;
          description: string;
          created_by: string | null;
        }>;
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          created_at: string;
          users?: {
            id: string;
            first_name: string;
            last_name: string;
            avatar_url: string | null;
          };
        };
        Insert: {
          room_id: string;
          user_id: string;
          content: string;
        };
        Update: Partial<{
          room_id: string;
          user_id: string;
          content: string;
        }>;
      };
    };
  }
}
