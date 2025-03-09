// Conversation and Message types for Central Connect

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  isSending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  members: string[];
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  type: 'direct' | 'group' | 'announcement';
}

export interface ConversationMember {
  id: string;
  userId: string;
  conversationId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  muted: boolean;
  notificationPreferences: {
    email: boolean;
    app: boolean;
    text: boolean;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  avatarUrl?: string;
} 