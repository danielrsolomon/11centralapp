import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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

// Define the form schema
const lessonFormSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters long' })
    .max(100, { message: 'Title must be at most 100 characters long' }),
  description: z
    .string()
    .max(1000, { message: 'Description must be at most 1000 characters long' })
    .optional(),
  course_id: z.string({
    required_error: 'Please select a course',
  }),
  status: z.enum(['active', 'draft', 'archived'], {
    required_error: 'Please select a status',
  }),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
});

// Define the form input types
type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface Course {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  status: 'active' | 'draft' | 'archived';
  thumbnail_url?: string;
}

interface LessonFormProps {
  lesson?: Lesson;
  courseId?: string;
  onSubmit: (values: LessonFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

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

export default function LessonForm({
  lesson,
  courseId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LessonFormProps) {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const { toast } = useToast();

  // Initialize form with default values or existing lesson data
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: lesson?.title || '',
      description: lesson?.description || '',
      course_id: lesson?.course_id || courseId || '',
      status: lesson?.status || 'active',
      thumbnail_url: lesson?.thumbnail_url || '',
    },
  });

  // Fetch courses for the select dropdown
  useEffect(() => {
    async function fetchCourses() {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .order('title');
          
        if (error) throw error;
        
        if (data) {
          setCourses(data);
        }
      } catch (error: any) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to load courses',
          variant: 'destructive',
        });
      }
    }
    
    fetchCourses();
  }, [supabase, toast]);

  // Handle form submission
  const handleSubmit = async (values: LessonFormValues) => {
    try {
      // Submit form
      await onSubmit(values);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error saving lesson',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-semibold">{lesson ? 'Edit Lesson' : 'Create New Lesson'}</h3>
        <p className="text-gray-500 text-sm mt-1">
          {lesson
            ? 'Update the details of this lesson'
            : 'Create a new lesson for your course'}
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Title Field */}
          <FormField
            name="title"
            label="Lesson Title"
            error={form.formState.errors.title?.message}
          >
            <input
              id="title"
              {...form.register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773]"
              placeholder="Enter lesson title"
            />
          </FormField>
          
          {/* Description Field */}
          <FormField
            name="description"
            label="Description"
            error={form.formState.errors.description?.message}
          >
            <textarea
              id="description"
              {...form.register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773]"
              rows={4}
              placeholder="Enter lesson description"
            />
          </FormField>
          
          {/* Course Field */}
          <FormField
            name="course_id"
            label="Course"
            error={form.formState.errors.course_id?.message}
          >
            <select
              id="course_id"
              {...form.register('course_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773]"
            >
              <option value="" disabled>Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </FormField>
          
          {/* Status Field */}
          <FormField
            name="status"
            label="Status"
            error={form.formState.errors.status?.message}
          >
            <select
              id="status"
              {...form.register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773]"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
          
          {/* Thumbnail URL Field */}
          <FormField
            name="thumbnail_url"
            label="Thumbnail URL"
            error={form.formState.errors.thumbnail_url?.message}
          >
            <input
              id="thumbnail_url"
              {...form.register('thumbnail_url')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773]"
              placeholder="Enter thumbnail URL"
            />
          </FormField>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {lesson ? 'Update Lesson' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 