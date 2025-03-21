import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatRoomList from '../../components/chat/ChatRoomList';
import ChatRoom from '../../components/chat/ChatRoom';
import { useChatRooms } from '../../hooks/useChat';
import type { ChatRoom as ChatRoomType } from '../../types/database.types';

export default function Chat() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const { data: chatRooms } = useChatRooms();
  
  useEffect(() => {
    if (roomId && chatRooms) {
      const room = chatRooms.find((r: ChatRoomType) => r.id === roomId);
      setSelectedRoom(room || null);
    } else {
      setSelectedRoom(null);
    }
  }, [roomId, chatRooms]);
  
  // If rooms exist but no room is selected, navigate to the first room
  useEffect(() => {
    if (!roomId && chatRooms && chatRooms.length > 0) {
      navigate(`/chat/${chatRooms[0].id}`);
    }
  }, [chatRooms, roomId, navigate]);
  
  return (
    <div className="chat-page">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <ChatRoomList />
          </div>
          <div className="col-md-8">
            {selectedRoom ? (
              <ChatRoom 
                roomId={selectedRoom.id} 
                roomName={selectedRoom.name} 
              />
            ) : (
              <div className="select-room-prompt">
                Please select a chat room
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 