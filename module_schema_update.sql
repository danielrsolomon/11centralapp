-- Add quiz_questions field to modules table
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS quiz_questions JSONB DEFAULT '[]';

-- Create quiz_options table to store quiz options if needed separately
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Store multiple choice options or T/F
  correct_answer TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Set Row Level Security for quiz options
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

-- Create policy for quiz options
CREATE POLICY "Admins and training managers can manage quiz options" ON public.quiz_options
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('admin', 'training_manager')
  )
);

-- Create policy for viewing quiz options
CREATE POLICY "Users can view published quiz options" ON public.quiz_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_id AND m.status = 'published'
  )
); 