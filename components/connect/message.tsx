import { File } from 'lucide-react'
import { Message } from '@/lib/types'

interface MessageProps {
  message: Message
  isOwnMessage: boolean
}

export default function MessageComponent({ message, isOwnMessage }: MessageProps) {
  const { sender, content, timestamp, attachments, isSending } = message

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[75%] rounded-lg p-3 ${
          isOwnMessage ? 'bg-[#AE9773] text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        <div className="flex justify-between">
          <span className="font-semibold text-sm">{sender}</span>
          <span className={`text-xs ${isOwnMessage ? 'text-white opacity-90' : 'text-gray-600'}`}>
            {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        <p className="mt-1 text-base leading-relaxed">{content}</p>
        
        {attachments && attachments.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            {attachments.map(attachment => (
              <div 
                key={attachment.id} 
                className="flex items-center p-2 bg-gray-50 rounded mt-1"
              >
                <File className="h-4 w-4 mr-2" />
                <span className="text-sm flex-grow truncate font-medium text-gray-700">{attachment.name}</span>
                <span className="text-xs text-gray-600">{attachment.size}</span>
              </div>
            ))}
          </div>
        )}
        
        {isSending && (
          <div className={`text-xs mt-1 ${isOwnMessage ? 'text-white opacity-80' : 'text-gray-600'}`}>
            Sending...
          </div>
        )}
      </div>
    </div>
  )
} 