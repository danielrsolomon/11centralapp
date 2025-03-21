import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import api from '../../services/apiService';
import { moduleService } from '../../services/moduleService';
import { lessonService } from '../../services/lessonService';
import { useAuth } from '../../providers/auth-provider';
import { Module } from '../../types/database.types';

// Define the form schema with conditional validation for content_url
const moduleFormSchema = z.discriminatedUnion('content_type', [
  // When content_type is 'video', content_url is required
  z.object({
    content_type: z.literal('video'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    lesson_id: z.string().min(1, 'Lesson is required'),
    content_url: z.string().min(1, 'Video URL is required for video content'),
    content_text: z.string().optional(),
    completion_time: z.number().positive('Completion time must be positive').optional(),
    status: z.enum(['active', 'draft', 'archived']).default('draft')
  }),
  // For all other content types, content_url remains optional
  z.object({
    content_type: z.enum(['text', 'quiz', 'assignment']),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    lesson_id: z.string().min(1, 'Lesson is required'),
    content_url: z.string().optional(),
    content_text: z.string().optional(),
    completion_time: z.number().positive('Completion time must be positive').optional(),
    status: z.enum(['active', 'draft', 'archived']).default('draft')
  })
]);

// Define the form values type from the schema
type ModuleFormValues = z.infer<typeof moduleFormSchema>;

// Define the props for the ModuleForm component
export interface ModuleFormProps {
  moduleId?: string;
  lessonId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ModuleForm({ moduleId, lessonId, isOpen, onClose, onSave }: ModuleFormProps) {
  console.log('ModuleForm: isOpen =', isOpen); // Log open state changes
  const [loading, setLoading] = useState(false); // Start with false to avoid flickering
  const [lessons, setLessons] = useState<{ id: string, title: string }[]>([]);
  const { user } = useAuth(); // Get current user
  
  // Initialize the form
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
      lesson_id: lessonId || '',
      content_type: 'text' as const, // Using const assertion for discriminated union
      content_url: '',
      content_text: '',
      completion_time: undefined,
      status: 'draft' as const
    }
  });
  
  // Watch content type to show appropriate fields and for validation
  const contentType = form.watch('content_type');
  
  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  
  // Update lesson_id when lessonId prop changes
  useEffect(() => {
    if (lessonId) {
      form.setValue('lesson_id', lessonId);
    }
  }, [lessonId, form]);
  
  // Fetch lessons and module data if editing
  useEffect(() => {
    // Only fetch data when the dialog is open
    if (!isOpen) return;
    
    console.log('ModuleForm: Fetching data...'); // Log data fetching
    
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Run fetch operations in parallel
        const [lessonsResponse, moduleResponse] = await Promise.allSettled([
          // REFACTORED: Use API endpoint instead of direct Supabase call
          api.get('/university/lessons/active'),
            
          // If editing, fetch module data
          // REFACTORED: Use moduleService instead of direct API call
          moduleId ? moduleService.getModuleById(moduleId) : Promise.resolve(null)
        ]);
        
        // Process lessons
        if (lessonsResponse.status === 'fulfilled' && lessonsResponse.value.success) {
          setLessons(lessonsResponse.value.data);
        }
        
        // Process module data if editing
        if (moduleResponse.status === 'fulfilled' && 
            moduleResponse.value && 
            moduleResponse.value.data) {
          const moduleData = moduleResponse.value.data;
          
          // Determine content type from module data
          const contentType = determineContentType(moduleData);
          
          // Map API response to form fields
          form.reset({
            title: moduleData.title,
            description: moduleData.description,
            lesson_id: moduleData.lesson_id,
            content_type: contentType,
            content_url: moduleData.video_url || '',
            content_text: moduleData.content || '',
            completion_time: moduleData.completion_time,
            status: moduleData.status
          } as ModuleFormValues); // Cast to ModuleFormValues to satisfy TypeScript
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
        console.log('ModuleForm: Data fetch complete'); // Log fetch completion
      }
    };
    
    fetchData();
  }, [isOpen, moduleId, form]);
  
  // Helper to determine content type from module data
  const determineContentType = (moduleData: Module): 'video' | 'text' | 'quiz' | 'assignment' => {
    if (moduleData.video_url) return 'video';
    return 'text';
  };
  
  // Handle form submission
  const handleSubmit = async (values: ModuleFormValues) => {
    setLoading(true);
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // We now know that if content_type is 'video', then content_url is a non-empty string
      // due to our schema validation
      const videoUrl = values.content_type === 'video' ? values.content_url : '';
      
      // Handle content_text which might be undefined
      const contentText = values.content_type === 'text' ? (values.content_text || '') : '';
      
      if (moduleId) {
        // REFACTORED: Update existing module using moduleService
        const { data, error } = await moduleService.updateModule(moduleId, {
          title: values.title,
          description: values.description,
          lesson_id: values.lesson_id,
          // Map form fields to Module properties with proper null handling
          content: contentText,
          // Video URL is guaranteed to be a string when content_type is 'video'
          video_url: videoUrl,
          video_required: values.content_type === 'video',
          status: values.status
        });
          
        if (error) {
          throw new Error(error.message || 'Failed to update module');
        }
        
        toast.success('Module updated successfully');
      } else {
        // REFACTORED: Get the highest order value for the lesson using moduleService
        const { data: existingModules, error: orderError } = await moduleService.getModulesByCourse(values.lesson_id);
          
        if (orderError) {
          throw new Error(orderError.message || 'Failed to get module order');
        }
        
        // Calculate next order value
        const nextOrder = existingModules && existingModules.length > 0 
          ? Math.max(...existingModules.map((module: Module) => module.sequence_order || 0)) + 1 
          : 0;
        
        // REFACTORED: Create new module using moduleService
        const { data, error } = await moduleService.createModule({
          title: values.title,
          description: values.description,
          lesson_id: values.lesson_id,
          // Map form fields to Module properties with proper null handling
          content: contentText,
          // Video URL is guaranteed to be a string when content_type is 'video'
          video_url: videoUrl,
          video_required: values.content_type === 'video',
          status: values.status,
          sequence_order: nextOrder
          // created_by is handled by the API
        });
          
        if (error) {
          throw new Error(error.message || 'Failed to create module');
        }
        
        toast.success('Module created successfully');
      }
      
      // Close the form and refresh the tree
      onSave();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving module:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save module');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    console.log('ModuleForm: handleClose called'); // Log close action
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
        console.log('ModuleForm: Dialog onOpenChange =', open); // Log dialog state changes
        if (!open) handleClose();
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        // Apply simpler animation style to reduce flicker
        style={{ animation: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>{moduleId ? 'Edit Module' : 'Create New Module'}</DialogTitle>
        </DialogHeader>

        {/* Show loading inside the dialog to avoid remounting */}
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Module Title</Label>
              <Input
                id="title"
                placeholder="Enter module title"
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>
            
            {/* Lesson Selection */}
            <div className="space-y-2">
              <Label htmlFor="lesson_id">Lesson</Label>
              <select
                id="lesson_id"
                className="w-full p-2 border rounded-md"
                {...form.register('lesson_id')}
                disabled={!!lessonId} // Disable if lessonId is provided (creating from lesson)
              >
                <option value="">Select a lesson</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
              {form.formState.errors.lesson_id && (
                <p className="text-sm text-red-500">{form.formState.errors.lesson_id.message}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief module description"
                rows={3}
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>
            
            {/* Content Type */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Controller
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={(value) => {
                      // Clear content_url if switching away from video
                      if (field.value === 'video' && value !== 'video') {
                        form.setValue('content_url', '');
                      }
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="content-text" />
                      <Label htmlFor="content-text">Text</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="content-video" />
                      <Label htmlFor="content-video">Video</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quiz" id="content-quiz" />
                      <Label htmlFor="content-quiz">Quiz</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="assignment" id="content-assignment" />
                      <Label htmlFor="content-assignment">Assignment</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {form.formState.errors.content_type && (
                <p className="text-sm text-red-500">{form.formState.errors.content_type.message}</p>
              )}
            </div>
            
            {/* Content URL (for video) */}
            {(contentType === 'video' || contentType === 'quiz' || contentType === 'assignment') && (
              <div className="space-y-2">
                <Label htmlFor="content_url">
                  {contentType === 'video' ? 'Video URL (required)' : 'Content URL'}
                </Label>
                <Input
                  id="content_url"
                  placeholder={
                    contentType === 'video' ? 'YouTube or Vimeo URL (required)' :
                    contentType === 'quiz' ? 'Quiz URL' :
                    'Assignment URL'
                  }
                  {...form.register('content_url')}
                />
                <p className="text-xs text-gray-500">
                  {contentType === 'video' && 'Enter a YouTube or Vimeo URL for the video content (required)'}
                  {contentType === 'quiz' && 'Enter a URL for the quiz'}
                  {contentType === 'assignment' && 'Enter a URL for the assignment details or submission'}
                </p>
                {form.formState.errors.content_url && (
                  <p className="text-sm text-red-500">{form.formState.errors.content_url.message}</p>
                )}
              </div>
            )}
            
            {/* Content Text (for text) */}
            {contentType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="content_text">Content Text</Label>
                <Textarea
                  id="content_text"
                  placeholder="Enter the text content for this module"
                  rows={8}
                  {...form.register('content_text')}
                />
                <p className="text-xs text-gray-500">
                  You can use Markdown formatting for rich text content
                </p>
                {form.formState.errors.content_text && (
                  <p className="text-sm text-red-500">{form.formState.errors.content_text.message}</p>
                )}
              </div>
            )}
            
            {/* Completion Time */}
            <div className="space-y-2">
              <Label htmlFor="completion_time">Estimated Completion Time (minutes)</Label>
              <Input
                id="completion_time"
                type="number"
                placeholder="e.g., 10"
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : moduleId ? 'Update Module' : 'Create Module'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 