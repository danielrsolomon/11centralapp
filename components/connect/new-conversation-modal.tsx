import { useState } from 'react'
import { User } from '@/lib/types'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (recipients: string[], subject: string, message: string) => void
  availableUsers: User[]
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onSubmit,
  availableUsers
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<User[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const filteredUsers = availableUsers.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || 
           user.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleSelectUser = (user: User) => {
    if (!selectedRecipients.some(r => r.id === user.id)) {
      setSelectedRecipients([...selectedRecipients, user])
    }
    setSearchQuery('')
  }

  const handleRemoveRecipient = (userId: string) => {
    setSelectedRecipients(selectedRecipients.filter(user => user.id !== userId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRecipients.length === 0 || !subject.trim() || !message.trim()) return
    
    onSubmit(
      selectedRecipients.map(user => user.id), 
      subject, 
      message
    )
    
    // Reset form
    setSelectedRecipients([])
    setSubject('')
    setMessage('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">New Message</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Recipients
            </label>
            <div className="flex flex-wrap mb-2">
              {selectedRecipients.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center bg-gray-100 rounded-md m-1 px-2 py-1"
                >
                  <span className="text-sm">
                    {user.firstName} {user.lastName}
                  </span>
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveRecipient(user.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search for users..." 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="font-medium text-gray-800">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {user.email}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-600">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Subject
            </label>
            <input 
              type="text" 
              placeholder="Add a subject..." 
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-800"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Message
            </label>
            <textarea 
              placeholder="Type your message..." 
              className="w-full p-2 border border-gray-300 rounded-md h-32 focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-800"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-opacity-90"
              disabled={selectedRecipients.length === 0 || !subject.trim() || !message.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 