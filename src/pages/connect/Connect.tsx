import { useState } from 'react';
import { MessageSquare, Search, Plus, Send, Paperclip, MoreVertical, User, Users, Hash } from 'lucide-react';

// Mock data for channels
const mockChannels = [
  { id: 1, name: 'announcements', type: 'public', unread: 2 },
  { id: 2, name: 'bar-staff', type: 'department', unread: 0 },
  { id: 3, name: 'general', type: 'public', unread: 5 },
  { id: 4, name: 'vip-hosts', type: 'department', unread: 0 },
  { id: 5, name: 'events', type: 'public', unread: 1 },
];

// Mock data for messages
const mockMessages = [
  {
    id: 1,
    channelId: 1,
    sender: { id: 101, name: 'John Smith', avatar: '/avatars/john.jpg', role: 'Manager' },
    content: 'Hello team, I\'ve posted the new schedule for March 15-31.',
    timestamp: '2025-03-12T10:30:00Z',
    attachments: [
      { id: '1', name: 'March_Schedule.pdf', type: 'pdf', size: '1.2 MB' }
    ]
  },
  {
    id: 2,
    channelId: 1,
    sender: { id: 102, name: 'Sarah Johnson', avatar: '/avatars/sarah.jpg', role: 'Bartender' },
    content: 'Thanks John! I noticed I\'m scheduled for both Friday and Saturday night. Is that correct?',
    timestamp: '2025-03-12T10:35:00Z',
    attachments: []
  },
  {
    id: 3,
    channelId: 1,
    sender: { id: 101, name: 'John Smith', avatar: '/avatars/john.jpg', role: 'Manager' },
    content: 'Yes, that\'s correct. We\'re expecting a busy weekend with the concert event.',
    timestamp: '2025-03-12T10:38:00Z',
    attachments: []
  },
  {
    id: 4,
    channelId: 1,
    sender: { id: 103, name: 'Michael Chen', avatar: '/avatars/michael.jpg', role: 'VIP Host' },
    content: 'Just a reminder that we have a training session this Thursday at 4 PM for the new POS system.',
    timestamp: '2025-03-12T11:15:00Z',
    attachments: []
  },
];

export default function Connect() {
  const [selectedChannel, setSelectedChannel] = useState(mockChannels[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredChannels = mockChannels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const channelMessages = mockMessages.filter(message => message.channelId === selectedChannel.id);
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      // In a real app, this would send the message to the server
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };
  
  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border bg-card shadow-sm">
      {/* Channels Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search channels"
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">CHANNELS</span>
            <button className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Channel</span>
            </button>
          </div>
          
          <div className="mt-1 space-y-1">
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  selectedChannel.id === channel.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                }`}
                onClick={() => setSelectedChannel(channel)}
              >
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>{channel.name}</span>
                {channel.unread > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {channel.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">DIRECT MESSAGES</span>
            <button className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Direct Message</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{selectedChannel.name}</span>
            <span className="text-xs text-muted-foreground">
              {selectedChannel.type === 'public' ? 'Public Channel' : 'Department Channel'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <Users className="h-5 w-5" />
              <span className="sr-only">Channel Members</span>
            </button>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">More Options</span>
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {channelMessages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{message.sender.name}</span>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
                </div>
                <p className="text-sm mt-1">{message.content}</p>
                
                {message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span>{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">({attachment.size})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Message Input */}
        <div className="border-t p-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach File</span>
            </button>
            
            <input
              type="text"
              placeholder={`Message #${selectedChannel.name}`}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            
            <button
              type="submit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={!messageText.trim()}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send Message</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 