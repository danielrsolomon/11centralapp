import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, Video, FileText, FileQuestion, Files, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

// Define simple toast function to replace the missing toast component
const useToast = () => {
  return {
    toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
      console.log(`${title}: ${description}`);
      alert(`${title}: ${description}`);
    }
  };
};

// Define valid content types and associated components
const contentTypes = [
  { value: 'text', label: 'Text Content', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'quiz', label: 'Quiz', icon: FileQuestion },
  { value: 'pdf', label: 'PDF Document', icon: Files },
  { value: 'html', label: 'HTML Content', icon: FileText },
  { value: 'interactive', label: 'Interactive Component', icon: Files },
];

// Simple form components to replace shadcn UI components
const FormField = ({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

// Define the form schema
const moduleFormSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters long' })
    .max(100, { message: 'Title must be at most 100 characters long' }),
  description: z
    .string()
    .max(1000, { message: 'Description must be at most 1000 characters long' })
    .optional(),
  lesson_id: z.string({
    required_error: 'Please select a lesson',
  }),
  status: z.enum(['active', 'draft', 'archived'], {
    required_error: 'Please select a status',
  }),
  content: z.string().optional(),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
});

// Define the form input types
type ModuleFormValues = z.infer<typeof moduleFormSchema>;

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  course_title?: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  lesson_id: string;
  status: 'active' | 'draft' | 'archived';
  content?: string;
  thumbnail_url?: string;
}

interface ModuleFormProps {
  module?: Module;
  lessonId?: string; // Pre-selected lesson ID when creating from a lesson
  onSubmit: (values: ModuleFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ModuleForm({
  module,
  lessonId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ModuleFormProps) {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('basic');

  // Initialize form with default values or existing module data
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: module?.title || '',
      description: module?.description || '',
      lesson_id: module?.lesson_id || lessonId || '',
      status: module?.status || 'active',
      content: module?.content || '',
      thumbnail_url: module?.thumbnail_url || '',
    },
  });

  // Set active tab based on selected content type
  useEffect(() => {
    const contentType = form.watch('content_type');
    if (contentType === 'text' || contentType === 'html' || contentType === 'quiz' || contentType === 'interactive') {
      setActiveTab('content');
    } else if (contentType === 'video' || contentType === 'pdf') {
      setActiveTab('upload');
    }
  }, [form.watch('content_type')]);

