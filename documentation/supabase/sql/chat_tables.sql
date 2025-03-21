-- Chat rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES public.users(id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Sample data: Create initial chat rooms
DO $$
BEGIN
  -- General room
  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'General') THEN
    INSERT INTO public.chat_rooms (name, description)
    VALUES ('General', 'General discussion for all team members');
  END IF;
  
  -- Sales Team room
  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Sales Team') THEN
    INSERT INTO public.chat_rooms (name, description)
    VALUES ('Sales Team', 'Discussion for the sales department');
  END IF;
  
  -- Operations room
  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Operations') THEN
    INSERT INTO public.chat_rooms (name, description)
    VALUES ('Operations', 'Operations coordination and discussions');
  END IF;
  
  -- Management room
  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Management') THEN
    INSERT INTO public.chat_rooms (name, description)
    VALUES ('Management', 'Management team discussions');
  END IF;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function for safe UUID comparison
CREATE OR REPLACE FUNCTION safe_auth_uid() 
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  result text;
BEGIN
  -- Get the auth.uid() and convert it to text for safe comparison
  SELECT COALESCE(auth.uid()::text, '') INTO result;
  RETURN result;
END;
$$;

-- RLS Policies for chat_rooms
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Anyone can view chat rooms"
  ON public.chat_rooms
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can create chat rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Creators and admins can update chat rooms" ON public.chat_rooms;
CREATE POLICY "Creators and admins can update chat rooms"
  ON public.chat_rooms
  FOR UPDATE
  USING (
    created_by::text = safe_auth_uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id::text = safe_auth_uid()
      AND r.name IN ('SuperAdmin', 'Admin')
    )
  );

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can create messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id::text = safe_auth_uid()
  );

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages
  FOR DELETE
  USING (user_id::text = safe_auth_uid());

DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
CREATE POLICY "Users can update their own messages"
  ON public.chat_messages
  FOR UPDATE
  USING (user_id::text = safe_auth_uid());

-- Enable realtime subscriptions for these tables
COMMENT ON TABLE public.chat_rooms IS 'Chat rooms for team communication';
COMMENT ON TABLE public.chat_messages IS 'Messages sent in chat rooms';

-- Only add to publication if not already a member
DO $$
BEGIN
  -- For chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_messages' 
    AND pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END;
$$; 