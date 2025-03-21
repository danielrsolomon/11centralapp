import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import api from '../../services/apiService';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner';
import { courseService } from '../../services/courseService';
import { Course } from '../../types/database.types';
import { useAuth } from '../../providers/auth-provider';

// Define the form schema
const courseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  program_id: z.string().min(1, 'Program is required'),
  completion_time: z.number().positive('Completion time must be positive').optional(),
  thumbnail: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  is_required: z.boolean().default(false)
});

// Define the form values type
type CourseFormValues = z.infer<typeof courseFormSchema>;

// Define the props for the CourseForm component
export interface CourseFormProps {
  courseId?: string;
  programId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const CourseForm: React.FC<CourseFormProps> = ({
  courseId,
  programId,
  isOpen,
  onClose,
  onSave,
}) => {
  console.log('CourseForm: isOpen =', isOpen); // Log open state changes
  const [programs, setPrograms] = useState<{ id: string, title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start with false to avoid flickering
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth(); // Get current user

  // Initialize the form
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      program_id: programId || '',
      completion_time: undefined,
      thumbnail: '',
      status: 'draft',
      is_required: false
    }
  });

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  // Update program_id when programId prop changes
  useEffect(() => {
    if (programId) {
      form.setValue('program_id', programId);
    }
  }, [programId, form]);

  // Fetch programs and course data if editing
  useEffect(() => {
    // Only fetch data when the dialog is open
    if (!isOpen) return;
    
    console.log('CourseForm: Fetching data...'); // Log data fetching
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Run fetch operations in parallel for performance
        const [programsResponse, courseResponse] = await Promise.allSettled([
          // REFACTORED: Fetch available programs using API
          api.get('/university/programs'),
            
          // REFACTORED: If editing, fetch course data using courseService
          courseId ? courseService.getCourseById(courseId, false) : Promise.resolve(null)
        ]);
        
        // Process programs
        if (programsResponse.status === 'fulfilled' && programsResponse.value.success) {
          setPrograms(programsResponse.value.data);
        }
        
        // Process course data if editing
        if (courseResponse.status === 'fulfilled' && 
            courseResponse.value && 
            courseResponse.value.data) {
          const data = courseResponse.value.data;
          
          // Set form values
          form.reset({
            title: data.title,
            description: data.description,
            program_id: data.program_id,
            completion_time: data.completion_time,
            thumbnail: data.thumbnail,
            status: data.status,
            is_required: data.is_required
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
        console.log('CourseForm: Data fetch complete'); // Log fetch completion
      }
    };
    
    fetchData();
  }, [isOpen, courseId, form]);

  // Handle form submission
  const handleSubmit = async (values: CourseFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      if (courseId) {
        // REFACTORED: Update existing course using courseService
        const { data, error } = await courseService.updateCourse(courseId, {
          title: values.title,
          description: values.description,
          program_id: values.program_id,
          // Only include properties that exist in the Course type
          status: values.status,
          overview: values.description, // Use description as overview
          // Add required fields that aren't in the form but needed by the API
          created_by: user.id,
          sequence_order: 0 // This will be preserved during update
        });
        
        if (error) throw error;
        
        toast.success('Course updated successfully');
      } else {
        // REFACTORED: Get the courses for the program to determine order
        const { data: existingCourses, error: orderError } = await courseService.getCoursesByProgram(values.program_id);
        
        if (orderError) throw orderError;
        
        // Calculate next order value
        const nextOrder = existingCourses && existingCourses.length > 0 
          ? Math.max(...existingCourses.map((course: Course) => course.sequence_order || 0)) + 1 
          : 0;
        
        // REFACTORED: Create new course using courseService
        const { data: newCourse, error } = await courseService.createCourse({
          title: values.title,
          description: values.description,
          program_id: values.program_id,
          // Only include properties that exist in the Course type
          status: values.status,
          overview: values.description, // Use description as overview
          // Add required fields that aren't in the form but needed by the API
          created_by: user.id,
          sequence_order: nextOrder
        });
        
        if (error) throw error;
        
        toast.success('Course created successfully');
      }
      
      // Close the form and refresh the tree
      onSave();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    console.log('CourseForm: handleClose called'); // Log close action
    onClose();
  };

  // Simple rendering approach - only render when isOpen is true
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('CourseForm: Dialog onOpenChange =', open); // Log dialog state changes
        if (!open) handleClose();
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        // Apply simpler animation style to reduce flicker
        style={{ animation: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>{courseId ? 'Edit Course' : 'Create New Course'}</DialogTitle>
        </DialogHeader>

        {/* Show loading inside the dialog to avoid remounting */}
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                placeholder="Enter course title"
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>
            
            {/* Program Selection */}
            <div className="space-y-2">
              <Label htmlFor="program_id">Program</Label>
              <select
                id="program_id"
                className="w-full p-2 border rounded-md"
                {...form.register('program_id')}
                disabled={!!programId} // Disable if programId is provided (creating from program)
              >
                <option value="">Select a program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
              {form.formState.errors.program_id && (
                <p className="text-sm text-red-500">{form.formState.errors.program_id.message}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed course description"
                rows={4}
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>
            
            {/* Thumbnail */}
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL</Label>
              <Input
                id="thumbnail"
                placeholder="URL to thumbnail image"
                {...form.register('thumbnail')}
              />
              {form.formState.errors.thumbnail && (
                <p className="text-sm text-red-500">{form.formState.errors.thumbnail.message}</p>
              )}
            </div>
            
            {/* Completion Time */}
            <div className="space-y-2">
              <Label htmlFor="completion_time">Estimated Completion Time (minutes)</Label>
              <Input
                id="completion_time"
                type="number"
                placeholder="e.g., 30"
                {...form.register('completion_time', { valueAsNumber: true })}
              />
              {form.formState.errors.completion_time && (
                <p className="text-sm text-red-500">{form.formState.errors.completion_time.message}</p>
              )}
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="draft" id="status-draft" />
                      <Label htmlFor="status-draft">Draft</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="status-active" />
                      <Label htmlFor="status-active">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="archived" id="status-archived" />
                      <Label htmlFor="status-archived">Archived</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {form.formState.errors.status && (
                <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
              )}
            </div>
            
            {/* Required */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_required"
                  {...form.register('is_required')}
                  className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                />
                <Label htmlFor="is_required">Required Course (must be completed by all users)</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : courseId ? 'Update Course' : 'Create Course'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourseForm; 