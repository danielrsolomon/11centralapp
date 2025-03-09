'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Inbox, Bell, Users, MessageSquare, Search, PlusCircle, Filter, Star, File, Paperclip } from 'lucide-react'

// Type definitions
interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  isSending?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  members: string[];
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  type: 'direct' | 'group' | 'announcement';
}

export default function CentralConnect() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inbox')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const supabase = createClient()

  // Sample data until we connect to the database
  useEffect(() => {
    // Simulate API loading
    setTimeout(() => {
      setConversations([
        { 
          id: '1', 
          title: 'Schedule Updates - March 2023', 
          members: ['John Doe', 'Jane Smith', 'Alex Johnson'],
          lastMessage: 'New schedule has been posted for March 15-31',
          lastMessageTime: '2h ago',
          unread: true,
          type: 'announcement'
        },
        { 
          id: '2', 
          title: 'Shift Swap Request', 
          members: ['Sarah Williams'],
          lastMessage: "I can cover your shift on Friday if you're still looking",
          lastMessageTime: '4h ago',
          unread: true,
          type: 'direct'
        },
        { 
          id: '3', 
          title: 'Bartenders Group', 
          members: ['John Doe', 'Alex Johnson', 'Mike Taylor', '+3 more'],
          lastMessage: "Don't forget about the new cocktail training tomorrow",
          lastMessageTime: 'Yesterday',
          unread: false,
          type: 'group'
        },
        { 
          id: '4', 
          title: 'Pre-shift Notes - Feb 28', 
          members: ['Jane Smith'],
          lastMessage: 'Please review the attached notes before your shift',
          lastMessageTime: '3d ago',
          unread: false,
          type: 'announcement'
        }
      ])
      setIsLoading(false)
    }, 1000)
  }, [])

  // Load conversation messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // This would be a real API call in production
      setMessages([
        {
          id: '1',
          sender: 'John Doe',
          content: 'Hello team, I\'ve posted the new schedule for March 15-31.',
          timestamp: '2023-03-01T10:30:00',
          attachments: [
            { id: '1', name: 'March_Schedule.pdf', type: 'pdf', size: '1.2 MB' }
          ]
        },
        {
          id: '2',
          sender: 'Jane Smith',
          content: 'Thanks John! I noticed I\'m scheduled for both Friday and Saturday night. Is that correct?',
          timestamp: '2023-03-01T10:45:00'
        },
        {
          id: '3',
          sender: 'John Doe',
          content: 'Yes, that\'s correct. We\'re expecting a busy weekend with the music festival in town.',
          timestamp: '2023-03-01T11:00:00'
        }
      ])
    }
  }, [selectedConversation])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    // In production, this would send to the API
    const message: Message = {
      id: `temp-${Date.now()}`,
      sender: 'You',
      content: newMessage,
      timestamp: new Date().toISOString(),
      isSending: true
    }

    setMessages([...messages, message])
    setNewMessage('')

    // Simulate message sending
    setTimeout(() => {
      setMessages(messages => 
        messages.map(m => 
          m.id === message.id ? {...m, isSending: false} : m
        )
      )
    }, 1000)
  }

  const renderConversationList = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-8 h-8 border-t-2 border-b-2 border-[#AE9773] rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Loading conversations...</p>
        </div>
      )
    }

    return (
      <div className="overflow-y-auto">
        {conversations.map(conversation => (
          <div 
            key={conversation.id}
            className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${selectedConversation?.id === conversation.id ? 'bg-gray-100' : ''} ${conversation.unread ? 'font-semibold' : ''}`}
            onClick={() => setSelectedConversation(conversation)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {conversation.type === 'announcement' && <Bell className="h-5 w-5 text-[#AE9773] mr-2" />}
                {conversation.type === 'direct' && <MessageSquare className="h-5 w-5 text-[#AE9773] mr-2" />}
                {conversation.type === 'group' && <Users className="h-5 w-5 text-[#AE9773] mr-2" />}
                <span className="text-base font-semibold text-gray-900">{conversation.title}</span>
              </div>
              <span className="text-xs font-medium text-gray-600">{conversation.lastMessageTime}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1 truncate">{conversation.lastMessage}</p>
            <div className="flex items-center mt-2">
              <div className="text-xs text-gray-600 font-medium">{conversation.members.slice(0, 1).join(', ')}{conversation.members.length > 1 ? ` + ${conversation.members.length - 1} more` : ''}</div>
              {conversation.unread && (
                <div className="ml-auto w-3 h-3 rounded-full bg-[#AE9773]"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderMessageContent = () => {
    if (!selectedConversation) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Inbox className="h-12 w-12 mb-4" />
          <p>Select a conversation to view messages</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        {/* Conversation Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{selectedConversation.title}</h2>
            <p className="text-sm text-gray-600 font-medium">{selectedConversation.members.join(', ')}</p>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-200">
              <Search className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-200">
              <Star className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg p-3 ${
                message.sender === 'You' 
                  ? 'bg-[#AE9773] text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">{message.sender}</span>
                  <span className={`text-xs ${message.sender === 'You' ? 'text-white opacity-90' : 'text-gray-600'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="mt-1 text-base">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    {message.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center p-2 bg-gray-50 rounded mt-1">
                        <File className="h-4 w-4 mr-2" />
                        <span className="text-sm flex-grow truncate">{attachment.name}</span>
                        <span className="text-xs text-gray-500">{attachment.size}</span>
                      </div>
                    ))}
                  </div>
                )}
                {message.isSending && (
                  <div className="text-xs mt-1">Sending...</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center">
            <button type="button" className="p-2 text-gray-600 hover:text-[#AE9773]">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-400 rounded-md px-3 py-2 ml-2 focus:ring-[#AE9773] focus:border-[#AE9773] outline-none text-gray-900 font-medium placeholder:text-gray-500"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className={`ml-2 px-4 py-2 rounded-md ${!newMessage.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#AE9773] hover:bg-[#8E795D] text-white'}`}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Tabs data
  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox className="h-5 w-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
    { id: 'direct', label: 'Direct Messages', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'groups', label: 'Groups', icon: <Users className="h-5 w-5" /> }
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">11Central Connect</h1>
            <button 
              onClick={() => setShowNewConversationModal(true)}
              className="flex items-center px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-opacity-90"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              New Message
            </button>
          </div>
          <div className="flex mt-6 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-[#AE9773] text-[#AE9773] font-bold'
                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-4 py-4 h-full">
          <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search messages..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-800 sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <button className="text-sm text-gray-700 flex items-center font-medium">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </button>
                  <button className="text-sm text-[#AE9773] font-medium">Mark all as read</button>
                </div>
              </div>
              {renderConversationList()}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
              {renderMessageContent()}
            </div>
          </div>
        </div>
      </div>

      {/* New Conversation Modal - to be implemented */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">New Message</h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Recipients</label>
              <input 
                type="text" 
                placeholder="Search for users or groups..." 
                className="w-full p-2 border border-gray-400 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium placeholder:text-gray-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Subject</label>
              <input 
                type="text" 
                placeholder="Add a subject..." 
                className="w-full p-2 border border-gray-400 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium placeholder:text-gray-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Message</label>
              <textarea 
                placeholder="Type your message..." 
                className="w-full p-2 border border-gray-400 rounded-md h-32 focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium placeholder:text-gray-500"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowNewConversationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-opacity-90">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 