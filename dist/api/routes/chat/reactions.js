"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const router = (0, express_1.Router)();
// Validation schemas
const messageIdSchema = zod_1.z.object({
    messageId: zod_1.z.string().uuid('Invalid message ID format')
});
const reactionSchema = zod_1.z.object({
    emoji: zod_1.z.string().min(1, 'Emoji is required').max(10, 'Emoji too long')
});
/**
 * @route GET /api/chat/messages/:messageId/reactions
 * @desc Get all reactions for a message
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.get('/:messageId/reactions', auth_1.requireAuth, (0, validation_1.validateParams)(messageIdSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { messageId } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // First, get the message to check if it exists and get the room_id
        const { data: message, error: messageError } = await supabase_1.supabase
            .from('chat_messages')
            .select('room_id')
            .eq('id', messageId)
            .single();
        if (messageError) {
            next(new error_handler_1.ApiError(messageError.message, 400, messageError.code));
            return;
        }
        if (!message) {
            next(new error_handler_1.ApiError('Message not found', 404, 'MESSAGE_NOT_FOUND'));
            return;
        }
        // Check if user is a member of the room
        const { data: membership, error: membershipError } = await supabase_1.supabase
            .from('chat_room_members')
            .select('id')
            .eq('user_id', userId)
            .eq('room_id', message.room_id)
            .single();
        if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
            next(new error_handler_1.ApiError(membershipError.message, 400, membershipError.code));
            return;
        }
        if (!membership) {
            next(new error_handler_1.ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
            return;
        }
        // Get reactions
        const { data: reactions, error: reactionsError } = await supabase_1.supabase
            .from('chat_reactions')
            .select(`
          emoji,
          created_at,
          user:user_id(id, first_name, last_name, avatar_url)
        `)
            .eq('message_id', messageId)
            .order('created_at', { ascending: true });
        if (reactionsError) {
            next(new error_handler_1.ApiError(reactionsError.message, 400, reactionsError.code));
            return;
        }
        // Group reactions by emoji
        const groupedReactions = {};
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
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/chat/messages/:messageId/reactions
 * @desc Add a reaction to a message
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.post('/:messageId/reactions', auth_1.requireAuth, (0, validation_1.validateParams)(messageIdSchema), (0, validation_1.validateBody)(reactionSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { messageId } = req.params;
        const { emoji } = req.body;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // First, get the message to check if it exists and get the room_id
        const { data: message, error: messageError } = await supabase_1.supabase
            .from('chat_messages')
            .select('room_id')
            .eq('id', messageId)
            .single();
        if (messageError) {
            next(new error_handler_1.ApiError(messageError.message, 400, messageError.code));
            return;
        }
        if (!message) {
            next(new error_handler_1.ApiError('Message not found', 404, 'MESSAGE_NOT_FOUND'));
            return;
        }
        // Check if user is a member of the room
        const { data: membership, error: membershipError } = await supabase_1.supabase
            .from('chat_room_members')
            .select('id')
            .eq('user_id', userId)
            .eq('room_id', message.room_id)
            .single();
        if (membershipError && membershipError.code !== 'PGRST116') {
            next(new error_handler_1.ApiError(membershipError.message, 400, membershipError.code));
            return;
        }
        if (!membership) {
            next(new error_handler_1.ApiError('Access denied', 403, 'NOT_ROOM_MEMBER'));
            return;
        }
        // Check if the user already reacted with this emoji
        const { data: existingReaction, error: existingError } = await supabase_1.supabase
            .from('chat_reactions')
            .select('id')
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .single();
        if (!existingError && existingReaction) {
            // User already reacted with this emoji, so we'll remove it (toggle behavior)
            const { error: deleteError } = await supabase_1.supabase
                .from('chat_reactions')
                .delete()
                .eq('id', existingReaction.id);
            if (deleteError) {
                next(new error_handler_1.ApiError(deleteError.message, 400, deleteError.code));
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
        const { data: reaction, error: reactionError } = await supabase_1.supabase
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
            next(new error_handler_1.ApiError(reactionError.message, 400, reactionError.code));
            return;
        }
        res.status(201).json({
            success: true,
            data: reaction
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route DELETE /api/chat/messages/:messageId/reactions/:emoji
 * @desc Remove a specific reaction from a message
 * @access Authenticated, Reaction Author
 */
// @ts-ignore: Express router type compatibility
router.delete('/:messageId/reactions/:emoji', auth_1.requireAuth, (0, validation_1.validateParams)(zod_1.z.object({
    messageId: zod_1.z.string().uuid('Invalid message ID'),
    emoji: zod_1.z.string().min(1, 'Emoji is required')
})), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { messageId, emoji } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if the reaction exists
        const { data: existingReaction, error: existingError } = await supabase_1.supabase
            .from('chat_reactions')
            .select('id')
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .single();
        if (existingError || !existingReaction) {
            next(new error_handler_1.ApiError('Reaction not found', 404, 'REACTION_NOT_FOUND'));
            return;
        }
        // Delete the reaction
        const { error: deleteError } = await supabase_1.supabase
            .from('chat_reactions')
            .delete()
            .eq('id', existingReaction.id);
        if (deleteError) {
            next(new error_handler_1.ApiError(deleteError.message, 400, deleteError.code));
            return;
        }
        res.json({
            success: true,
            message: 'Reaction removed successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=reactions.js.map