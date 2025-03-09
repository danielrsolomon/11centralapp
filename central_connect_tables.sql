-- Create conversations table first
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  conversation_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_archived BOOLEAN DEFAULT false
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_status JSONB DEFAULT '{}',
  is_system_message BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal',
  message_type VARCHAR(20) DEFAULT 'direct'
);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  muted BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "app": true, "text": false}',
  UNIQUE (conversation_id, user_id)
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create department_conversations view
CREATE OR REPLACE VIEW public.department_conversations AS
SELECT c.id, c.title, c.created_at, c.updated_at, c.created_by, c.is_archived,
       d.id as department_id, d.name as department_name
FROM public.conversations c
JOIN public.users u ON u.id = c.created_by
JOIN public.departments d ON d.name = u.department
WHERE c.conversation_type = 'department';

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Conversations policy (users can read conversations they're members of)
CREATE POLICY "Users can view conversations they belong to" 
ON public.conversations 
FOR SELECT 
USING (
  id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- Conversation creation policy
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Messages policy (can view messages in conversations they belong to)
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- Message creation policy
CREATE POLICY "Users can send messages to conversations they belong to" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- Conversation members policy (can see members of conversations they belong to)
CREATE POLICY "Users can see members of their conversations" 
ON public.conversation_members 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- Conversation membership policy
CREATE POLICY "Users can manage their own conversation membership" 
ON public.conversation_members
FOR ALL
USING (user_id = auth.uid());

-- Attachments policy
CREATE POLICY "Users can view attachments in their conversations" 
ON public.attachments 
FOR SELECT 
USING (
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversation_members cm ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = auth.uid()
  )
);

-- Attachment creation policy
CREATE POLICY "Users can upload attachments to their conversations" 
ON public.attachments 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversation_members cm ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = auth.uid()
  )
); 