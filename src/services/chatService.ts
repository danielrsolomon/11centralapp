import { api } from './apiService';
import type { ChatRoom, ChatMessage } from '../types/database.types';

class ChatService {
  /**
   * Get all available chat rooms
   */
  async getChatRooms() {
    try {
      const { data, error, success } = await api.get<ChatRoom[]>('/chat/rooms');

      if (!success || error) {
        console.error('Error fetching chat rooms:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching chat rooms:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching chat rooms') 
      };
    }
  }

  /**
   * Get messages for a specific chat room
   */
  async getMessagesByRoomId(roomId: string, limit = 50) {
    try {
      const { data, error, success } = await api.get<ChatMessage[]>(
        `/chat/rooms/${roomId}/messages`, 
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!success || error) {
        console.error('Error fetching chat messages:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error fetching chat messages:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching chat messages') 
      };
    }
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(roomId: string, content: string) {
    try {
      const { data, error, success } = await api.post<ChatMessage>(
        '/chat/messages',
        { roomId, content }
      );

      if (!success || error) {
        console.error('Error sending message:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error sending message') 
      };
    }
  }

  /**
   * Create a new chat room
   */
  async createChatRoom(name: string, description: string) {
    try {
      const { data, error, success } = await api.post<ChatRoom>(
        '/chat/rooms',
        { name, description }
      );

      if (!success || error) {
        console.error('Error creating chat room:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error creating chat room:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error creating chat room') 
      };
    }
  }
}

export const chatService = new ChatService(); 