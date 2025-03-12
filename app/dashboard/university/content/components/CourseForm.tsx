import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, FileImage, X } from 'lucide-react';
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
const courseFormSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters long' })
    .max(100, { message: 'Title must be at most 100 characters long' }),
  description: z
    .string()
    .max(1000, { message: 'Description must be at most 1000 characters long' })
    .optional(),
  program_id: z.string({
    required_error: 'Please select a program',
  }),
  status: z.enum(['active', 'draft', 'archived'], {
    required_error: 'Please select a status',
  }),
  thumbnail_url: z.string().url().optional().or(z.literal('')).or(z.null()),
});

// Define the form input types
type CourseFormValues = z.infer<typeof courseFormSchema>;

interface Program {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  program_id: string;
  status: 'active' | 'draft' | 'archived';
  thumbnail_url?: string;
}

interface CourseFormProps {
  course?: Course;
  onSubmit: (values: CourseFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Simple form components to replace shadcn UI components
const FormField = ({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-800 mb-1">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export default function CourseForm({
  course,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CourseFormProps) {
  const supabase = createClient();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const { toast } = useToast();

  // Initialize form with default values or existing course data
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: course?.title || '',
      description: course?.description || '',
      program_id: course?.program_id || '',
      status: course?.status || 'active',
      thumbnail_url: course?.thumbnail_url || '',
    },
  });

  // Fetch programs for the select dropdown
  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, title')
        .order('title');
        
      if (error) throw error;
      
