import { createClient } from '@/lib/supabase-client'
import { Conversation, Message, User } from '@/lib/types'

export class CentralConnectService {
  private supabase = createClient()

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: memberData, error: memberError } = await this.supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError
      
      const conversationIds = memberData.map(m => m.conversation_id)
      if (conversationIds.length === 0) return []

      const { data: conversations, error: convoError } = await this.supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })

      if (convoError) throw convoError

      // For each conversation, get the last message and members
      const enhancedConversations = await Promise.all(
        conversations.map(async (convo) => {
          // Get last message
          const { data: messages } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)

          // Get conversation members
          const { data: membersData } = await this.supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', convo.id)

          const memberIds = membersData?.map(m => m.user_id) || []
          
          // Get user details for members
          const { data: usersData } = await this.supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', memberIds)

          const members = usersData?.map(u => `${u.first_name} ${u.last_name}`) || []
          const lastMessage = messages && messages.length > 0 ? messages[0] : null

          // For the current user, check if they've read the last message
          const unread = lastMessage ? 
            (!lastMessage.read_status || !lastMessage.read_status[user.id]) && 
            lastMessage.sender_id !== user.id : 
            false

          return {
            id: convo.id,
            title: convo.title || 'New Conversation',
            members,
            lastMessage: lastMessage ? lastMessage.content.substring(0, 100) : 'No messages yet',
            lastMessageTime: lastMessage ? 
              this.formatMessageDate(new Date(lastMessage.created_at)) : 
              this.formatMessageDate(new Date(convo.created_at)),
            unread,
            type: convo.conversation_type
          } as Conversation
        })
      )

      return enhancedConversations
    } catch (error) {
      console.error('Error getting conversations:', error)
      return []
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user is a member of this conversation
      const { data: memberData, error: memberError } = await this.supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !memberData) throw new Error('Not a member of this conversation')

      // Get messages
      const { data: messagesData, error: messagesError } = await this.supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          is_system_message,
          users:sender_id (first_name, last_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      // Get attachments for messages
      const messageIds = messagesData.map(m => m.id)
      const { data: attachmentsData } = await this.supabase
        .from('attachments')
        .select('*')
        .in('message_id', messageIds)

      // Mark messages as read
      await this.markMessagesAsRead(conversationId, user.id)

      // Format messages for the UI
      const messages = messagesData.map(message => {
        const messageAttachments = attachmentsData
          ?.filter(a => a.message_id === message.id)
          .map(a => ({
            id: a.id,
            name: a.file_name,
            type: a.file_type,
            size: this.formatFileSize(a.file_size)
          })) || []

        return {
          id: message.id,
          sender: message.is_system_message ? 'System' : 
            `${message.users.first_name} ${message.users.last_name}`,
          content: message.content,
          timestamp: message.created_at,
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined
        } as Message
      })

      return messages
    } catch (error) {
      console.error('Error getting messages:', error)
      return []
    }
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(conversationId: string, content: string): Promise<Message | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user is a member of this conversation
      const { data: memberData, error: memberError } = await this.supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !memberData) throw new Error('Not a member of this conversation')

      // Create a read status object where all members except sender have not read the message
      const { data: allMembers } = await this.supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)

      const readStatus = {}
      allMembers?.forEach(member => {
        readStatus[member.user_id] = member.user_id === user.id
      })

      // Send the message
      const { data: messageData, error: messageError } = await this.supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: user.id,
            content,
            read_status: readStatus
          }
        ])
        .select()
        .single()

      if (messageError) throw messageError

      // Update conversation's updated_at timestamp
      await this.supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Get the sender's name
      const { data: userData } = await this.supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      return {
        id: messageData.id,
        sender: `${userData?.first_name || ''} ${userData?.last_name || ''}`,
        content: messageData.content,
        timestamp: messageData.created_at
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return null
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    recipientIds: string[], 
    title: string,
    initialMessage: string
  ): Promise<{ conversation: Conversation | null, message: Message | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Determine conversation type
      const type = recipientIds.length > 1 ? 'group' : 'direct'

      // Create the conversation
      const { data: conversationData, error: conversationError } = await this.supabase
        .from('conversations')
        .insert([
          {
            title,
            conversation_type: type,
            created_by: user.id
          }
        ])
        .select()
        .single()

      if (conversationError) throw conversationError

      // Add the creator as a member
      await this.supabase
        .from('conversation_members')
        .insert([
          {
            conversation_id: conversationData.id,
            user_id: user.id,
            role: 'owner'
          }
        ])

      // Add all recipients as members
      const memberInserts = recipientIds.map(id => ({
        conversation_id: conversationData.id,
        user_id: id,
        role: 'member'
      }))

      await this.supabase
        .from('conversation_members')
        .insert(memberInserts)

      // Create read status object
      const readStatus = {}
      readStatus[user.id] = true
      recipientIds.forEach(id => {
        readStatus[id] = false
      })

      // Send the initial message
      const { data: messageData, error: messageError } = await this.supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationData.id,
            sender_id: user.id,
            content: initialMessage,
            read_status: readStatus
          }
        ])
        .select()
        .single()

      if (messageError) throw messageError

      // Get user details for all members
      const allMemberIds = [user.id, ...recipientIds]
      const { data: usersData } = await this.supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', allMemberIds)

      const memberNames = usersData?.map(u => `${u.first_name} ${u.last_name}`) || []
      const senderName = usersData?.find(u => u.id === user.id)
        ? `${usersData.find(u => u.id === user.id).first_name} ${usersData.find(u => u.id === user.id).last_name}`
        : 'You'

      const conversation: Conversation = {
        id: conversationData.id,
        title,
        members: memberNames,
        lastMessage: initialMessage,
        lastMessageTime: 'Just now',
        unread: false,
        type: type as any
      }

      const message: Message = {
        id: messageData.id,
        sender: senderName,
        content: initialMessage,
        timestamp: messageData.created_at
      }

      return { conversation, message }
    } catch (error) {
      console.error('Error creating conversation:', error)
      return { conversation: null, message: null }
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      // Get all unread messages in this conversation
      const { data: messages, error: messagesError } = await this.supabase
        .from('messages')
        .select('id, read_status')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)

      if (messagesError) throw messagesError
      if (!messages || messages.length === 0) return

      // Update each message that hasn't been read by this user
      for (const message of messages) {
        if (!message.read_status || !message.read_status[userId]) {
          const updatedReadStatus = { ...message.read_status, [userId]: true }
          await this.supabase
            .from('messages')
            .update({ read_status: updatedReadStatus })
            .eq('id', message.id)
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  /**
   * Get all users that can be messaged
   */
  async getUsers(): Promise<User[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .neq('id', user.id)

      if (usersError) throw usersError

      return usersData.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role
      }))
    } catch (error) {
      console.error('Error getting users:', error)
      return []
    }
  }

  /**
   * Format a date relative to current time (e.g. "2h ago", "Yesterday")
   */
  private formatMessageDate(date: Date): string {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000) // Difference in seconds

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 172800) return 'Yesterday'
    if (diff < 604800) {
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  /**
   * Format file size in a human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1073741824).toFixed(1)} GB`
  }
} 