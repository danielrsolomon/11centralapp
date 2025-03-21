import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { ApiError } from '../../middleware/error-handler';
import { Response, NextFunction } from 'express';

const router = Router();

// Validation schemas
const messageIdSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format')
});

const reactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji too long')
});

/**
 * @route GET /api/chat/messages/:messageId/reactions
 * @desc Get all reactions for a message
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.get('/:messageId/reactions',
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
      
      // First, get the message to check if it exists and get the room_id
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .select('room_id')
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
      
      // Check if user is a member of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('id')
        .eq('user_id', userId)
        .eq('room_id', message.room_id)
        .single();
      
      if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership) {
        next(new ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
        return;
      }
      
      // Get reactions
      const { data: reactions, error: reactionsError } = await supabase
        .from('chat_reactions')
        .select(`
          emoji,
          created_at,
          user:user_id(id, first_name, last_name, avatar_url)
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });
      
      if (reactionsError) {
        next(new ApiError(reactionsError.message, 400, reactionsError.code));
        return;
      }
      
      // Group reactions by emoji
      const groupedReactions: Record<string, any[]> = {};
      
      reactions?.forEach(reaction => {
        if (!groupedReactions[reaction.emoji]) {
          groupedReactions[reaction.emoji] = [];
        }
        groupedReactions[reaction.emoji].push(reaction.user);
      });
      
      // Format the response
      const formattedReactions = Object.entries(groupedReactions).map(([emoji, users]) => ({
        emoji,
        count: users.length,
        users
      }));
      
      res.json({
        success: true,
        data: formattedReactions
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/chat/messages/:messageId/reactions
 * @desc Add a reaction to a message
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.post('/:messageId/reactions',
  requireAuth,
  validateParams(messageIdSchema),
  validateBody(reactionSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;
      const { emoji } = req.body;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // First, get the message to check if it exists and get the room_id
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .select('room_id')
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
      
      // Check if user is a member of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('id')
        .eq('user_id', userId)
        .eq('room_id', message.room_id)
        .single();
      
      if (membershipError && membershipError.code !== 'PGRST116') {
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership) {
        next(new ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
        return;
      }
      
      // Check if the user already reacted with this emoji
      const { data: existingReaction, error: existingError } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .single();
      
      if (!existingError && existingReaction) {
        // User already reacted with this emoji, so we'll remove it (toggle behavior)
        const { error: deleteError } = await supabase
          .from('chat_reactions')
          .delete()
          .eq('id', existingReaction.id);
        
        if (deleteError) {
          next(new ApiError(deleteError.message, 400, deleteError.code));
          return;
        }
        
        res.json({
          success: true,
          message: 'Reaction removed',
          data: { removed: true, emoji }
        });
        return;
      }
      
      // Add the reaction
      const { data: reaction, error: reactionError } = await supabase
        .from('chat_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (reactionError) {
        next(new ApiError(reactionError.message, 400, reactionError.code));
        return;
      }
      
      res.status(201).json({
        success: true,
        data: reaction
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/chat/messages/:messageId/reactions/:emoji
 * @desc Remove a specific reaction from a message
 * @access Authenticated, Reaction Author
 */
// @ts-ignore: Express router type compatibility
router.delete('/:messageId/reactions/:emoji',
  requireAuth,
  validateParams(z.object({
    messageId: z.string().uuid('Invalid message ID'),
    emoji: z.string().min(1, 'Emoji is required')
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { messageId, emoji } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if the reaction exists
      const { data: existingReaction, error: existingError } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .single();
      
      if (existingError || !existingReaction) {
        next(new ApiError('Reaction not found', 404, 'REACTION_NOT_FOUND'));
        return;
      }
      
      // Delete the reaction
      const { error: deleteError } = await supabase
        .from('chat_reactions')
        .delete()
        .eq('id', existingReaction.id);
      
      if (deleteError) {
        next(new ApiError(deleteError.message, 400, deleteError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 