      if (data) {
        setPrograms(data);
      }
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load programs',
        variant: 'destructive',
      });
    }
  };
  
  // Fetch programs on component mount
  useEffect(() => {
    fetchPrograms();
  }, [supabase, toast]);

  // Set up thumbnail preview if course has one
  useEffect(() => {
    if (course?.thumbnail_url) {
      setThumbnailPreview(course.thumbnail_url);
    }
  }, [course]);

  // Handle file selection for thumbnail
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG, PNG, WebP, or GIF)',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 2MB',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  // Remove selected thumbnail
  const clearThumbnail = () => {
    setSelectedFile(null);
    setThumbnailPreview('');
    form.setValue('thumbnail_url', '');
  };

  // Upload thumbnail to Supabase Storage
  const uploadThumbnail = async (): Promise<string | null> => {
    if (!selectedFile) return form.getValues('thumbnail_url') || null;
    
    setUploading(true);
    
    try {
      // Create a unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `course-thumbnails/${course?.id || 'new'}-${Date.now()}.${fileExt}`;
      
      // Fix: Try multiple bucket names that may exist in the Supabase project
      // This makes the app more resilient to different Supabase setups
      let uploadResult = null;
      // Try a variety of common bucket names used in Supabase projects
      const buckets = ['course-thumbnails', 'course_thumbnails', 'thumbnails', 'images', 'avatars', 'public', 'courses'];
      
      // Flag to track if we've attempted uploads
      let attemptedUpload = false;
      
      for (const bucket of buckets) {
        try {
          // Check if the bucket exists first
          const { data: bucketExists } = await supabase.storage.getBucket(bucket);
          
          if (!bucketExists) {
            console.log(`Bucket '${bucket}' does not exist, skipping`);
            continue;
          }
          
          // Attempt upload if bucket exists
          attemptedUpload = true;
          console.log(`Attempting upload to bucket '${bucket}'`);
          
          const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, selectedFile, { upsert: true });
            
          if (!uploadError) {
            // Get the public URL
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath);
              
            uploadResult = urlData.publicUrl;
            console.log(`Successfully uploaded to '${bucket}' bucket`);
            break;
          } else {
            console.warn(`Failed to upload to '${bucket}' bucket:`, uploadError);
          }
        } catch (bucketError) {
          console.warn(`Error with bucket '${bucket}':`, bucketError);
          // Continue to try the next bucket
        }
      }
      
      // If we couldn't upload to any bucket or no upload was attempted,
      // convert to data URL as fallback
      if (!uploadResult) {
        const reason = attemptedUpload ? 
          'Could not upload to any storage bucket' : 
          'No valid storage buckets found';
        
        console.warn(`${reason}, using data URL fallback`);
        
        // Show a clear message to the user about the storage issue
        if (!attemptedUpload) {
          toast({
            title: 'Storage Configuration Issue',
            description: 'No storage buckets are configured. Your image will be stored as a data URL instead. Please ask an administrator to set up Supabase storage.',
            variant: 'warning',
          });
        } else {
          toast({
            title: 'Storage Upload Failed',
            description: 'Failed to upload to any storage buckets. Your image will be stored as a data URL instead, which is less efficient.',
            variant: 'warning',
          });
        }
          
        // Use data URL as a last resort
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.readAsDataURL(selectedFile);
        });
      }
      
      return uploadResult;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error uploading thumbnail',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
      
      // Convert to data URL as fallback if any error occurs
      try {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl);
          };
          reader.readAsDataURL(selectedFile);
        });
      } catch (fallbackError) {
        console.error('Error creating data URL fallback:', fallbackError);
        return null;
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (values: CourseFormValues) => {
    try {
      // Upload thumbnail if selected
      if (selectedFile) {
        try {
          const thumbnailUrl = await uploadThumbnail();
          if (thumbnailUrl) {
            values.thumbnail_url = thumbnailUrl;
          }
        } catch (uploadError) {
          // Fix: Handle thumbnail upload errors more gracefully
          console.error('Failed to upload thumbnail, continuing without it:', uploadError);
          toast({
            title: 'Thumbnail Upload Failed',
            description: 'Your course will be created without a thumbnail image.',
            variant: 'warning',
          });
          // Don't set thumbnail_url if upload failed
          values.thumbnail_url = '';
        }
      } else if (thumbnailPreview && !selectedFile) {
        // Keep existing thumbnail if there's a preview but no new file selected
        values.thumbnail_url = form.getValues('thumbnail_url');
      } else {
        // Ensure thumbnail_url is empty or not included if no image
        values.thumbnail_url = '';
      }
      
      // Submit form
      await onSubmit(values);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error saving course',
        description: error.message || 'Failed to save course. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800">{course ? 'Edit Course' : 'Create New Course'}</h3>
        <p className="text-gray-700 text-sm mt-1">
          {course
            ? 'Update the details of this course'
            : 'Create a new course in your learning program'}
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Title Field */}
          <FormField
            name="title"
            label="Course Title"
            error={form.formState.errors.title?.message}
          >
            <input
              id="title"
              {...form.register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] text-gray-800"
              placeholder="Enter course title"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] text-gray-800"
              rows={4}
              placeholder="Enter course description"
            />
          </FormField>
          
          {/* Program Field */}
          <FormField
            name="program_id"
            label="Program"
            error={form.formState.errors.program_id?.message}
          >
            <Controller
              name="program_id"
              control={form.control}
              render={({ field }) => (
                <select
                  id="program_id"
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] text-gray-800"
                >
                  <option value="" disabled>Select a program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
              )}
            />
          </FormField>
          
          {/* Status Field */}
          <FormField
            name="status"
            label="Status"
            error={form.formState.errors.status?.message}
          >
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <select
                  id="status"
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] text-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              )}
            />
          </FormField>
          
          {/* Thumbnail Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">Thumbnail Image</label>
            
            {thumbnailPreview ? (
              <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearThumbnail}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <FileImage className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-700 mb-2">Click to upload a thumbnail image</p>
                <input
                  type="file"
                  id="thumbnail"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="thumbnail"
                  className="px-4 py-2 bg-[#AE9773] text-white rounded-md cursor-pointer hover:bg-[#8E795D]"
                >
                  Select Image
                </label>
              </div>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isSubmitting || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] flex items-center"
              disabled={isSubmitting || uploading}
            >
              {(isSubmitting || uploading) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 