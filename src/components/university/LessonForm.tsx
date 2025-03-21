import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Loader2, Search, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { lessonService } from '../../services/lessonService';
import { courseService } from '../../services/courseService';
import api from '../../services/apiService';
import { toast } from 'sonner';
import { useAuth } from '../../providers/auth-provider';
import { Lesson } from '../../types/database.types';

// Define validation schema for the form
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  instructors: z.array(z.string()).min(1, 'At least one instructor is required'),
  course_id: z.string().min(1, 'Course is required'),
  completion_time: z.number().positive('Completion time must be positive').optional(),
  thumbnail: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']).default('draft')
});

type FormValues = z.infer<typeof formSchema>;

interface Course {
  id: string;
  title: string;
  program_id: string;
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email: string;
}

interface LessonFormProps {
  lessonId?: string;
  courseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  lessonId,
  courseId,
  isOpen,
  onClose,
  onSave,
}) => {
  console.log('LessonForm: isOpen =', isOpen);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { user } = useAuth(); // Get current user

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      instructors: [],
      course_id: courseId || '',
      completion_time: undefined,
      thumbnail: '',
      status: 'draft'
    },
  });

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  // Fetch courses and instructors in one combined effect
  useEffect(() => {
    // Only fetch data when the dialog is open
    if (!isOpen) return;
    
    console.log('LessonForm: Fetching data...');
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // REFACTORED: Fetch courses and instructors in parallel using API calls
        const coursesPromise = api.get('/university/courses');
        
        // FIXED: Don't use params, instead construct the URL with query string
        const roleUsersPromise = api.get('/admin/users/with-roles/TrainingManager,SeniorManager,Manager');
        
        // REFACTORED: If editing, also fetch lesson data using lessonService
        const lessonPromise = lessonId 
          ? lessonService.getLessonById(lessonId) 
          : Promise.resolve(null);
          
        // Wait for all requests to complete
        const [coursesResponse, roleUsersResponse, lessonResponse] = 
          await Promise.allSettled([coursesPromise, roleUsersPromise, lessonPromise]);
          
        // Process courses
        if (coursesResponse.status === 'fulfilled' && 
            coursesResponse.value.success) {
          setCourses(coursesResponse.value.data);
        }
        
        // Process instructors
        if (roleUsersResponse.status === 'fulfilled' && 
            roleUsersResponse.value.success) {
          setInstructors(roleUsersResponse.value.data);
        }
        
        // Process lesson data if editing
        if (lessonResponse.status === 'fulfilled' && 
            lessonResponse.value && 
            lessonResponse.value.data) {
          const data = lessonResponse.value.data;
          
          form.reset({
            title: data.title,
            description: data.description,
            instructors: Array.isArray(data.instructors) ? data.instructors : [],
            course_id: data.course_id,
            completion_time: data.completion_time,
            thumbnail: data.thumbnail,
            status: data.status
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
        console.log('LessonForm: Data fetch complete');
      }
    };

    fetchData();
  }, [isOpen, lessonId, form]);

  // Filter instructors based on search term
  const filteredInstructors = instructors.filter(instructor => {
    const fullName = `${instructor.first_name} ${instructor.last_name}`.toLowerCase();
    const email = instructor.email.toLowerCase();
    const term = searchTerm.toLowerCase();
    
    return fullName.includes(term) || email.includes(term);
  });

  // Get instructor details by ID
  const getInstructorById = (id: string) => {
    return instructors.find(instructor => instructor.id === id);
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // REFACTORED: Get the next sequence order using courseService
      let nextSequence = 1;
      if (!lessonId) {
        const { data: existingLessons, error: sequenceError } = await lessonService.getLessonsByCourse(values.course_id);
        
        if (sequenceError) throw sequenceError;
        
        if (existingLessons && existingLessons.length > 0) {
          // FIXED: Add proper type for lesson parameter
          nextSequence = Math.max(...existingLessons.map((lesson: Lesson) => lesson.sequence_order || 0)) + 1;
        }
      }

      if (lessonId) {
        // REFACTORED: Update existing lesson using lessonService
        const { error } = await lessonService.updateLesson(lessonId, {
          title: values.title,
          description: values.description,
          instructors: values.instructors,
          course_id: values.course_id,
          status: values.status
        });

        if (error) throw error;
        toast.success('Lesson updated successfully');
      } else {
        // REFACTORED: Create new lesson using lessonService
        const { error } = await lessonService.createLesson({
          title: values.title,
          description: values.description,
          instructors: values.instructors,
          course_id: values.course_id,
          sequence_order: nextSequence,
          status: 'draft'
        });

        if (error) throw error;
        toast.success('Lesson created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Failed to save lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    console.log('LessonForm: handleClose called');
    onClose();
  };

  // Generate initials from name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Simple rendering approach - only render when isOpen is true
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog 
      open={isOpen}
      onOpenChange={(open) => {
        console.log('LessonForm: Dialog onOpenChange =', open);
        if (!open) handleClose();
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        style={{ animation: 'none' }}
      >
        <DialogHeader>
          <DialogTitle>{lessonId ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Course selection */}
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!!courseId} // Disable if courseId is provided as prop
                    >
                      <option value="" disabled>Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    <FormDescription>
                      The course this lesson belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Title field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lesson title" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the lesson
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the lesson"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description of what the lesson covers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Instructors field */}
              <FormField
                control={form.control}
                name="instructors"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Instructors</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="justify-between w-full font-normal"
                          >
                            {field.value.length > 0
                              ? `${field.value.length} instructor${field.value.length > 1 ? 's' : ''} selected`
                              : "Select instructors..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[400px]">
                        <Command>
                          <CommandInput 
                            placeholder="Search instructors..." 
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No instructors found.</CommandEmpty>
                            <CommandGroup>
                              {filteredInstructors.map((instructor) => (
                                <CommandItem
                                  key={instructor.id}
                                  value={instructor.id}
                                  onSelect={() => {
                                    const isSelected = field.value.includes(instructor.id);
                                    const newValue = isSelected
                                      ? field.value.filter(x => x !== instructor.id)
                                      : [...field.value, instructor.id];
                                    field.onChange(newValue);
                                  }}
                                >
                                  <div className="flex items-center space-x-2 w-full">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage 
                                        src={instructor.avatar_url || ''} 
                                        alt={`${instructor.first_name} ${instructor.last_name}`} 
                                      />
                                      <AvatarFallback>
                                        {getInitials(instructor.first_name, instructor.last_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-sm">{`${instructor.first_name} ${instructor.last_name}`}</p>
                                      <p className="text-xs text-muted-foreground">{instructor.email}</p>
                                    </div>
                                    <div className="flex h-5 w-5 items-center justify-center">
                                      {field.value.includes(instructor.id) && (
                                        <span className="h-2 w-2 rounded-full bg-primary"></span>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Display selected instructors */}
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {field.value.map(instructorId => {
                          const instructor = getInstructorById(instructorId);
                          return instructor ? (
                            <div 
                              key={instructorId} 
                              className="flex items-center space-x-1 rounded-full bg-gold-100 px-3 py-1 text-sm"
                            >
                              <Avatar className="h-5 w-5 mr-1">
                                <AvatarImage 
                                  src={instructor.avatar_url || ''} 
                                  alt={`${instructor.first_name} ${instructor.last_name}`} 
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(instructor.first_name, instructor.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{`${instructor.first_name} ${instructor.last_name}`}</span>
                              <button
                                type="button"
                                className="ml-1 rounded-full text-gold-600 hover:bg-gold-200 focus:outline-none"
                                onClick={() => {
                                  field.onChange(field.value.filter(id => id !== instructorId));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    <FormDescription>
                      Select the instructors for this lesson
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
                  disabled={isSubmitting}
                  className="bg-gold-500 hover:bg-gold-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Lesson'
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

export default LessonForm; 