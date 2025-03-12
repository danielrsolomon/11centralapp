'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Image as ImageIcon, AlertCircle, Upload, Trash } from 'lucide-react';
import { Program } from '@/lib/hooks/usePrograms';
import { uploadImage, deleteImage, isPlaceholderImage } from '@/lib/supabase-storage';
import logger from '@/lib/logger';

interface EditProgramFormProps {
  program: Program;
  onSave: (programId: string, programData: Partial<Program>) => Promise<any>;
  onCancel: () => void;
}

interface Department {
  id: string;
  name: string;
}

export default function EditProgramForm({ program, onSave, onCancel }: EditProgramFormProps) {
  const [formData, setFormData] = useState({
    title: program.title || '',
    description: program.description || '',
    thumbnail_url: program.thumbnail_url || '',
    status: program.status || 'active',
    department_name: program.department_name || ''
  });
  
  // Store file for upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState<string | null>(program.thumbnail_url || null);
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Add state for departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  
  useEffect(() => {
    // Reset form data if program changes
    setFormData({
      title: program.title || '',
      description: program.description || '',
      thumbnail_url: program.thumbnail_url || '',
      status: program.status || 'active',
      department_name: program.department_name || ''
    });
    setOriginalThumbnailUrl(program.thumbnail_url || null);
    setImageFile(null);
    setImagePreview(null);
  }, [program]);
  
  // Fetch departments on component mount
  useEffect(() => {
    async function fetchDepartments() {
      setLoadingDepartments(true);
      setDepartmentError(null);
      
      try {
        const response = await fetch('/api/departments');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setDepartments(data.departments || []);
      } catch (err) {
        logger.error('Error fetching departments:', err instanceof Error ? err : new Error(String(err)));
        setDepartmentError('Failed to load departments. Please try again.');
      } finally {
        setLoadingDepartments(false);
      }
    }
    
    fetchDepartments();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Program title is required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    setShowSuccessMessage(false);
    
    try {
      let thumbnailUrl = formData.thumbnail_url;
      
      // Upload image if one was selected
      if (imageFile) {
        setIsUploading(true);
        
        try {
          thumbnailUrl = await uploadImage(imageFile);
        } catch (uploadErr) {
          logger.error('Failed to upload image', uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr)));
          
          // Display user-friendly error message
          const errorMessage = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          
          // Check for specific types of errors to provide more helpful messages
          if (errorMessage.includes('permission') || errorMessage.includes('access')) {
            setError(
              'Storage Permission Error: Failed to upload image due to permission issues. Please contact your administrator to check the Supabase Storage RLS policies. Technical details: ' + errorMessage
            );
          } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            setError(
              'Network Error: Failed to upload image due to network issues. Please check your internet connection and try again.'
            );
          } else {
            setError(
              'Image Upload Failed: Please check your file and try again. Technical details: ' + errorMessage
            );
          }
          
          // Stop form submission if image upload failed
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        
        setIsUploading(false);
      }
      
      // Delete old image if it was changed and isn't a placeholder
      if (
        imageFile &&
        program.thumbnail_url &&
        thumbnailUrl !== program.thumbnail_url &&
        !isPlaceholderImage(program.thumbnail_url)
      ) {
        try {
          await deleteImage(program.thumbnail_url);
          logger.debug('Old image deleted successfully', { url: program.thumbnail_url });
        } catch (deleteErr) {
          // Log the error but don't stop the update
          logger.error('Failed to delete old image', deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)));
        }
      }
      
      // Prepare program data
      const programData: Partial<Program> = {
        ...formData,
        thumbnail_url: thumbnailUrl
      };
      
      // Save the program
      await onSave(program.id, programData);
      
      // Show success message
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
    } catch (err) {
      logger.error('Failed to update program', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Failed to update program');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Edit Program</h2>
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
          <p>Program updated successfully!</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Program Image
          </label>
          
          {/* Current image or placeholder */}
          {!imagePreview && formData.thumbnail_url && (
            <div className="mb-3">
              <div className="relative inline-block">
                <img 
                  src={formData.thumbnail_url} 
                  alt="Current thumbnail" 
                  className="h-40 w-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    // Replace with placeholder if image fails to load
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/160x90?text=E11';
                  }}
                />
                
                {/* Show badge for placeholder images */}
                {isPlaceholderImage(formData.thumbnail_url) && (
                  <div className="absolute top-0 right-0 m-2">
                    <div className="bg-amber-100 border border-amber-200 rounded-full px-2 py-1 text-xs text-amber-800">
                      Replace Placeholder
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
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
                    Click to {formData.thumbnail_url ? 'replace' : 'upload'} image
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
            
            {formData.thumbnail_url && !imageFile && isPlaceholderImage(formData.thumbnail_url) && (
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
            <label htmlFor="department_name" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            {departmentError && (
              <div className="mb-2 text-xs text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{departmentError}</span>
              </div>
            )}
            <select
              id="department_name"
              name="department_name"
              value={formData.department_name}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              disabled={loadingDepartments}
            >
              <option value="">Select a department</option>
              <option value="All Staff">All Staff</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            {loadingDepartments && (
              <div className="mt-1 text-xs text-gray-500">
                Loading departments...
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center"
            disabled={isSaving || isUploading}
          >
            {isSaving ? (
              <span className="animate-pulse">
                {isUploading ? 'Uploading Image...' : 'Saving...'}
              </span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 