'use client'

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller, UseFormRegister, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

/**
 * Database type definition for Supabase
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      programs: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          departments: string[]
          thumbnail_url: string | null
          created_at: string
          updated_at: string
          courses_count?: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status: string
          departments: string[]
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          departments?: string[]
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

/**
 * Define the validation schema with Zod
 * Provides validation rules for all form fields
 */
const programSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  departments: z.array(z.string()).min(1, { message: 'At least one department must be selected' }),
  thumbnail_url: z.string().optional()
});

/**
 * Define the form data type based on the schema
 */
type ProgramFormData = z.infer<typeof programSchema>;

/**
 * FormField - Wrapper component for form fields with consistent styling and error handling
 */
const FormField = ({ 
  label, 
  required = false,
  error,
  children
}: { 
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-800 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className={error ? 'relative' : ''}>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-500 font-medium">
          {error}
        </p>
      )}
    </div>
  </div>
);

/**
 * FormInput - Reusable input component with error styling
 */
const FormInput = ({
  register,
  name,
  error,
  ...props
}: {
  register: UseFormRegister<ProgramFormData>;
  name: keyof ProgramFormData;
  error?: string;
  [key: string]: any;
}) => (
  <input
    {...register(name)}
    className={`w-full p-3 bg-white border-2 ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium transition-colors`}
    {...props}
  />
);

/**
 * FormTextarea - Reusable textarea component with error styling
 */
const FormTextarea = ({
  register,
  name,
  error,
  ...props
}: {
  register: UseFormRegister<ProgramFormData>;
  name: keyof ProgramFormData;
  error?: string;
  [key: string]: any;
}) => (
  <textarea
    {...register(name)}
    className={`w-full p-3 bg-white border-2 ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] h-24 text-gray-900 font-medium transition-colors`}
    {...props}
  />
);

/**
 * FormSelect - Reusable select component with error styling
 */
const FormSelect = ({
  register,
  name,
  options,
  error,
  ...props
}: {
  register: UseFormRegister<ProgramFormData>;
  name: keyof ProgramFormData;
  options: { value: string; label: string }[];
  error?: string;
  [key: string]: any;
}) => (
  <select
    {...register(name)}
    className={`w-full p-3 bg-white border-2 ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium transition-colors`}
    aria-invalid={!!error}
    {...props}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

/**
 * FormCheckboxGroup - Custom component for department selection with special "All" logic
 */
const FormCheckboxGroup = ({
  control,
  name,
  options,
  error
}: {
  control: Control<ProgramFormData>;
  name: 'departments';
  options: string[];
  error?: string;
}) => (
  <div className={`grid grid-cols-2 gap-3 p-3 rounded-md transition-colors ${
    error ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50 border border-gray-200'
  }`}>
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <>
          {options.map((option) => (
            <div 
              key={option} 
              className={`flex items-center bg-white p-3 rounded border ${
                field.value.includes(option) 
                  ? 'border-[#AE9773] bg-[#AE9773]/5' 
                  : error ? 'border-red-100' : 'border-gray-200'
              } cursor-pointer hover:border-[#AE9773] transition-colors`}
              onClick={() => {
                const newValue = [...field.value];
                if (option === "All") {
                  // If "All" is selected, clear other selections or deselect All
                  field.onChange(newValue.includes("All") ? [] : ["All"]);
                } else {
                  // Remove "All" if it's in the array
                  const withoutAll = newValue.filter(item => item !== "All");
                  
                  // Toggle the selected option
                  const isSelected = withoutAll.includes(option);
                  const updatedValue = isSelected
                    ? withoutAll.filter(item => item !== option)
                    : [...withoutAll, option];
                  
                  // If no departments are selected after the update, select "All"
                  if (updatedValue.length === 0) {
                    field.onChange(["All"]);
                  } else {
                    field.onChange(updatedValue);
                  }
                }
              }}
            >
              <input
                type="checkbox"
                id={`dept-${option}`}
                checked={field.value.includes(option)}
                onChange={() => {}} // Handled by parent div click
                className={`h-4 w-4 border-gray-300 rounded focus:ring-[#AE9773] ${
                  field.value.includes(option) ? 'text-[#AE9773]' : ''
                }`}
              />
              <label htmlFor={`dept-${option}`} className="ml-3 block text-gray-800 font-medium cursor-pointer">
                {option}
              </label>
            </div>
          ))}
        </>
      )}
    />
  </div>
);

/**
 * FormFileUpload - Handles file uploads with validation and preview
 */
