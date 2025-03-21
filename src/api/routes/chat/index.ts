import express from 'express';
import { supabaseAdmin } from '../../supabaseAdmin.js';
import { asyncHandler, sendSuccess, sendError } from '../../utils/route-helpers.js';
import { validateBody } from '../../middleware/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Schema for creating a new chat room
const createRoomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional()
});

// Schema for sending a message
const sendMessageSchema = z.object({
  roomId: z.string().uuid("Room ID must be a valid UUID"),
  content: z.string().min(1, "Message content is required")
});

/**
 * @route GET /api/chat/rooms
 * @description Get all available chat rooms
 * @access Private
 */
router.get('/rooms', 
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_rooms')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching chat rooms:', error);
        return sendError(res, error.message, error.code, 500);
      }

      return sendSuccess(res, data);
    } catch (err) {
      console.error('Unexpected error fetching chat rooms:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error fetching chat rooms',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route GET /api/chat/rooms/:roomId/messages
 * @description Get messages for a specific chat room
 * @access Private
 */
router.get('/rooms/:roomId/messages', 
  requireAuth,
  asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select(`
          *,
          users:user_id (id, first_name, last_name, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching chat messages:', error);
        return sendError(res, error.message, error.code, 500);
      }

      // Reverse to get oldest first
      return sendSuccess(res, data?.reverse() || []);
    } catch (err) {
      console.error('Unexpected error fetching chat messages:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error fetching chat messages',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/chat/messages
 * @description Send a message to a chat room
 * @access Private
 */
router.post('/messages', 
  requireAuth,
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { roomId, content } = req.body;
    const userId = req.user!.id;
    
    try {
      const message = {
        room_id: roomId,
        user_id: userId,
        content
      };
      
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert(message)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return sendError(res, error.message, error.code, 500);
      }

      return sendSuccess(res, data);
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error sending message',
        'SERVER_ERROR',
        500
      );
    }
  })
);

/**
 * @route POST /api/chat/rooms
 * @description Create a new chat room
 * @access Private
 */
router.post('/rooms', 
  requireAuth,
  validateBody(createRoomSchema),
  asyncHandler(async (req, res) => {
    const { name, description = '' } = req.body;
    const userId = req.user!.id;
    
    try {
      const chatRoom = {
        name,
        description,
        created_by: userId
      };
      
      const { data, error } = await supabaseAdmin
        .from('chat_rooms')
        .insert(chatRoom)
        .select()
        .single();

      if (error) {
        console.error('Error creating chat room:', error);
        return sendError(res, error.message, error.code, 500);
      }

      return sendSuccess(res, data);
    } catch (err) {
      console.error('Unexpected error creating chat room:', err);
      return sendError(
        res, 
        err instanceof Error ? err.message : 'Unknown error creating chat room',
        'SERVER_ERROR',
        500
      );
    }
  })
);

export default router; 