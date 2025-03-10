'use client'

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface ProgramFormProps {
  onCancel: () => void;
  onSuccess: (program: any) => void;
}

export default function ProgramForm({ onCancel, onSuccess }: ProgramFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft',
    departments: [] as string[],
    thumbnail_url: ''
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  // Cleanup on component unmount
  useEffect(() => {
    // When component mounts, ensure body overflow is hidden to prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Log when the form is mounted/unmounted for debugging
    console.log('ProgramForm mounted');
    
    return () => {
      // When component unmounts, restore body overflow
      document.body.style.overflow = 'auto';
      console.log('ProgramForm unmounted');
      
      // Additional cleanup - if there are any lingering overlay elements with this ID
      // This helps prevent any "ghost" overlays from persisting
      const selfId = `program-form-${Date.now()}`;
      const overlay = document.getElementById(selfId);
      if (overlay) {
        console.log('Removing lingering program form overlay');
        overlay.remove();
      }
    };
  }, []);
  
  // Available departments
  const departmentOptions = ["All", "Management", "Service", "Security", "Administration"];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    console.log(`Department changed: ${value}, checked: ${checked}`);
    
    // Create a new departments array based on the current state
    let updatedDepartments = [...formData.departments];
    
    if (checked) {
      // If "All" is selected, clear other selections
      if (value === "All") {
        updatedDepartments = ["All"];
      } else {
        // If another department is selected while "All" is selected, remove "All"
        if (updatedDepartments.includes("All")) {
          updatedDepartments = updatedDepartments.filter(dept => dept !== "All");
        }
        
        // Add the newly selected department
        if (!updatedDepartments.includes(value)) {
          updatedDepartments.push(value);
        }
      }
    } else {
      // Remove the unchecked department
      updatedDepartments = updatedDepartments.filter(dept => dept !== value);
    }
    
    // Update the state with the new departments array
    setFormData(prev => ({
      ...prev,
      departments: updatedDepartments
    }));
  };
  
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setThumbnailFile(file);
    
    // Create a placeholder URL for the thumbnail
    const placeholderUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, thumbnail_url: placeholderUrl }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    console.log('Creating program with departments:', formData.departments);
    
    try {
      // Validate that we have at least one department selected
      if (formData.departments.length === 0) {
        alert("Please select at least one department access option.");
        setSubmitting(false);
        return;
      }
      
      // Generate a fake ID
      const fakeId = `dummy-${Date.now()}`;
      
      // Create a new program object
      const newProgram = {
        id: fakeId,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        departments: formData.departments,
        thumbnail_url: formData.thumbnail_url || 'https://via.placeholder.com/300x200?text=Program+Thumbnail',
        courses_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Program object created:', newProgram);
      
      // Call the success handler with the new program
      onSuccess(newProgram);
      
      // Show success message
      alert('Program created successfully!');
    } catch (error: any) {
      console.error('Error creating program:', error);
      alert(`Failed to create program: ${error?.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Generate a unique ID for this form instance for cleanup purposes
  const formId = `program-form-${Date.now()}`;
  
  return (
    <div id={formId} className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-auto" data-component="program-form">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Program</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Program Title*
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 bg-white border-2 border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium"
                placeholder="Enter program title"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 bg-white border-2 border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] h-24 text-gray-900 font-medium"
                placeholder="Enter program description"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Program Thumbnail
              </label>
              <input
                type="file"
                onChange={handleThumbnailUpload}
                className="block w-full text-gray-900 bg-white font-medium file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#AE9773] file:text-white hover:file:bg-[#8E795D]"
              />
              {formData.thumbnail_url && (
                <div className="mt-2">
                  <img src={formData.thumbnail_url} alt="Thumbnail Preview" className="h-20 w-20 object-cover rounded-md" />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Department Access
              </label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-100 rounded-md">
                {departmentOptions.map((dept) => (
                  <div key={dept} className="flex items-center bg-white p-3 rounded border border-gray-200 cursor-pointer hover:border-[#AE9773]">
                    <input
                      type="checkbox"
                      id={`dept-${dept}`}
                      checked={formData.departments.includes(dept)}
                      onChange={handleDepartmentChange}
                      value={dept}
                      className="h-4 w-4 text-[#AE9773] border-gray-300 rounded focus:ring-[#AE9773]"
                    />
                    <label htmlFor={`dept-${dept}`} className="ml-3 block text-gray-800 font-medium cursor-pointer">
                      {dept}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Status*
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-3 bg-white border-2 border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 border-2 border-gray-300 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#AE9773] text-white font-medium rounded-md hover:bg-[#8E795D]"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 