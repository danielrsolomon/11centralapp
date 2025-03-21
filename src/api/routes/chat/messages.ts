import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const roomIdSchema = z.object({
  roomId: z.string().uuid('Invalid room ID format')
});

const messageIdSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format')
});

const createMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  parent_id: z.string().uuid('Invalid parent message ID').optional(),
  mentions: z.array(z.string().uuid('Invalid user ID')).optional(),
  is_announcement: z.boolean().default(false)
});

const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters')
});

/**
 * @route GET /api/chat/rooms/:roomId/messages
 * @desc Get messages for a chat room, with optional pagination
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.get('/:roomId/messages',
  requireAuth,
  validateParams(roomIdSchema),
  validateQuery(z.object({
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a positive number').optional(),
    since: z.string().datetime('Invalid ISO datetime format').optional()
  }).partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const since = req.query.since as string | undefined;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if user is a member of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('id')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .single();
      
      if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership) {
        next(new ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
        return;
      }
      
      // Build the query for messages
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_id(id, first_name, last_name, avatar_url),
          parent:parent_id(id, content, created_at)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      // Add filter for messages since a specific time
      if (since) {
        query = query.gte('created_at', since);
      }
      
      const { data: messages, error, count } = await query;
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Get the total count of messages
      const { count: totalCount, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);
      
      if (countError) {
        console.error('Error fetching message count:', countError);
      }
      
      res.json({
        success: true,
        data: {
          messages: messages || [],
          pagination: {
            offset,
            limit,
            total: totalCount || 0,
            has_more: (offset + limit) < (totalCount || 0)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/chat/rooms/:roomId/messages
 * @desc Send a message to a chat room
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.post('/:roomId/messages',
  requireAuth,
  validateParams(roomIdSchema),
  validateBody(createMessageSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const messageData = req.body;
      const mentions = messageData.mentions || [];
      delete messageData.mentions;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if user is a member of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('id')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .single();
      
      if (membershipError && membershipError.code !== 'PGRST116') {
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership) {
        next(new ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
        return;
      }
      
      // If it's an announcement, check if user is an admin
      if (messageData.is_announcement) {
        const { data: adminCheck, error: adminError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', userId)
          .eq('room_id', roomId)
          .eq('is_admin', true)
          .single();
        
        if (adminError || !adminCheck) {
          next(new ApiError('Only room admins can send announcements', 403, 'NOT_ROOM_ADMIN'));
          return;
        }
      }
      
      // If parent_id is provided, check if it exists and is in this room
      if (messageData.parent_id) {
        const { data: parentMessage, error: parentError } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('id', messageData.parent_id)
          .eq('room_id', roomId)
          .single();
        
        if (parentError || !parentMessage) {
          next(new ApiError('Parent message not found in this room', 404, 'PARENT_NOT_FOUND'));
          return;
        }
      }
      
      // Send the message
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          content: messageData.content,
          parent_id: messageData.parent_id,
          is_announcement: messageData.is_announcement,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (messageError) {
        next(new ApiError(messageError.message, 400, messageError.code));
        return;
      }
      
      // Process mentions if any
      if (mentions.length > 0) {
        const mentionEntries = mentions.map((mentionedUserId: string) => ({
          message_id: message.id,
          user_id: mentionedUserId,
          created_at: new Date().toISOString()
        }));
        
        const { error: mentionError } = await supabase
          .from('chat_mentions')
          .insert(mentionEntries);
        
        if (mentionError) {
          console.error('Error adding mentions:', mentionError);
          // Continue even if mentions fail
        }
      }
      
      // Update room's last_message timestamp
      await supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', roomId);
      
      // Get the full message data to return
      const { data: fullMessage, error: fullMessageError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_id(id, first_name, last_name, avatar_url),
          parent:parent_id(id, content, created_at)
        `)
        .eq('id', message.id)
        .single();
      
      if (fullMessageError) {
        // Fall back to the original message if there's an error
        res.status(201).json({
          success: true,
          data: message
        });
        return;
      }
      
      res.status(201).json({
        success: true,
        data: fullMessage
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/chat/messages/:messageId
 * @desc Edit a message
 * @access Authenticated, Message Author
 */
// @ts-ignore: Express router type compatibility
router.put('/:messageId',
  requireAuth,
  validateParams(messageIdSchema),
  validateBody(updateMessageSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;
      const { content } = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if message exists and user is the author
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .select('user_id, room_id, created_at')
        .eq('id', messageId)
        .single();
      
      if (messageError) {
        next(new ApiError(messageError.message, 400, messageError.code));
        return;
      }
      
      if (!message) {
        next(new ApiError('Message not found', 404, 'MESSAGE_NOT_FOUND'));
        return;
      }
      
      // Check if user is the author or an admin
      if (message.user_id !== userId) {
        // Check if user is an admin
        const { data: adminCheck, error: adminError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', userId)
          .eq('room_id', message.room_id)
          .eq('is_admin', true)
          .single();
        
        if (adminError || !adminCheck) {
          next(new ApiError('Only the author or room admin can edit a message', 403, 'NOT_AUTHORIZED'));
          return;
        }
      }
      
      // Check if the message is older than 24 hours (prevent editing old messages)
      const messageDate = new Date(message.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        next(new ApiError('Cannot edit messages older than 24 hours', 403, 'MESSAGE_TOO_OLD'));
        return;
      }
      
      // Update the message
      const { data: updatedMessage, error: updateError } = await supabase
        .from('chat_messages')
        .update({
          content,
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', messageId)
        .select()
        .single();
      
      if (updateError) {
        next(new ApiError(updateError.message, 400, updateError.code));
        return;
      }
      
      res.json({
        success: true,
        data: updatedMessage
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/chat/messages/:messageId
 * @desc Delete a message
 * @access Authenticated, Message Author or Room Admin
 */
// @ts-ignore: Express router type compatibility
router.delete('/:messageId',
  requireAuth,
  validateParams(messageIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if message exists and get room info
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .select('user_id, room_id')
        .eq('id', messageId)
        .single();
      
      if (messageError) {
        next(new ApiError(messageError.message, 400, messageError.code));
        return;
      }
      
      if (!message) {
        next(new ApiError('Message not found', 404, 'MESSAGE_NOT_FOUND'));
        return;
      }
      
      // Check if user is the author or an admin
      const isAuthor = message.user_id === userId;
      
      if (!isAuthor) {
        // Check if user is an admin of the room
        const { data: adminCheck, error: adminError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', userId)
          .eq('room_id', message.room_id)
          .eq('is_admin', true)
          .single();
        
        if (adminError || !adminCheck) {
          next(new ApiError('Only the author or room admin can delete a message', 403, 'NOT_AUTHORIZED'));
          return;
        }
      }
      
      // Delete mentions first
      await supabase
        .from('chat_mentions')
        .delete()
        .eq('message_id', messageId);
        
      // Delete reactions
      await supabase
        .from('chat_reactions')
        .delete()
        .eq('message_id', messageId);
      
      // Delete the message
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (deleteError) {
        next(new ApiError(deleteError.message, 400, deleteError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 