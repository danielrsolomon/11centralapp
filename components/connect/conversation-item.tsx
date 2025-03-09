import { Bell, MessageSquare, Users } from 'lucide-react'
import { Conversation } from '@/lib/types'

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}

export default function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const { title, lastMessage, lastMessageTime, members, unread, type } = conversation

  return (
    <div 
      className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
        isSelected ? 'bg-gray-100' : ''
      } ${unread ? 'font-semibold' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          {type === 'announcement' && <Bell className="h-5 w-5 text-[#AE9773] mr-2" />}
          {type === 'direct' && <MessageSquare className="h-5 w-5 text-[#AE9773] mr-2" />}
          {type === 'group' && <Users className="h-5 w-5 text-[#AE9773] mr-2" />}
          <span className="text-base font-semibold text-gray-900">{title}</span>
        </div>
        <span className="text-xs font-medium text-gray-600">{lastMessageTime}</span>
      </div>
      <p className="text-sm text-gray-700 mt-1 truncate">{lastMessage}</p>
      <div className="flex items-center mt-2">
        <div className="text-xs text-gray-600">
          {members.slice(0, 1).join(', ')}
          {members.length > 1 ? ` + ${members.length - 1} more` : ''}
        </div>
        {unread && (
          <div className="ml-auto w-2 h-2 rounded-full bg-[#AE9773]"></div>
        )}
      </div>
    </div>
  )
} 