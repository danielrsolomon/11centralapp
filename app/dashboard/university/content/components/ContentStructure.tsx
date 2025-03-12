'use client'

import { useState, useEffect, useCallback } from 'react'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { usePrograms, Program } from '@/lib/hooks/usePrograms'
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash,
  Eye,
  BookOpen,
  Layers,
  File,
  Archive,
  AlertCircle,
  X
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import CreateProgramForm from './CreateProgramForm'
import EditProgramForm from './EditProgramForm'
import { isPlaceholderImage } from '@/lib/supabase-storage'
import CourseForm from './CourseForm'

// Define simple toast function to replace the missing toast component
const useToast = () => {
  return {
    toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
      console.log(`${title}: ${description}`);
      alert(`${title}: ${description}`);
    }
  };
};

// Extend the Program type to include courses
interface ExtendedProgram extends Program {
  courses?: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
  }>;
}

/**
 * ContentStructureComponent
 * 
 * Main component for managing the structure of training content.
 * Displays programs, courses, lessons, and modules in a hierarchical view.
 * Provides CRUD functionality based on user permissions.
 */
export default function ContentStructureComponent({ 
  showCreateProgramOnLoad = false,
  onArchiveProgram = (program: Program) => {}
}: { 
  showCreateProgramOnLoad?: boolean,
  onArchiveProgram?: (program: Program) => void
}) {
  // Component state
  const [instanceKey] = useState(Date.now()); // Used for forcing re-renders
  const [showProgramForm, setShowProgramForm] = useState(showCreateProgramOnLoad);
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Program being edited/deleted
  const [programToEdit, setProgramToEdit] = useState<Program | null>(null);
  const [programToArchive, setProgramToArchive] = useState<Program | null>(null);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    status: 'active',
    thumbnail: null as File | null
  });
  
  // Loading state for specific operations
  const [archiving, setArchiving] = useState(false);
  
  // Hooks
  const perf = usePerformanceMonitoring('ContentStructure');
  const { isAdmin, isManager, canCreate, canUpdate, canDelete, loading: permissionsLoading } = useUserPermissions();
  
  // Fetch programs with the usePrograms hook
  const { 
    programs, 
    isLoading: loadingPrograms, 
    error: programsError,
    createProgram,
    updateProgram,
    archiveProgram,
    refreshPrograms
  } = usePrograms({
    includeArchived: false,
    adminView: true,
    limit: 100,
    debug: true // Enable debug mode to get more information
  });
  
  // Add this before the return statement within the ContentStructure component
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [activeProgramForCourse, setActiveProgramForCourse] = useState<Program | null>(null);
  
  const { toast } = useToast();
  
  // Effect to initialize program form if needed
  useEffect(() => {
    if (showCreateProgramOnLoad) {
      setShowProgramForm(true);
    }
  }, [showCreateProgramOnLoad]);
  
  // Effect to handle API errors
  useEffect(() => {
    if (programsError) {
      logger.error('Error loading programs from API:', programsError);
      setError(programsError instanceof Error ? programsError.message : 'Error loading programs');
    }
  }, [programsError]);
  
  // Effect to log programs loaded for debugging
  useEffect(() => {
    if (programs?.length) {
      logger.debug('Programs loaded successfully', { 
        count: programs.length,
        firstProgram: programs[0]?.title 
      });
    }
  }, [programs]);
  
  /**
   * Toggle program expansion
   */
  const toggleProgram = (programId: string) => {
    setExpandedPrograms(prev => 
      prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };
  
  /**
   * Toggle course expansion
   */
  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };
  
  /**
   * Toggle lesson expansion
   */
  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => 
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };
  
  /**
   * Show create program form
   */
  const handleShowCreateProgram = () => {
    setProgramToEdit(null); // Ensure we're not in edit mode
    setShowProgramForm(true);
  };
  
  /**
   * View program details
   */
  const handleViewProgram = (program: Program) => {
    window.open(`/dashboard/university/program/${program.id}`, '_blank');
  };
  
  /**
   * Edit program
   */
  const handleEditProgram = (program: Program) => {
    setProgramToEdit(program);
    setShowProgramForm(false); // Close create form if open
  };
  
  /**
   * Archive program
   */
  const handleArchiveProgram = (program: Program) => {
    setProgramToArchive(program);
    setShowConfirmArchive(true);
  };
  
  /**
   * Confirm and execute program archiving
   */
  const confirmArchiveProgram = async () => {
    if (!programToArchive) return;
    
    setArchiving(true);
    setError(null);
    
    try {
      logger.debug('Archiving program', { id: programToArchive.id, title: programToArchive.title });
      await archiveProgram(programToArchive.id);
      
      // Call the callback
      onArchiveProgram(programToArchive);
      
      // Close the dialog
      setShowConfirmArchive(false);
      setProgramToArchive(null);
    } catch (error) {
      logger.error('Error archiving program', error as Error);
      setError('Failed to archive program. Please try again.');
    } finally {
      setArchiving(false);
    }
  };
  
  /**
   * Cancel program archiving
   */
  const handleCancelArchive = () => {
    setShowConfirmArchive(false);
    setProgramToArchive(null);
  };
  
  /**
   * Handle create program submission
   */
  const handleCreateProgramSubmit = async (programData: Partial<Program>) => {
    try {
      logger.debug('Creating program', { title: programData.title });
      const createdProgram = await createProgram(programData);
      
      // Expand the new program
      setExpandedPrograms(prev => [...prev, createdProgram.id]);
      
      return createdProgram;
    } catch (error) {
      logger.error('Error creating program', error as Error);
      throw error;
    }
  };
  
  /**
   * Handle edit program submission
   */
  const handleEditProgramSubmit = async (programId: string, programData: Partial<Program>) => {
    try {
      logger.debug('Updating program', { id: programId, fields: Object.keys(programData) });
      const updatedProgram = await updateProgram(programId, programData);
      
      // Clear edit state
      setProgramToEdit(null);
      
      return updatedProgram;
    } catch (error) {
      logger.error('Error updating program', error as Error);
      throw error;
    }
  };
  
  /**
   * Cancel program editing/creation
   */
  const handleCancelForm = () => {
    setProgramToEdit(null);
    setShowProgramForm(false);
  };
  
  /**
   * Get status badge component
   */
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Active</span>;
      case 'draft':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Draft</span>;
      case 'archived':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>;
      default:
        return null;
    }
  };
  
  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle thumbnail upload
   */
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        thumbnail: e.target.files![0]
      }));
    }
  };
  
  /**
   * Reset form data
   */
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: '',
      status: 'active',
      thumbnail: null
    });
  };
  
  /**
   * Render program card
   */
  const renderProgram = (program: Program) => {
    // Check if the program is expanded
    const isExpanded = expandedPrograms.includes(program.id);
    
    // Check if thumbnail is a placeholder
    const hasPlaceholder = !program.thumbnail_url || isPlaceholderImage(program.thumbnail_url);
    
    return (
      <div 
        key={program.id} 
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="border-b border-gray-100">
          {/* Program header with thumbnail and details */}
          <div className="flex p-4">
            {/* Thumbnail or placeholder */}
            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 mr-4">
              {program.thumbnail_url && !hasPlaceholder ? (
                <Image 
                  src={program.thumbnail_url} 
                  alt={program.title}
                  width={64} 
                  height={64}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    // Replace with placeholder if image fails to load
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=E11';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-gray-200">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {/* Show badge for placeholder images */}
              {hasPlaceholder && canUpdate && (
                <div className="absolute mt-[-16px] ml-[-2px]">
                  <div className="bg-amber-100 border border-amber-200 rounded-full px-1 py-0.5 text-[8px] text-amber-800">
                    Add Image
                  </div>
                </div>
              )}
            </div>
            
            {/* Program information */}
            <div className="flex-grow flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <button
                      onClick={() => toggleProgram(program.id)}
                      className="mr-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={isExpanded ? 'Collapse program' : 'Expand program'}
                    >
                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </button>
                    <span>{program.title}</span>
                  </h3>
                  
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    {program.department_name && (
                      <span className="mr-3">{program.department_name}</span>
                    )}
                    {getStatusBadge(program.status)}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-1">
                  {canUpdate && (
                    <button
                      onClick={() => handleEditProgram(program)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Edit Program"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleViewProgram(program)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="View Program"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {canDelete && (
                    <button
                      onClick={() => handleArchiveProgram(program)}
                      className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-gray-100 rounded"
                      title="Archive Program"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Description (truncated) */}
              {program.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                  {program.description}
                </p>
              )}
              
              {/* Program statistics */}
              <div className="mt-auto pt-2 flex items-center text-xs text-gray-500">
                <div className="flex items-center mr-3">
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  <span>{program.courses_count || 0} Courses</span>
                </div>
                
                <div className="flex items-center">
                  <File className="h-3.5 w-3.5 mr-1" />
                  <span>Created {new Date(program.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expanded content */}
        {isExpanded && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            {/* Course management placeholder */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Courses</h4>
              <button
                className="text-xs px-2 py-1 bg-[#AE9773] text-white rounded flex items-center"
                onClick={() => handleAddCourseClick(program)}
                aria-label="Add course to this program"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Course
              </button>
            </div>
            
            {/* Course list - replace placeholder with actual course list */}
            {(program as ExtendedProgram).courses && (program as ExtendedProgram).courses!.length > 0 ? (
              <div className="space-y-2">
                {(program as ExtendedProgram).courses!.map((course) => (
                  <div key={course.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm">{course.title}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Link 
                        href={`/dashboard/university/course/${course.id}`}
                        className="text-xs p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                <p>No courses yet. Click "Add Course" to create your first course.</p>
              </div>
            )}
            
            {/* Quick links */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
              <Link 
                href={`/dashboard/university/program/${program.id}`}
                className="text-xs text-[#AE9773] hover:underline flex items-center"
                target="_blank"
              >
                <Eye className="h-3 w-3 mr-1" />
                View Public Page
              </Link>
              
              {canDelete && (
                <button
                  onClick={() => handleArchiveProgram(program)}
                  className="text-xs text-red-600 hover:underline flex items-center"
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive Program
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Handle add course click
   */
  const handleAddCourseClick = (program: Program) => {
    setActiveProgramForCourse(program);
    setIsAddCourseModalOpen(true);
  };
  
  /**
   * Handle course submission
   */
  const handleCourseSubmit = async (values: any) => {
    try {
      logger.debug('Creating course', values);
      
      // Show loading message
      console.log('Creating course...', values);
      
      // Call API to create the course
      const response = await fetch('/api/learning/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating course:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to create course');
      }

      // Get the created course data
      const courseData = await response.json();
      console.log('Course created successfully:', courseData);

      // Close the modal
      setIsAddCourseModalOpen(false);
      setActiveProgramForCourse(null);
      
      // Refresh the programs data to show the new course
      await refreshPrograms();
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Course created successfully',
        variant: 'default',
      });
      
      // Expand the program to show the new course
      if (!expandedPrograms.includes(values.program_id)) {
        setExpandedPrograms([...expandedPrograms, values.program_id]);
      }
    } catch (error: any) {
      logger.error('Error creating course', error);
      console.error('Error creating course:', error.message);
    }
  };
  
  /**
   * Render the main component
   */
  return (
    <div className="content-structure">
      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <p className="text-red-800">{error}</p>
              {programsError && (
                <button 
                  onClick={() => refreshPrograms()} 
                  className="mt-2 text-sm text-red-700 underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Create program button */}
      {!showProgramForm && !programToEdit && canCreate && (
        <button
          className="mb-6 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#AE9773] hover:bg-[#8E795D] text-white font-semibold rounded-md shadow-md transition-colors"
          onClick={handleShowCreateProgram}
        >
          <Plus className="h-4 w-4" />
          <span>Create Program</span>
        </button>
      )}
      
      {/* Create program modal */}
      {showProgramForm && !programToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CreateProgramForm
              onSave={handleCreateProgramSubmit}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}
      
      {/* Edit program modal */}
      {programToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EditProgramForm
              program={programToEdit}
              onSave={handleEditProgramSubmit}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}
      
      {/* Programs list */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Programs</h2>
        
        {loadingPrograms ? (
          <div className="py-8 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#AE9773] mb-4"></div>
            <p className="text-gray-500">Loading programs...</p>
          </div>
        ) : programs && programs.length > 0 ? (
          <div className="space-y-4">
            {programs.map(program => renderProgram(program))}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No Programs Found</h3>
            <p className="text-gray-500 mb-4">
              {programsError ? 'There was an error loading programs.' : 'Get started by creating your first program.'}
            </p>
            {!programsError && canCreate && (
              <button
                onClick={handleShowCreateProgram}
                className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] transition-colors inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Program
              </button>
            )}
            {programsError && (
              <button
                onClick={() => refreshPrograms()}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Confirmation dialog */}
      {showConfirmArchive && programToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Archive Program</h3>
                <button
                  onClick={handleCancelArchive}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to archive "<span className="font-medium">{programToArchive.title}</span>"? This will hide it from users, but you can restore it later.
              </p>
              
              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={handleCancelArchive}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={archiving}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchiveProgram}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors"
                  disabled={archiving}
                >
                  {archiving ? 'Archiving...' : 'Archive Program'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Course Creation Modal */}
      {isAddCourseModalOpen && activeProgramForCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Add Course to {activeProgramForCourse.title}</h2>
              <button 
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <CourseForm 
              onSubmit={handleCourseSubmit}
              onCancel={() => setIsAddCourseModalOpen(false)}
              course={{
                program_id: activeProgramForCourse.id,
                status: 'active',
                title: '',
                description: '',
                id: ''
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 