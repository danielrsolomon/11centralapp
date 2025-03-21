import { useState, useEffect } from 'react';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabase';
import { chatService } from '../services/chatService';
import type { ChatMessage, ChatRoom } from '../types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export function useChatRooms() {
  return useSupabaseQuery<ChatRoom[]>(
    () => {
      return chatService.getChatRooms() as Promise<{
        data: ChatRoom[] | null;
        error: PostgrestError | null;
      }>;
    },
    []
  );
}

export function useChatMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Initial data fetch
  const { data, isLoading, error } = useSupabaseQuery<ChatMessage[]>(
    () => {
      return chatService.getMessagesByRoomId(roomId, 100) as Promise<{
        data: ChatMessage[] | null;
        error: PostgrestError | null;
      }>;
    },
    [roomId]
  );
  
  // Set initial messages when data loads
  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);
  
  // Subscribe to new messages
  useEffect(() => {
    if (!roomId) return;
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`chat_messages:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        // Add the new message to the state
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  
  // Send message function
  const { mutate: sendMessage, isLoading: isSending } = useSupabaseMutation<
    ChatMessage,
    { content: string }
  >((params) => {
    return chatService.sendMessage(roomId, params.content) as Promise<{
      data: ChatMessage | null;
      error: PostgrestError | null;
    }>;
  });
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    isSending
  };
}

export function useCreateChatRoom() {
  return useSupabaseMutation<
    ChatRoom,
    { name: string; description: string }
  >((params) => {
    return chatService.createChatRoom(params.name, params.description) as Promise<{
      data: ChatRoom | null;
      error: PostgrestError | null;
    }>;
  });
} 