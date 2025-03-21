import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Image, Loader2, X, Upload } from 'lucide-react';
import { programService } from '../../services/programService';
import { Program } from '../../types/database.types';
import { useAuth } from '../../providers/auth-provider';
import { useToast } from '../../hooks/use-toast';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import api from '../../services/apiService';
import { storageService, BUCKETS, ALLOWED_IMAGE_TYPES } from '../../services/storageService';

// Define validation schema for the form
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  short_description: z.string().min(1, 'Short description is required'),
  thumbnail: z.string().optional(),
  completion_time: z.number().positive('Completion time must be positive').optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  required_roles: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  is_featured: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

interface Department {
  id: string;
  name: string;
}

interface ProgramFormProps {
  programId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ProgramForm: React.FC<ProgramFormProps> = ({
  programId,
  isOpen,
  onClose,
  onSave,
}) => {
  console.log('ProgramForm: isOpen =', isOpen);
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ id: string, name: string }[]>([]);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      short_description: '',
      thumbnail: '',
      completion_time: undefined,
      difficulty: 'Beginner',
      required_roles: [],
      status: 'draft',
      is_featured: false
    },
  });

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setThumbnailPreview(null);
    }
  }, [isOpen, form]);

  // Fetch departments and roles from API when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('ProgramForm: Fetching data...');
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const [rolesResponse, departmentsResponse, programResponse] = await Promise.allSettled([
          api.get('/admin/roles'),
          
          api.get('/admin/departments'),
          
          programId ? api.get(`/university/programs/${programId}`) : Promise.resolve(null)
        ]);
        
        if (rolesResponse.status === 'fulfilled' && rolesResponse.value.success) {
          setRoles(rolesResponse.value.data);
        }
        
        if (departmentsResponse.status === 'fulfilled' && departmentsResponse.value.success) {
          setDepartments(departmentsResponse.value.data);
        }
        
        if (programResponse.status === 'fulfilled' && 
            programResponse.value && 
            programResponse.value.success) {
          const programData = programResponse.value.data;
          
          form.reset({
            title: programData.title,
            description: programData.description,
            short_description: programData.short_description,
            thumbnail: programData.thumbnail_url || '',
            completion_time: programData.completion_time,
            difficulty: programData.difficulty,
            required_roles: programData.roles || [],
            status: programData.status || 'draft',
            is_featured: programData.is_featured
          });
          
          setThumbnailPreview(programData.thumbnail_url || null);
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
        toast.error('Failed to load program data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, programId, form]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file type and size
    const fileType = file.type;
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      form.setError('thumbnail', {
        type: 'manual',
        message: 'Please upload an image file (JPEG, PNG, WebP, or GIF)',
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      form.setError('thumbnail', {
        type: 'manual',
        message: 'Image size must be less than 5MB',
      });
      return;
    }

    // Create file name with timestamp to prevent name conflicts
    const timestamp = new Date().getTime();
    const fileExt = file.name.split('.').pop();
    const filePath = `${timestamp}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setThumbnailPreview(objectUrl);

      // REFACTORED: Use storageService instead of direct Supabase call
      const uploadResult = await storageService.uploadFile(
        BUCKETS.PROGRAM_THUMBNAILS,
        file,
        filePath,
        ALLOWED_IMAGE_TYPES
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error?.message || 'Failed to upload image');
      }

      // Get the public URL
      const publicUrl = storageService.getPublicUrl(BUCKETS.PROGRAM_THUMBNAILS, filePath);
      form.setValue('thumbnail', publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      form.setError('thumbnail', {
        type: 'manual',
        message: 'Failed to upload image',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Prepare data with required fields for the API
      const programData = {
        ...values,
        roles: values.required_roles || [],
        departments: departments.map(department => department.id),
        created_by: user.id // Now guaranteed to be non-null
      };
      
      if (programId) {
        // REFACTORED: Use programService instead of direct API call
        const { data, error } = await programService.update(programId, programData);
        
        if (error) {
          throw new Error(error.message || 'Failed to update program');
        }
        
        toast({
          title: "Success",
          description: "Program updated successfully"
        });
      } else {
        // REFACTORED: Use programService instead of direct API call
        const { data, error } = await programService.create(programData);
        
        if (error) {
          throw new Error(error.message || 'Failed to create program');
        }
        
        toast({
          title: "Success",
          description: "Program created successfully"
        });
      }
      
      // Close dialog and trigger refresh
      onClose();
      onSave();
    } catch (error) {
      console.error('Error saving program:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save program',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    console.log('ProgramForm: handleClose called');
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
        console.log('ProgramForm: Dialog onOpenChange =', open);
        if (!open) handleClose();
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        style={{ animation: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>{programId ? 'Edit Program' : 'Create New Program'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              {/* Title field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter program title" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the training program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Short Description */}
              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description (displayed in cards)" {...field} />
                    </FormControl>
                    <FormDescription>
                      A brief description of the program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed program description"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A detailed description of the program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail upload */}
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Image</FormLabel>
                    <div className="grid gap-4">
                      {thumbnailPreview ? (
                        <div className="relative aspect-video w-full max-w-[300px] overflow-hidden rounded-md border border-gray-200">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnailPreview(null);
                              field.onChange('');
                            }}
                            className="absolute top-2 right-2 rounded-full bg-gray-900/50 p-1 text-white hover:bg-gray-900/70"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 p-6">
                          <div className="mb-2 rounded-full bg-gray-100 p-2">
                            <Image className="h-6 w-6 text-gray-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">
                              Drag and drop an image, or click to browse
                            </p>
                            <p className="text-xs text-gray-400">
                              JPEG, JPG or PNG, max 5MB
                            </p>
                          </div>
                          <Input
                            id="thumbnail"
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            disabled={isUploading}
                            onClick={() => {
                              document.getElementById('thumbnail')?.click();
                            }}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading... {uploadProgress}%
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Completion Time */}
              <FormField
                control={form.control}
                name="completion_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Completion Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 60"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The estimated time it takes to complete the program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Difficulty */}
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Beginner" id="difficulty-beginner" />
                          <Label htmlFor="difficulty-beginner">Beginner</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Intermediate" id="difficulty-intermediate" />
                          <Label htmlFor="difficulty-intermediate">Intermediate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Advanced" id="difficulty-advanced" />
                          <Label htmlFor="difficulty-advanced">Advanced</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      The difficulty level of the program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Required Roles */}
              <FormField
                control={form.control}
                name="required_roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Roles</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {roles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`role-${role.id}`}
                              checked={field.value?.includes(role.id)}
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...currentValue, role.id]);
                                } else {
                                  field.onChange(currentValue.filter(id => id !== role.id));
                                }
                              }}
                              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                            />
                            <Label htmlFor={`role-${role.id}`}>{role.name}</Label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select the roles that can access this program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormDescription>
                      The status of the program
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Featured */}
              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Program</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_featured"
                          checked={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.checked);
                          }}
                          className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="is_featured">Featured Program (displayed prominently)</Label>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Whether the program should be displayed prominently
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form actions */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isUploading}
                  className="bg-gold-500 hover:bg-gold-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Program'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgramForm; 