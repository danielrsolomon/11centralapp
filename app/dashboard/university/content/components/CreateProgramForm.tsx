'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Image as ImageIcon, AlertCircle, Upload, Trash } from 'lucide-react';
import { Program } from '@/lib/hooks/usePrograms';
import { uploadImage, isPlaceholderImage } from '@/lib/supabase-storage';
import logger from '@/lib/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase-client';

interface CreateProgramFormProps {
  onSave: (programData: Partial<Program>) => Promise<any>;
  onCancel: () => void;
}

interface Department {
  id: string;
  name: string;
}

// Define simple toast function to replace the missing toast component
const useToast = () => {
  return {
    toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
      console.log(`${title}: ${description}`);
      alert(`${title}: ${description}`);
    }
  };
};

export default function CreateProgramForm({ onSave, onCancel }: CreateProgramFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    status: 'active',
    departments: [] as string[]
  });
  
  // Store file for upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Add state for departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const supabase = createClient();
  
  // Fetch departments on component mount
  useEffect(() => {
    async function fetchDepartments() {
      setLoadingDepartments(true);
      setDepartmentError(null);
      
      try {
        logger.debug('Fetching departments from API');
        const response = await fetch('/api/departments');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.departments || data.departments.length === 0) {
          logger.warn('No departments returned from API');
          // Fallback to direct Supabase query if the API returns empty
          await fetchDepartmentsDirectly();
          return;
        }
        
        logger.debug(`Successfully loaded ${data.departments.length} departments from API`);
        setDepartments(data.departments);
      } catch (err) {
        logger.error('Error fetching departments from API:', err instanceof Error ? err : new Error(String(err)));
        setDepartmentError('Failed to load departments. Trying direct database connection...');
        // Try direct Supabase query as fallback
        await fetchDepartmentsDirectly();
      } finally {
        setLoadingDepartments(false);
      }
    }
    
    // Add a direct fetching method as backup
    async function fetchDepartmentsDirectly() {
      try {
        // Create Supabase client using the public/anon key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase credentials not available');
        }
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        logger.debug('Attempting direct Supabase connection for departments');
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          logger.warn('No departments found in direct database query');
          // Create a default set of departments as last resort
          const defaultDepartments = [
            { id: 'all', name: 'All' },
            { id: 'management', name: 'Management' },
            { id: 'service', name: 'Service' },
            { id: 'security', name: 'Security' },
            { id: 'administration', name: 'Administration' }
          ];
          setDepartments(defaultDepartments);
          return;
        }
        
        logger.debug(`Successfully loaded ${data.length} departments directly from Supabase`);
        setDepartments(data);
        setDepartmentError(null);
      } catch (err) {
        logger.error('Error in direct department fetch:', err instanceof Error ? err : new Error(String(err)));
        
        // Last resort fallback to default departments
        const defaultDepartments = [
          { id: 'all', name: 'All' },
          { id: 'management', name: 'Management' },
          { id: 'service', name: 'Service' },
          { id: 'security', name: 'Security' },
          { id: 'administration', name: 'Administration' }
        ];
        
        setDepartments(defaultDepartments);
        setDepartmentError('Using default departments. Real data could not be loaded.');
      }
    }
    
    fetchDepartments();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Please select an image under 5MB.');
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Store the file for upload
      setImageFile(file);
      setFormData(prev => ({ ...prev, thumbnail_url: '' }));
    }
  };
  
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      status: 'active',
      departments: []
    });
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form
    if (!formData.title.trim()) {
      setError('Program title is required');
      return;
    }
    
    // Validate departments
    if (formData.departments.length === 0) {
      setError('Please select at least one department');
      return;
    }
    
    setIsCreating(true);
    
    try {
      let thumbnailUrl = '';
      
      if (imageFile) {
        setIsUploading(true);
        
        try {
          const uploadedUrl = await uploadThumbnail(imageFile);
          thumbnailUrl = uploadedUrl || '';
          setIsUploading(false);
        } catch (uploadError: any) {
          logger.error('Error uploading image:', uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
          setError('Failed to upload image. Please try again.');
          setIsCreating(false);
          setIsUploading(false);
          return;
        }
      }
      
      // Prepare program data
      const programData = {
        ...formData,
        thumbnail_url: thumbnailUrl
      };
      
      await onSave(programData);
      setShowSuccessMessage(true);
      resetForm();
      
      // Hide success message after a delay
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (err) {
      logger.error('Error creating program:', err instanceof Error ? err : new Error(String(err)));
      setError(`Failed to create program: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Add handler for department checkbox changes
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      // Create a copy of the current departments array
      const updatedDepartments = [...prev.departments];
      
      if (checked) {
        // Add the department if checked and not already in the array
        if (!updatedDepartments.includes(value)) {
          updatedDepartments.push(value);
        }
      } else {
        // Remove the department if unchecked
        const index = updatedDepartments.indexOf(value);
        if (index !== -1) {
          updatedDepartments.splice(index, 1);
        }
      }
      
      return { ...prev, departments: updatedDepartments };
    });
  };
  
  const uploadThumbnail = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `program-${Date.now()}.${fileExt}`;
      const filePath = `program-thumbnails/${fileName}`;
      
      // Try to upload to the avatars bucket which should exist in most Supabase projects
      // If upload fails, fall back to data URL
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Use 'avatars' bucket which should be available by default
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) {
        console.warn('Error uploading to avatars bucket:', uploadError);
        // Convert to data URL as a fallback
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars') // Make sure this matches the bucket used above
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      if (error instanceof Error) {
        toast({
          title: 'Error uploading image',
          description: error.message,
          variant: 'destructive',
        });
      }
      
      // Try to create a data URL as fallback
      try {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      } catch (dataUrlError) {
        console.error('Failed to create data URL fallback:', dataUrlError);
        return null;
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Create New Program</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              {error.includes(':') ? (
                <>
                  <p className="font-bold">{error.split(':')[0]}</p>
                  <p>{error.split(':').slice(1).join(':')}</p>
                </>
              ) : (
                <p>{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          <p>Program created successfully!</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Program Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter program title"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter program description"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Program Image
          </label>
          
          {/* Image upload area */}
          <div className="mb-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 transition-colors">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Image preview" 
                    className="mx-auto max-h-48 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove image"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-6 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-500">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
          
          {/* OR divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-sm text-gray-500 font-medium">OR</span>
            </div>
          </div>
          
          {/* Image URL input */}
          <div>
            <label htmlFor="thumbnail_url" className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <div className="flex">
              <input
                type="text"
                id="thumbnail_url"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleInputChange}
                className="flex-grow rounded-l-md border border-gray-300 shadow-sm px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Enter image URL"
                disabled={!!imageFile}
              />
              <div className="bg-gray-100 border border-gray-300 border-l-0 rounded-r-md px-4 flex items-center">
                <ImageIcon className="h-5 w-5 text-gray-500" />
              </div>
            </div>
            {formData.thumbnail_url && !imageFile && (
              <div className="mt-2 flex items-center">
                <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden relative">
                  <img
                    src={formData.thumbnail_url}
                    alt="Thumbnail preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Replace with placeholder if image fails to load
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/160x90?text=Error';
                    }}
                  />
                </div>
                <span className="ml-2 text-xs text-gray-500">Preview</span>
              </div>
            )}
            {formData.thumbnail_url && isPlaceholderImage(formData.thumbnail_url) && (
              <div className="mt-2 text-xs text-amber-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>This appears to be a placeholder image. Consider uploading an actual image.</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departments <span className="text-red-500">*</span>
            </label>
            {departmentError && (
              <div className="mb-2 text-xs text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{departmentError}</span>
              </div>
            )}
            
            <div className="mt-1 space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
              {loadingDepartments ? (
                <div className="flex items-center justify-center py-4">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#AE9773] mr-2"></span>
                  <span className="text-sm text-gray-500">Loading departments...</span>
                </div>
              ) : departments.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No departments available
                </div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`dept-${dept.id}`}
                      name="departments"
                      value={dept.name}
                      checked={formData.departments.includes(dept.name)}
                      onChange={handleDepartmentChange}
                      className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 rounded"
                    />
                    <label htmlFor={`dept-${dept.id}`} className="ml-2 block text-sm text-gray-700">
                      {dept.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            
            {formData.departments.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Selected: {formData.departments.join(', ')}
              </div>
            )}
            {formData.departments.length === 0 && (
              <div className="mt-2 text-xs text-red-500">
                Please select at least one department
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-3 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#AE9773] hover:bg-[#8E795D] text-white font-semibold rounded-md shadow transition-colors"
            disabled={isCreating || isUploading}
          >
            {isCreating ? (
              <span className="animate-pulse">
                {isUploading ? 'Uploading Image...' : 'Creating...'}
              </span>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Create Program</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 