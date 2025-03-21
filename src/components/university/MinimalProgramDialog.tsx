import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from "lucide-react";
import { programService } from '../../services/programService';
import { useAuth } from '../../providers/auth-provider';

// Define the media bucket - this must be manually created in Supabase dashboard
// We don't attempt to create it in client code as it requires admin/service role permissions
const MEDIA_BUCKET = 'media';
const THUMBNAIL_FOLDER = 'program_thumbnails';

// Debug object to store diagnostic information
const DEBUG = {
  environment: {
    supabaseUrl: '',
    projectRef: ''
  },
  user: {
    authenticated: false,
    role: '',
    id: ''
  },
  errors: [] as string[]
};

interface Department {
  id: string;
  name: string;
}

interface MinimalProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (program: any) => void;
}

/**
 * MinimalProgramDialog - Enhanced with all fields while maintaining flicker-free behavior
 * 
 * This implementation:
 * 1. Maintains a single source of truth for dialog open state
 * 2. Adds all required fields (title, description, departments, thumbnail)
 * 3. Uses minimal state management and avoids animations
 * 4. Uses the service layer for database operations and file uploads
 * 5. Maintains the same UI behavior and error handling
 */
const MinimalProgramDialog: React.FC<MinimalProgramDialogProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  // Form state - all fields needed for a complete program
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  
  // Simple loading state inside the dialog - won't cause flicker
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get authentication context
  const { user } = useAuth();
  
  // File input ref for the thumbnail upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form state and fetch departments when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset form state on open
      setTitle('');
      setDescription('');
      setSelectedDepartments([]);
      setSelectAll(false);
      setThumbnail(null);
      setThumbnailPreview(null);
      setIsSubmitting(false);
      setError(null);
      
      // Fetch departments
      const fetchDepartments = async () => {
        try {
          // Use API service to fetch departments
          const response = await fetch('/api/departments');
          
          if (!response.ok) {
            console.error('Error fetching departments:', response.statusText);
            return;
          }
          
          const data = await response.json();
          
          // Filter out any department named 'All' to avoid conflict with Select All checkbox
          const filteredDepartments = data.data ? data.data.filter((dept: Department) => 
            dept.name.toLowerCase() !== 'all' && 
            dept.name.toLowerCase() !== 'select all'
          ) : [];
          
          console.log('Fetched departments (filtered):', filteredDepartments);
          setDepartments(filteredDepartments);
        } catch (err) {
          console.error('Unexpected error fetching departments:', err);
        }
      };
      
      fetchDepartments();
    }
  }, [isOpen]);

  // Handle thumbnail file selection
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setThumbnail(file);
      
      // Create a preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  // Clear the selected thumbnail
  const handleClearThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle Select All checkbox change
   * When checked, all departments are selected
   * When unchecked, all departments are deselected
   */
  const handleSelectAllChange = (checked: boolean) => {
    // Update the Select All checkbox state
    setSelectAll(checked);
    
    // If checked, select all departments, otherwise clear selections
    if (checked) {
      const allDepartmentIds = departments.map(dept => dept.id);
      setSelectedDepartments(allDepartmentIds);
    } else {
      setSelectedDepartments([]);
    }
  };

  /**
   * Toggle individual department selection
   * Also updates the Select All state based on current selections:
   * - If all departments are now selected, check Select All
   * - If any department is unselected, uncheck Select All
   */
  const toggleDepartment = (departmentId: string) => {
    setSelectedDepartments(prev => {
      let newSelection: string[];
      
      if (prev.includes(departmentId)) {
        // Remove the department from selection
        newSelection = prev.filter(id => id !== departmentId);
      } else {
        // Add the department to selection
        newSelection = [...prev, departmentId];
      }
      
      // Update the selectAll state based on whether all departments are selected
      // This ensures Select All is automatically checked/unchecked as needed
      setSelectAll(newSelection.length === departments.length);
      
      return newSelection;
    });
  };

  // Handle form submission using the service layer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      setError('Please enter a program title');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('MinimalProgramDialog: Creating program with service layer');
      
      // Create program with thumbnail using the service layer
      const { data: createdProgram, error: programError } = await programService.createProgramWithThumbnail(
        {
          title: title.trim(),
          description: description.trim(),
          status: 'active',
          departments: [], // Will be populated by the service using departmentIds parameter
          created_by: user?.id || '', // Use the current user's ID from auth context
        },
        thumbnail,
        selectedDepartments.length > 0 ? selectedDepartments : undefined
      );
      
      if (programError) {
        console.error('MinimalProgramDialog: Error creating program:', programError);
        setError(`Failed to create program: ${programError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      console.log('MinimalProgramDialog: Program created successfully:', createdProgram);
      
      // Call onCreated callback with the created program
      if (onCreated && createdProgram) {
        try {
          console.log('MinimalProgramDialog: Calling onCreated callback with new program:', createdProgram);
          onCreated(createdProgram);
        } catch (callbackError) {
          console.error('MinimalProgramDialog: Error in onCreated callback:', callbackError);
          // Still close the dialog even if callback fails
        }
      }
      
      // Close the dialog
      onClose();
    } catch (err) {
      console.error('MinimalProgramDialog: Critical error in form submission:', err);
      // Show user a friendly error message
      setError('An unexpected error occurred during program creation. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // Simple rendering approach - only render when isOpen is true
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px] bg-white border border-gray-200 shadow-lg"
        // Disable all animations and transitions to prevent flickering
        style={{ 
          animation: 'none', 
          transition: 'none',
          opacity: 1,
          backgroundColor: 'white'
        }}
      >
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-gray-900 text-xl">Create New Program</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-900 font-medium">Program Title</Label>
            <Input 
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter program title"
              required
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              disabled={isSubmitting}
            />
          </div>
          
          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description of the program"
              rows={4}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              disabled={isSubmitting}
            />
          </div>
          
          {/* Departments Selection */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Departments</Label>
            <div className="space-y-3 mt-1 border rounded-md p-3">
              {/* Select All Checkbox - manually added, not from database */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <input 
                  type="checkbox"
                  id="department-select-all"
                  checked={selectAll}
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <Label 
                  htmlFor="department-select-all"
                  className="text-sm font-medium cursor-pointer select-none"
                >
                  Select All
                </Label>
              </div>
              
              {/* Department list with native checkboxes for better interactivity */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {departments.map(department => (
                  <div key={department.id} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id={`department-${department.id}`}
                      checked={selectedDepartments.includes(department.id)}
                      onChange={() => toggleDepartment(department.id)}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <Label 
                      htmlFor={`department-${department.id}`}
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      {department.name}
                    </Label>
                  </div>
                ))}
              </div>
              
              {/* Show loading message if departments are being fetched */}
              {departments.length === 0 && (
                <p className="text-sm text-gray-500">Loading departments...</p>
              )}
            </div>
          </div>
          
          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail" className="text-gray-900 font-medium">Program Thumbnail</Label>
            <div className="mt-1 flex items-center gap-x-3">
              <Input
                ref={fileInputRef}
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="bg-white border-gray-300 text-gray-900"
                disabled={isSubmitting}
              />
              {thumbnail && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClearThumbnail}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              )}
            </div>
            
            {/* Thumbnail Preview */}
            {thumbnailPreview && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 mb-1">Preview:</p>
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="max-h-32 max-w-full object-contain border rounded"
                />
              </div>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          
          <DialogFooter className="mt-6 border-t pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Program'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MinimalProgramDialog; 