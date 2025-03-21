import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useRealtimeCollection } from '../../hooks/useSupabaseRealtime';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useChatMessages } from '../../hooks/useChat';
import type { ChatMessage as ChatMessageType } from '../../types/database.types';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
}

/**
 * A real-time chat room component
 */
const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, roomName }) => {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading: chatMessagesLoading, error: chatMessagesError, sendMessage, isSending } = useChatMessages(roomId);
  
  // Get real-time chat messages
  const { 
    items: realtimeMessages,
    isLoading: realtimeMessagesLoading,
    error: realtimeMessagesError 
  } = useRealtimeCollection<ChatMessageType>(
    'chat_messages',
    () => chatService.getMessagesByRoomId(roomId),
    {
      filter: `room_id=eq.${roomId}`,
      dependencyList: [roomId]
    }
  );
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a new message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    // Send the message
    sendMessage({ content: messageText } as any);
    setMessageText('');
  };
  
  // Render a chat message
  const renderMessage = (msg: ChatMessageType) => {
    const isCurrentUser = user?.id === msg.user_id;
    
    return (
      <div 
        key={msg.id} 
        className={`d-flex mb-3 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`}
      >
        <div 
          className={`chat-message p-3 rounded ${isCurrentUser ? 'bg-primary text-white' : 'bg-light'}`} 
          style={{ maxWidth: '75%' }}
        >
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small className="fw-bold">
              {msg.users?.first_name} {msg.users?.last_name}
            </small>
            <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>
              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
            </small>
          </div>
          <div>{msg.content}</div>
        </div>
      </div>
    );
  };
  
  if (realtimeMessagesLoading) {
    return <div className="loading">Loading messages...</div>;
  }
  
  if (realtimeMessagesError) {
    return <div className="error">Error: {realtimeMessagesError.message}</div>;
  }
  
  return (
    <Card className="chat-room">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{roomName}</h5>
        <span className="badge bg-success">Live</span>
      </Card.Header>
      
      <Card.Body className="p-0">
        <div className="chat-messages p-3" style={{ height: '400px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div className="empty-messages">No messages yet. Be the first to say hello!</div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card.Body>
      
      <Card.Footer className="p-3">
        {sendError && (
          <Alert variant="danger" dismissible onClose={() => setSendError(null)}>
            {sendError}
          </Alert>
        )}
        
        <form onSubmit={handleSendMessage} className="message-form">
          <div className="d-flex">
            <Form.Control
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="ms-2"
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? <Spinner animation="border" size="sm" /> : 'Send'}
            </Button>
          </div>
          
          {!user && (
            <p className="text-danger mt-2 mb-0 small">
              You must be logged in to send messages
            </p>
          )}
        </form>
      </Card.Footer>
    </Card>
  );
};

export default ChatRoom; 