  // Load lessons for the select dropdown
  useEffect(() => {
    async function fetchLessons() {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, course_id, course:course_id(title)')
        .eq('status', 'active')
        .order('title');

      if (error) {
        console.error('Error loading lessons:', error);
        toast({
          title: 'Error loading lessons',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const formattedLessons = data?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        course_id: lesson.course_id,
        course_title: lesson.course?.title
      })) || [];

      setLessons(formattedLessons);
    }

    fetchLessons();
  }, [supabase, toast]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const contentType = form.getValues('content_type');
      
      // Validate file type based on content_type
      if (contentType === 'pdf' && file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF document',
          variant: 'destructive',
        });
        return;
      }
      
      if (contentType === 'video' && !file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a video file',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 50MB',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Remove selected file
  const clearFile = () => {
    setSelectedFile(null);
    form.setValue('content_url', '');
  };

  // Upload file to Supabase Storage
  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return form.getValues('content_url') || null;
    
    setUploading(true);
    
    try {
      const contentType = form.getValues('content_type');
      const fileExt = selectedFile.name.split('.').pop();
      const folderName = contentType === 'pdf' ? 'documents' : 'videos';
      const filePath = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('learning-content')
        .upload(filePath, selectedFile);
        
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('learning-content')
        .getPublicUrl(data.path);
        
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error uploading file',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Get content-specific form fields based on content type
  const renderContentFields = () => {
    const contentType = form.watch('content_type');
    
    switch (contentType) {
      case 'text':
        return (
          <FormField
            name="content_data"
            label="Text Content"
            error={form.formState.errors.content_data?.message}
          >
            <textarea
              placeholder="Enter the text content for this module"
              className="min-h-[300px]"
              {...form.register('content_data')}
            />
          </FormField>
        );
        
      case 'html':
        return (
          <FormField
            name="content_data"
            label="HTML Content"
            error={form.formState.errors.content_data?.message}
          >
            <textarea
              placeholder="Enter HTML content"
              className="min-h-[300px] font-mono text-sm"
              {...form.register('content_data')}
            />
          </FormField>
        );
        
      case 'quiz':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              The quiz editor will be available after creating the module.
            </p>
            <p className="text-sm text-gray-500">
              Create the module first, then you can add questions to the quiz.
            </p>
          </div>
        );
        
      case 'interactive':
        return (
          <FormField
            name="content_data"
            label="Interactive Component Configuration (JSON)"
            error={form.formState.errors.content_data?.message}
          >
            <textarea
              placeholder="Enter configuration as JSON"
              className="min-h-[300px] font-mono text-sm"
              {...form.register('content_data')}
            />
          </FormField>
        );
        
      case 'video':
      case 'pdf':
        return (
          <FormField
            name="content_url"
            label={`${contentType === 'video' ? 'Video URL or Upload' : 'PDF Document URL or Upload'}`}
            error={form.formState.errors.content_url?.message}
          >
            <div className="space-y-4">
              <input
                placeholder={`Enter ${contentType === 'video' ? 'video' : 'PDF'} URL`}
                {...form.register('content_url')}
              />
              
              <div className="text-sm text-gray-500 my-2">Or upload a file:</div>
              
              {selectedFile ? (
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                  <div className="flex-1 truncate">{selectedFile.name}</div>
                  <button
                    type="button"
                    className="text-sm text-gray-500"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4 mr-1" /> Clear
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-24 bg-gray-50 border border-gray-200 border-dashed rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                      Click to upload {contentType === 'video' ? 'video' : 'PDF'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept={contentType === 'video' ? 'video/*' : 'application/pdf'}
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </FormField>
        );
        
      default:
        return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (values: ModuleFormValues) => {
    try {
      // Upload file if selected
      if (selectedFile) {
        const fileUrl = await uploadFile();
        if (fileUrl) {
          values.content_url = fileUrl;
        }
      }
      
      // Parse content_data if it's a string (for JSON data)
      if (values.content_type === 'interactive' && typeof values.content_data === 'string') {
        try {
          values.content_data = JSON.parse(values.content_data);
        } catch (e) {
          console.warn('Could not parse content_data as JSON', e);
          // Keep it as a string if parsing fails
        }
      }
      
      // Submit form
      await onSubmit(values);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error saving module',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {module ? 'Edit Module' : 'Create New Module'}
      </h2>
      <p className="text-base text-gray-500 mb-6">
        {module
          ? 'Update the details of this module'
          : 'Create a new module for your lesson'}
      </p>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <FormField
            name="title"
            label="Module Title"
            error={form.formState.errors.title?.message}
          >
            <input
              placeholder="Enter module title"
              {...form.register('title')}
            />
          </FormField>

          <FormField
            name="description"
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <textarea
              placeholder="Enter module description"
              className="resize-none h-24"
              {...form.register('description')}
            />
          </FormField>

          <FormField
            name="lesson_id"
            label="Lesson"
            error={form.formState.errors.lesson_id?.message}
          >
            <select
              {...form.register('lesson_id')}
            >
              <option value="">Select a lesson</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title} {lesson.course_title ? `(${lesson.course_title})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            name="content_type"
            label="Content Type"
            error={form.formState.errors.content_type?.message}
          >
            <select
              {...form.register('content_type')}
            >
              <option value="">Select content type</option>
              {contentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            name="status"
            label="Status"
            error={form.formState.errors.status?.message}
          >
            <select
              {...form.register('status')}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>

          <FormField
            name="thumbnail_url"
            label="Thumbnail URL"
            error={form.formState.errors.thumbnail_url?.message}
          >
            <input
              placeholder="Enter thumbnail URL"
              {...form.register('thumbnail_url')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderContentFields()}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="text-sm text-gray-500"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="flex items-center"
          >
            {(isSubmitting || uploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {module ? 'Update Module' : 'Create Module'}
          </button>
        </div>
      </form>
    </div>
  );
} 