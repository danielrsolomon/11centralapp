import { MCPTool } from '../types';
import { chatService } from '../../services/chatService';

// Helper function to format data
const formatData = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    return `[Unserializable data: ${error.message}]`;
  }
};

// Chat rooms
export const getChatRooms: MCPTool = {
  name: 'getChatRooms',
  description: 'Get all available chat rooms',
  handler: async () => {
    try {
      const { data, error } = await chatService.getChatRooms();
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error fetching chat rooms: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

export const createChatRoom: MCPTool = {
  name: 'createChatRoom',
  description: 'Create a new chat room',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' }
    },
    required: ['name', 'description']
  },
  handler: async (args) => {
    try {
      const { name, description } = args;
      
      const { data, error } = await chatService.createChatRoom({
        name,
        description
      });
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully created chat room "${name}":\n${formatData(data)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error creating chat room: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

// Chat messages
export const getChatMessages: MCPTool = {
  name: 'getChatMessages',
  description: 'Get messages from a chat room',
  inputSchema: {
    type: 'object',
    properties: {
      roomId: { type: 'string' },
      limit: { type: 'number' }
    },
    required: ['roomId']
  },
  handler: async (args) => {
    try {
      const { roomId, limit = 50 } = args;
      
      const { data, error } = await chatService.getMessagesByRoomId(roomId, limit);
      
      if (error) throw error;
      
      return {
        content: [{ type: 'text', text: formatData(data) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error fetching chat messages: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

export const sendChatMessage: MCPTool = {
  name: 'sendChatMessage',
  description: 'Send a message to a chat room',
  inputSchema: {
    type: 'object',
    properties: {
      roomId: { type: 'string' },
      userId: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['roomId', 'userId', 'content']
  },
  handler: async (args) => {
    try {
      const { roomId, userId, content } = args;
      
      const messageData = {
        room_id: roomId,
        user_id: userId,
        content
      };
      
      const { data, error } = await chatService.sendMessage(messageData);
      
      if (error) throw error;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully sent message to room ${roomId}:\n${formatData(data)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error sending message: ${error.message || 'Unknown error'}` }],
        isError: true
      };
    }
  }
};

// Export all chat tools
export const chatTools = [
  getChatRooms,
  createChatRoom,
  getChatMessages,
  sendChatMessage
]; 