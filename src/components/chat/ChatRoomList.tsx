import React from 'react';
import { useChatRooms } from '../../hooks/useChat';
import { Link } from 'react-router-dom';
import type { ChatRoom } from '../../types/database.types';

export default function ChatRoomList() {
  const { data: chatRooms, isLoading, error } = useChatRooms();
  
  if (isLoading) {
    return <div className="loading">Loading chat rooms...</div>;
  }
  
  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }
  
  if (!chatRooms || chatRooms.length === 0) {
    return <div className="empty-state">No chat rooms available</div>;
  }
  
  return (
    <div className="chat-room-list">
      <h2>Chat Rooms</h2>
      <div className="list-group">
        {chatRooms.map((room: ChatRoom) => (
          <Link 
            key={room.id} 
            to={`/chat/${room.id}`}
            className="list-group-item list-group-item-action"
          >
            <div className="d-flex w-100 justify-content-between">
              <h5 className="mb-1">{room.name}</h5>
            </div>
            <p className="mb-1">{room.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
} 