const FormFileUpload = ({
  control,
  name,
  error,
  ...props
}: {
  control: Control<ProgramFormData>;
  name: 'thumbnail_url';
  error?: string;
  [key: string]: any;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <div className={`${error || uploadError ? 'border-red-500' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={(e) => {
              setUploadError(null);
              const file = e.target.files?.[0];
              if (!file) return;
              
              // Validate file type explicitly
              const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
              if (!validTypes.includes(file.type)) {
                setUploadError('Please select a valid image file (PNG, JPG, JPEG)');
                
                // Reset the file input
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                return;
              }
              
              // Validate file size (max 5MB)
              const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
              if (file.size > maxSizeInBytes) {
                setUploadError('File size exceeds the maximum limit of 5MB');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                return;
              }
              
              // Create a blob URL for preview
              const blobUrl = URL.createObjectURL(file);
              onChange(blobUrl);
            }}
            className={`block w-full text-gray-900 bg-white font-medium
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
              file:text-sm file:font-medium file:bg-[#AE9773] file:text-white 
              hover:file:bg-[#8E795D] transition-colors
              ${error || uploadError ? 'border-red-500' : ''}`}
            aria-invalid={error || uploadError ? "true" : "false"}
            aria-describedby={error || uploadError ? `${name}-error` : undefined}
            {...props}
          />
          
          {(error || uploadError) && (
            <p id={`${name}-error`} className="mt-1 text-sm text-red-500">
              {error || uploadError}
            </p>
          )}
          
          {value && (
            <div className="mt-2">
              <img 
                src={value} 
                alt="Thumbnail Preview" 
                className="h-24 w-24 object-cover rounded-md border border-gray-300 shadow-sm" 
              />
              <button 
                type="button"
                onClick={() => {
                  onChange('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  setUploadError(null);
                }}
                className="mt-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                aria-label="Remove thumbnail"
              >
                Remove thumbnail
              </button>
            </div>
          )}
          
          <p className="mt-1 text-xs text-gray-500">
            Accepted formats: PNG, JPG, JPEG (max 5MB)
          </p>
        </div>
      )}
    />
  );
};

/**
 * FormActions - Form buttons component
 */
const FormActions = ({ 
  onCancel, 
  isSubmitting 
}: { 
  onCancel: () => void;
  isSubmitting: boolean;
}) => (
  <div className="flex justify-end space-x-3 mt-6">
    <button
      type="button"
      onClick={onCancel}
      className="px-5 py-2.5 border-2 border-gray-300 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
      disabled={isSubmitting}
    >
      Cancel
    </button>
    <button
      type="submit"
      className="px-5 py-2.5 bg-[#AE9773] text-white font-medium rounded-md hover:bg-[#8E795D] focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating...
        </span>
      ) : (
        'Create Program'
      )}
    </button>
  </div>
);

/**
 * Props for the main ProgramForm component
 */
interface ProgramFormProps {
  onCancel: () => void;
  onSuccess: (program: any) => void;
}

/**
 * Main ProgramForm component - Fully integrated with Supabase, form validation, and accessibility
 */
export default function ProgramForm({ onCancel, onSuccess }: ProgramFormProps) {
  // Add refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  
  // State for departments
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  
  // Fetch departments from Supabase
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentLoading(true);
      setDepartmentError(null);
      
      try {
        // Initialize Supabase client
        const supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        // Fetch departments from the departments table
        const { data, error } = await supabase
          .from('departments')
          .select('name')
          .order('name');
          
        if (error) {
          console.error('Error fetching departments:', error);
          setDepartmentError('Failed to load departments. Please try again.');
          // Set default departments as fallback
          setDepartmentOptions(['All', 'Management', 'Service', 'Security', 'Administration']);
          return;
        }
        
        if (!data || data.length === 0) {
          console.warn('No departments found in the database');
          // Set default departments as fallback
          setDepartmentOptions(['All', 'Management', 'Service', 'Security', 'Administration']);
          return;
        }
        
        // Extract department names and set to state
        const departmentNames = data.map(dept => dept.name);
        console.log('Departments loaded:', departmentNames);
        setDepartmentOptions(departmentNames);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        setDepartmentError('An unexpected error occurred. Please try again.');
        // Set default departments as fallback
        setDepartmentOptions(['All', 'Management', 'Service', 'Security', 'Administration']);
      } finally {
        setDepartmentLoading(false);
      }
    };
    
    fetchDepartments();
  }, []);
  
  // Status options for dropdown
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' }
  ];
  
  // Initialize React Hook Form with Zod schema
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors, isSubmitting }
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
      departments: [],
      thumbnail_url: ''
    }
  });
  
  // Handle form submission with Supabase integration
  const onSubmit = async (data: ProgramFormData) => {
    try {
      // Initialize Supabase client
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // First, handle the thumbnail upload if there is one
      let finalThumbnailUrl = '';
      
      if (data.thumbnail_url && data.thumbnail_url.startsWith('blob:')) {
        // We have a blob URL from the file upload, need to convert to a file
        const fileResponse = await fetch(data.thumbnail_url);
        const fileBlob = await fileResponse.blob();
        
        // Server-side validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(fileBlob.type)) {
          throw new Error("Invalid file type. Only JPEG, JPG, and PNG are allowed.");
        }
        
        // Double-check file size server-side
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        if (fileBlob.size > maxSizeInBytes) {
          throw new Error("File size exceeds the maximum limit of 5MB");
        }
        
        // Generate a unique filename
        const fileExt = fileBlob.type.split('/')[1] || 'jpg';
        const fileName = `thumbnail_${Date.now()}.${fileExt}`;
        const filePath = `program_thumbnails/${fileName}`;
        
        // Upload to Supabase Storage - use your actual bucket name
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('public') // Replace with your actual bucket name
          .upload(filePath, fileBlob, {
            contentType: fileBlob.type,
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
        }
        
        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase
          .storage
          .from('public') // Replace with your actual bucket name
          .getPublicUrl(filePath);
        
        finalThumbnailUrl = publicUrlData.publicUrl;
      } else {
        // Use the existing URL if it's not a blob URL (e.g., default image or already uploaded)
        finalThumbnailUrl = data.thumbnail_url || 'https://via.placeholder.com/300x200?text=Program+Thumbnail';
      }
      
      // Prepare the program data for insertion
      const programData = {
        title: data.title,
        description: data.description || '',
        status: data.status,
        departments: data.departments,
        thumbnail_url: finalThumbnailUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert the program into the database
      const { data: program, error } = await supabase
        .from('programs')
        .insert(programData)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error creating program:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Call the success handler with the actual program from the database
      onSuccess(program);
    } catch (error: any) {
      console.error('Error creating program:', error);
      alert(`Failed to create program: ${error?.message || 'Please try again.'}`);
    }
  };
  
  // Accessibility and focus management
  useEffect(() => {
    // When component mounts, ensure body overflow is hidden to prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Set focus to the first field when the modal opens
    setTimeout(() => {
      // Delay focus slightly to ensure the modal is fully rendered
      if (initialFocusRef.current) {
        initialFocusRef.current.focus();
      }
    }, 100);
    
    // Handle keyboard navigation (Escape to close)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on escape
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      
      // Only trap focus if Tab is pressed
      if (e.key !== 'Tab') return;
      
      // Trap focus inside the modal
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        // If shift+tab on first element, move to last element
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // If tab on last element, move to first element
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Store the previously focused element to restore focus when modal closes
    const previouslyFocused = document.activeElement as HTMLElement;
    
    return () => {
      // Restore focus to the element that was focused before the modal opened
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
      
      // When component unmounts, restore body overflow
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleKeyDown);
      
      // Additional cleanup
      const selfId = `program-form-${Date.now()}`;
      const overlay = document.getElementById(selfId);
      if (overlay) {
        overlay.remove();
      }
    };
  }, [onCancel]);
  
  const formId = `program-form-${Date.now()}`;
  
  return (
    <div 
      id={formId} 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-auto" 
      data-component="program-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fadeIn" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-bold text-gray-900">Create New Program</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Close dialog"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField label="Program Title" required error={errors.title?.message}>
              <FormInput 
                register={register} 
                name="title" 
                placeholder="Enter program title"
                error={errors.title?.message}
                aria-required="true"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
                ref={initialFocusRef} // Set initial focus reference
              />
            </FormField>
            
            <FormField label="Description" error={errors.description?.message}>
              <FormTextarea 
                register={register} 
                name="description" 
                placeholder="Enter program description"
                error={errors.description?.message}
                aria-invalid={!!errors.description}
              />
            </FormField>
            
            <FormField label="Program Thumbnail" error={errors.thumbnail_url?.message}>
              <FormFileUpload 
                control={control} 
                name="thumbnail_url"
                error={errors.thumbnail_url?.message}
              />
            </FormField>
            
            <FormField label="Department Access" required error={errors.departments?.message}>
              {departmentLoading ? (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="animate-spin h-4 w-4 border-2 border-[#AE9773] border-t-transparent rounded-full"></div>
                  <span className="text-gray-500 text-sm">Loading departments...</span>
                </div>
              ) : departmentError ? (
                <div>
                  <FormCheckboxGroup 
                    control={control} 
                    name="departments" 
                    options={departmentOptions}
                    error={errors.departments?.message}
                  />
                  <p className="mt-1 text-xs text-amber-600">{departmentError}</p>
                </div>
              ) : (
                <FormCheckboxGroup 
                  control={control} 
                  name="departments" 
                  options={departmentOptions}
                  error={errors.departments?.message}
                />
              )}
            </FormField>
            
            <FormField label="Status" required error={errors.status?.message}>
              <FormSelect 
                register={register} 
                name="status"
                options={statusOptions}
                error={errors.status?.message}
                aria-invalid={!!errors.status}
              />
            </FormField>
            
            <FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
          </form>
        </div>
      </div>
    </div>
  );
}