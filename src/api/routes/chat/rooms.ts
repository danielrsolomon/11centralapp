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

const createRoomSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters').optional(),
  is_private: z.boolean().default(false),
  members: z.array(z.string().uuid('Invalid user ID')).optional()
});

const updateRoomSchema = createRoomSchema.partial();

/**
 * @route GET /api/chat/rooms
 * @desc Get all chat rooms the user is a member of
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Get all rooms where user is a member
      const { data: rooms, error } = await supabase
        .from('chat_room_members')
        .select(`
          room:chat_rooms(
            id, 
            name, 
            description, 
            is_private, 
            created_at, 
            updated_at,
            created_by
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { foreignTable: 'chat_rooms', ascending: false });
      
      if (error) {
        next(new ApiError(error.message, 400, error.code));
        return;
      }
      
      // Clean up the nested structure to return a simple array of rooms
      const formattedRooms = rooms?.map(item => item.room) || [];
      
      res.json({
        success: true,
        data: formattedRooms
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/chat/rooms/:roomId
 * @desc Get chat room details with members
 * @access Authenticated, Room Member
 */
// @ts-ignore: Express router type compatibility
router.get('/:roomId',
  requireAuth,
  validateParams(roomIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      
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
      
      // Get room details
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomError) {
        next(new ApiError(roomError.message, 400, roomError.code));
        return;
      }
      
      if (!room) {
        next(new ApiError('Room not found', 404, 'ROOM_NOT_FOUND'));
        return;
      }
      
      // Get room members
      const { data: members, error: membersError } = await supabase
        .from('chat_room_members')
        .select(`
          user_id,
          joined_at,
          is_admin,
          users:user_id(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('room_id', roomId);
      
      if (membersError) {
        next(new ApiError(membersError.message, 400, membersError.code));
        return;
      }
      
      // Format response data
      const formattedMembers = members?.map(item => ({
        user_id: item.user_id,
        joined_at: item.joined_at,
        is_admin: item.is_admin,
        user: item.users
      })) || [];
      
      res.json({
        success: true,
        data: {
          ...room,
          members: formattedMembers
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/chat/rooms
 * @desc Create a new chat room
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/',
  requireAuth,
  validateBody(createRoomSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const roomData = req.body;
      const members = roomData.members || [];
      delete roomData.members;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          ...roomData,
          created_by: userId
        })
        .select()
        .single();
      
      if (roomError) {
        next(new ApiError(roomError.message, 400, roomError.code));
        return;
      }
      
      // Add creator as admin member
      const { error: creatorMemberError } = await supabase
        .from('chat_room_members')
        .insert({
          room_id: room.id,
          user_id: userId,
          is_admin: true,
          joined_at: new Date().toISOString()
        });
      
      if (creatorMemberError) {
        next(new ApiError(creatorMemberError.message, 400, creatorMemberError.code));
        return;
      }
      
      // Add other members if provided
      if (members.length > 0) {
        // Add the members to the room
        const memberEntries = members.map((memberId: string) => ({
          room_id: room.id,
          user_id: memberId,
          is_admin: false,
          joined_at: new Date().toISOString()
        }));
        
        const { error: membersError } = await supabase
          .from('chat_room_members')
          .insert(memberEntries);
        
        if (membersError) {
          console.error('Error adding members:', membersError);
          // Continue even if there's an error adding members
        }
      }
      
      res.status(201).json({
        success: true,
        data: room
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/chat/rooms/:roomId
 * @desc Update a chat room
 * @access Authenticated, Room Admin
 */
// @ts-ignore: Express router type compatibility
router.put('/:roomId',
  requireAuth,
  validateParams(roomIdSchema),
  validateBody(updateRoomSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      const roomData = req.body;
      const members = roomData.members;
      delete roomData.members;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if user is an admin of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('is_admin')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .single();
      
      if (membershipError) {
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership || !membership.is_admin) {
        next(new ApiError('Only room admins can update the room', 403, 'NOT_ROOM_ADMIN'));
        return;
      }
      
      // Update the room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .update(roomData)
        .eq('id', roomId)
        .select()
        .single();
      
      if (roomError) {
        next(new ApiError(roomError.message, 400, roomError.code));
        return;
      }
      
      // If members are provided, update the room members
      if (members && members.length > 0) {
        // First, get current members except the admin (we don't want to remove the admin)
        const { data: currentMembers, error: currMembersError } = await supabase
          .from('chat_room_members')
          .select('user_id, is_admin')
          .eq('room_id', roomId);
        
        if (currMembersError) {
          next(new ApiError(currMembersError.message, 400, currMembersError.code));
          return;
        }
        
        // Identify members to remove (current non-admin members not in the new members list)
        const currentMemberIds = currentMembers?.map(m => m.user_id) || [];
        const admins = currentMembers?.filter(m => m.is_admin).map(m => m.user_id) || [];
        const membersToRemove = currentMemberIds.filter(id => 
          !admins.includes(id) && !members.includes(id)
        );
        
        // Identify new members to add
        const membersToAdd = members.filter((id: string) => !currentMemberIds.includes(id));
        
        // Remove members no longer needed
        if (membersToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('chat_room_members')
            .delete()
            .eq('room_id', roomId)
            .in('user_id', membersToRemove);
          
          if (removeError) {
            console.error('Error removing members:', removeError);
          }
        }
        
        // Add new members
        if (membersToAdd.length > 0) {
          const newMemberEntries = membersToAdd.map((memberId: string) => ({
            room_id: roomId,
            user_id: memberId,
            is_admin: false,
            joined_at: new Date().toISOString()
          }));
          
          const { error: addError } = await supabase
            .from('chat_room_members')
            .insert(newMemberEntries);
          
          if (addError) {
            console.error('Error adding new members:', addError);
          }
        }
      }
      
      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/chat/rooms/:roomId
 * @desc Delete a chat room
 * @access Authenticated, Room Admin or Creator
 */
// @ts-ignore: Express router type compatibility
router.delete('/:roomId',
  requireAuth,
  validateParams(roomIdSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { roomId } = req.params;
      
      if (!userId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if room exists and user is creator or admin
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('created_by')
        .eq('id', roomId)
        .single();
      
      if (roomError) {
        next(new ApiError(roomError.message, 400, roomError.code));
        return;
      }
      
      const isCreator = room.created_by === userId;
      
      if (!isCreator) {
        // Check if user is an admin
        const { data: membership, error: membershipError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', userId)
          .eq('room_id', roomId)
          .single();
        
        if (membershipError || !membership || !membership.is_admin) {
          next(new ApiError('Only room creator or admin can delete the room', 403, 'NOT_AUTHORIZED_TO_DELETE'));
          return;
        }
      }
      
      // Delete all messages in the room
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
      }
      
      // Delete all room members
      const { error: membersError } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', roomId);
      
      if (membersError) {
        console.error('Error deleting members:', membersError);
      }
      
      // Delete the room
      const { error: deleteError } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);
      
      if (deleteError) {
        next(new ApiError(deleteError.message, 400, deleteError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Room deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/chat/rooms/:roomId/members
 * @desc Add a member to a chat room
 * @access Authenticated, Room Admin
 */
// @ts-ignore: Express router type compatibility
router.post('/:roomId/members',
  requireAuth,
  validateParams(roomIdSchema),
  validateBody(z.object({
    user_id: z.string().uuid('Invalid user ID'),
    is_admin: z.boolean().default(false)
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const { roomId } = req.params;
      const { user_id: newMemberId, is_admin } = req.body;
      
      if (!currentUserId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      // Check if current user is an admin of the room
      const { data: membership, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('is_admin')
        .eq('user_id', currentUserId)
        .eq('room_id', roomId)
        .single();
      
      if (membershipError) {
        next(new ApiError(membershipError.message, 400, membershipError.code));
        return;
      }
      
      if (!membership || !membership.is_admin) {
        next(new ApiError('Only room admins can add members', 403, 'NOT_ROOM_ADMIN'));
        return;
      }
      
      // Check if user to add exists
      const { data: userToAdd, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', newMemberId)
        .single();
      
      if (userError || !userToAdd) {
        next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
        return;
      }
      
      // Check if user is already a member
      const { data: existingMember, error: existingError } = await supabase
        .from('chat_room_members')
        .select('id')
        .eq('user_id', newMemberId)
        .eq('room_id', roomId)
        .single();
      
      if (!existingError && existingMember) {
        next(new ApiError('User is already a member of this room', 400, 'ALREADY_MEMBER'));
        return;
      }
      
      // Add member to room
      const { data: newMember, error: addError } = await supabase
        .from('chat_room_members')
        .insert({
          room_id: roomId,
          user_id: newMemberId,
          is_admin,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (addError) {
        next(new ApiError(addError.message, 400, addError.code));
        return;
      }
      
      res.status(201).json({
        success: true,
        data: newMember
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/chat/rooms/:roomId/members/:userId
 * @desc Remove a member from a chat room
 * @access Authenticated, Room Admin or Self-removal
 */
// @ts-ignore: Express router type compatibility
router.delete('/:roomId/members/:userId',
  requireAuth,
  validateParams(z.object({
    roomId: z.string().uuid('Invalid room ID'),
    userId: z.string().uuid('Invalid user ID')
  })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const { roomId, userId: memberIdToRemove } = req.params;
      
      if (!currentUserId) {
        next(new ApiError('User ID is required', 400, 'USER_REQUIRED'));
        return;
      }
      
      const isSelfRemoval = currentUserId === memberIdToRemove;
      
      if (!isSelfRemoval) {
        // Check if current user is an admin of the room
        const { data: membership, error: membershipError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', currentUserId)
          .eq('room_id', roomId)
          .single();
        
        if (membershipError) {
          next(new ApiError(membershipError.message, 400, membershipError.code));
          return;
        }
        
        if (!membership || !membership.is_admin) {
          next(new ApiError('Only room admins can remove other members', 403, 'NOT_ROOM_ADMIN'));
          return;
        }
        
        // Check if the member to remove is also an admin (admins can only be removed by the creator)
        const { data: memberToRemove, error: memberError } = await supabase
          .from('chat_room_members')
          .select('is_admin')
          .eq('user_id', memberIdToRemove)
          .eq('room_id', roomId)
          .single();
        
        if (!memberError && memberToRemove && memberToRemove.is_admin) {
          // Get the room creator
          const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('created_by')
            .eq('id', roomId)
            .single();
          
          if (!roomError && room && room.created_by !== currentUserId) {
            next(new ApiError('Only the room creator can remove admin members', 403, 'NOT_ROOM_CREATOR'));
            return;
          }
        }
      }
      
      // Remove the member
      const { error: removeError } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('user_id', memberIdToRemove)
        .eq('room_id', roomId);
      
      if (removeError) {
        next(new ApiError(removeError.message, 400, removeError.code));
        return;
      }
      
      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 