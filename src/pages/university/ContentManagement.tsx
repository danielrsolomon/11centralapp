import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/auth-provider';
import ContentTree, { ContentTreeProps, TreeItem } from '../../components/university/ContentTree';
import ProgramForm from '../../components/university/ProgramForm';
import CourseForm from '../../components/university/CourseForm';
import LessonForm from '../../components/university/LessonForm';
import ModuleForm from '../../components/university/ModuleForm';
import MinimalProgramDialog from '../../components/university/MinimalProgramDialog';
import { fixOrderColumns } from '../../services/adminService';
import { getUserRoles, checkAndAssignSuperAdmin, archiveContentItem } from '../../services/universityService';

// Define the allowed roles for this page
const ALLOWED_ROLES = ['SuperAdmin', 'Director', 'SeniorManager', 'TrainingManager'];

// Define the tab types
type TabType = 'content-structure' | 'archived-content' | 'user-progress' | 'reporting';

// Define content item types
type ContentItemType = 'program' | 'course' | 'lesson' | 'module';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('content-structure');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for selected item in the tree
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null);

  // State for form dialogs
  const [programFormOpen, setProgramFormOpen] = useState(false);
  const [minimalDialogOpen, setMinimalDialogOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false); 
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  
  // State for edit/new mode
  const [editMode, setEditMode] = useState(false);
  
  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Reference to the ContentTree component for refreshing
  const contentTreeRef = useRef<any>(null);

  // Reset error state
  const clearError = () => {
    setError(null);
    setErrorDetails(null);
  };

  // Helper function to log and set errors
  const handleError = (message: string, error: any) => {
    console.error(`ContentManagement: ${message}`, error);
    setError(message);
    setErrorDetails(error instanceof Error ? error.message : String(error));
  };

  // Fetch user roles from API
  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("Fetching roles for user:", user);
        
        // First try to check if the user is SuperAdmin and assign the role if necessary
        const { data: superAdminData, error: superAdminError } = await checkAndAssignSuperAdmin(user.id);
        
        if (superAdminError) {
          console.error('Error checking SuperAdmin status:', superAdminError);
          // Continue with role checking even if this fails
        } else {
          console.log("SuperAdmin check result:", superAdminData);
        }
          
        // Now fetch all user roles
        const { roles, error: rolesError } = await getUserRoles(user.id);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setIsLoading(false);
          return;
        }

        console.log("Extracted roles:", roles);
        
        if (roles) {
          setUserRoles(roles);

          // Check if user has access to this page
          const userHasAccess = roles.some(role => ALLOWED_ROLES.includes(role));
          setHasAccess(userHasAccess);

          // Redirect if no access
          if (!userHasAccess) {
            navigate('/university');
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error fetching roles:', error);
        setIsLoading(false);
      }
    };

    fetchUserRoles();
  }, [user, navigate]);

  // Automatically attempt to fix order columns when the component mounts
  useEffect(() => {
    const attemptFixOrderColumns = async () => {
      try {
        const { success, error } = await fixOrderColumns();
        if (error) {
          console.error('Failed to fix order columns:', error);
        } else {
          console.log('Successfully fixed order columns via API');
        }
      } catch (error) {
        console.error('Failed to fix order columns:', error);
      }
    };
    
    attemptFixOrderColumns();
  }, []);

  // Handle tab change
  const handleTabChange = (value: TabType) => {
    setActiveTab(value);
  };

  // Handle tree item selection
  const handleSelectItem = (item: TreeItem) => {
    setSelectedItem(item);
    console.log("Selected item:", item);
  };

  // Handle add item button click
  const handleAddItem = (parentItem: TreeItem | null, type: ContentItemType) => {
    console.log(`ContentManagement: Opening ${type} form for adding, parent:`, parentItem?.id);
    
    // For programs, we'll use the minimal dialog instead of the regular form
    if (type === 'program') {
      // No need to close other forms first - testing if that's related to flickering
      console.log('ContentManagement: Opening minimal program dialog');
      setMinimalDialogOpen(true);
      return;
    }
    
    // For other types, use the existing behavior
    // Close any open forms first to prevent multiple dialogs
    closeAllForms();
    
    setSelectedItem(parentItem);
    setEditMode(false);
    
    // Open the appropriate form based on the type
    switch (type) {
      case 'course':
        setCourseFormOpen(true);
        break;
      case 'lesson':
        setLessonFormOpen(true);
        break;
      case 'module':
        setModuleFormOpen(true);
        break;
    }
  };

  // Handle edit item button click
  const handleEditItem = (item: TreeItem) => {
    console.log(`ContentManagement: Opening ${item.type} form for editing, id:`, item.id);
    // Close any open forms first to prevent multiple dialogs
    closeAllForms();
    
    setSelectedItem(item);
    setEditMode(true);
    
    // Open the appropriate form based on the type
    switch (item.type) {
      case 'program':
        setProgramFormOpen(true);
        break;
      case 'course':
        setCourseFormOpen(true);
        break;
      case 'lesson':
        setLessonFormOpen(true);
        break;
      case 'module':
        setModuleFormOpen(true);
        break;
    }
  };

  // Handle archive item button click
  const handleArchiveItem = async (item: TreeItem) => {
    try {
      console.log(`ContentManagement: Archiving ${item.type}, id:`, item.id);

      // Call the API to archive the item
      const { success, error: archiveError } = await archiveContentItem(item.id, item.type as ContentItemType);
      
      if (!success || archiveError) {
        console.error(`Error archiving ${item.type}:`, archiveError);
        handleError(`Failed to archive ${item.type}`, archiveError || 'Unknown error');
        return;
      }
      
      // Refresh the tree
      // This will happen automatically when the ContentTree component is refreshed
      console.log(`${item.type} archived successfully:`, item.id);
      
      // Close any open forms and reset selected item
      closeAllForms();
      setSelectedItem(null);
    } catch (error) {
      console.error(`Error archiving ${item.type}:`, error);
      handleError(`Error archiving ${item.type}`, error);
    }
  };

  // Handler for when a new program is created through the minimal dialog
  const handleProgramCreated = async (data: any) => {
    console.log("ContentManagement: New program created with data:", {
      id: data?.id,
      title: data?.title,
      status: data?.status,
      hasData: !!data
    });
    
    // Clear any previous errors
    clearError();
    
    try {
      // First close the dialog before attempting tree refresh to prevent UI issues
      console.log("ContentManagement: Closing minimal dialog after program creation");
      setMinimalDialogOpen(false);
      
      // Brief delay to ensure dialog is fully closed before refreshing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then refresh the content tree asynchronously
      if (contentTreeRef.current) {
        console.log("ContentManagement: Starting tree refresh after program creation");
        try {
          await contentTreeRef.current.refreshTree();
          console.log("ContentManagement: Tree refresh completed successfully");
        } catch (refreshError) {
          handleError("Error refreshing content tree", refreshError);
          // No need for alert since we'll show error UI
        }
      } else {
        console.warn("ContentManagement: contentTreeRef is not available for refresh");
        handleError("Content tree reference not available", "Try refreshing the page");
      }
    } catch (err) {
      handleError("Critical error handling program creation", err);
      // Even if there's an error, ensure dialog is closed
      setMinimalDialogOpen(false);
    }
  };

  // Handle form save
  const handleFormSave = () => {
    console.log("ContentManagement: Form saved, closing forms");
    
    try {
      // Close all forms first for better UX
      closeAllForms();
      
      // Then refresh tree data if possible
      if (contentTreeRef.current) {
        console.log("ContentManagement: Refreshing tree after form save");
        contentTreeRef.current.refreshTree().catch((refreshError: Error) => {
          console.error("ContentManagement: Error refreshing tree after form save:", refreshError);
          // Don't show an alert here to avoid too many alerts, just log it
        });
      }
    } catch (err) {
      console.error("ContentManagement: Error in handleFormSave:", err);
      // Make sure forms are closed even if there's an error
      closeAllForms();
    }
  };

  // Close all forms
  const closeAllForms = () => {
    console.log("ContentManagement: Closing all forms");
    try {
      // Close all form dialogs
      setProgramFormOpen(false);
      setMinimalDialogOpen(false);
      setCourseFormOpen(false);
      setLessonFormOpen(false);
      setModuleFormOpen(false);
    } catch (err) {
      console.error("ContentManagement: Error closing forms:", err);
      // Attempt to force-close all forms individually in case one is causing issues
      try { setProgramFormOpen(false); } catch (e) { console.error("Error closing program form:", e); }
      try { setMinimalDialogOpen(false); } catch (e) { console.error("Error closing minimal dialog:", e); }
      try { setCourseFormOpen(false); } catch (e) { console.error("Error closing course form:", e); }
      try { setLessonFormOpen(false); } catch (e) { console.error("Error closing lesson form:", e); }
      try { setModuleFormOpen(false); } catch (e) { console.error("Error closing module form:", e); }
    }
  };

  // Show loading state
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Show access denied if user doesn't have permission
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You do not have permission to access this page. Redirecting to University Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">E11EVEN University Content Management</h1>
      
      {/* Tabbed Interface */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'content-structure'
                  ? 'border-b-2 border-gold-500 text-gold-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('content-structure')}
            >
              Content Structure
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'archived-content'
                  ? 'border-b-2 border-gold-500 text-gold-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('archived-content')}
            >
              Archived Content
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'user-progress'
                  ? 'border-b-2 border-gold-500 text-gold-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('user-progress')}
            >
              User Progress
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'reporting'
                  ? 'border-b-2 border-gold-500 text-gold-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('reporting')}
            >
              Reporting
            </button>
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Content Structure Tab */}
        {activeTab === 'content-structure' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Content Structure</h2>
            <p className="text-gray-600 mb-4">
              Manage programs, courses, modules, and lessons in the E11EVEN University LMS.
            </p>
            
            {/* Add Program button using MinimalProgramDialog for flicker-free program creation */}
            <button
              className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded mb-4"
              onClick={() => {
                console.log('ContentManagement: "Add Program" button clicked');
                setMinimalDialogOpen(true);
              }}
            >
              Add Program
            </button>
            
            {/* Content Tree Component with ref for refreshing */}
            <div className="mt-6">
              {/* Error display component */}
              {error && (
                <div className="mb-4 p-4 border border-red-300 bg-red-50 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      {errorDetails && (
                        <div className="mt-2 text-sm text-red-700">
                          <p>{errorDetails}</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={clearError}
                          className="text-sm font-medium text-red-800 hover:text-red-900"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearError();
                            if (contentTreeRef.current) {
                              contentTreeRef.current.refreshTree().catch((err: Error) => {
                                handleError("Error refreshing tree", err);
                              });
                            }
                          }}
                          className="ml-3 text-sm font-medium text-red-800 hover:text-red-900"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <ContentTree 
                ref={contentTreeRef}
                onSelectItem={handleSelectItem}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onArchiveItem={handleArchiveItem}
              />
            </div>
            
            {/* 
              MinimalProgramDialog - Flicker-free implementation
              This uses a single source of truth (minimalDialogOpen state) and minimal code
              to prevent flickering when creating a new program
            */}
            <MinimalProgramDialog 
              isOpen={minimalDialogOpen}
              onClose={() => {
                console.log('ContentManagement: Closing minimal dialog via onClose');
                setMinimalDialogOpen(false);
              }}
              onCreated={handleProgramCreated}
            />
            
            {/* Regular Form Dialogs */}
            {/* Program Form */}
            {programFormOpen && (
              <div className="z-50">
                <ProgramForm 
                  programId={editMode ? selectedItem?.id : undefined}
                  isOpen={programFormOpen}
                  onClose={() => setProgramFormOpen(false)}
                  onSave={handleFormSave}
                />
              </div>
            )}
            
            {/* Course Form */}
            {courseFormOpen && (
              <div className="z-50">
                <CourseForm 
                  courseId={editMode ? selectedItem?.id : undefined}
                  programId={!editMode && selectedItem?.type === 'program' ? selectedItem.id : undefined}
                  isOpen={courseFormOpen}
                  onClose={() => setCourseFormOpen(false)}
                  onSave={handleFormSave}
                />
              </div>
            )}
            
            {/* Lesson Form */}
            {lessonFormOpen && (
              <div className="z-50">
                <LessonForm 
                  lessonId={editMode ? selectedItem?.id : undefined}
                  courseId={!editMode && selectedItem?.type === 'course' ? selectedItem.id : undefined}
                  isOpen={lessonFormOpen}
                  onClose={() => setLessonFormOpen(false)}
                  onSave={handleFormSave}
                />
              </div>
            )}
            
            {/* Module Form */}
            {moduleFormOpen && (
              <div className="z-50">
                <ModuleForm 
                  moduleId={editMode ? selectedItem?.id : undefined}
                  lessonId={!editMode && selectedItem?.type === 'lesson' ? selectedItem.id : undefined}
                  isOpen={moduleFormOpen}
                  onClose={() => setModuleFormOpen(false)}
                  onSave={handleFormSave}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Archived Content Tab */}
        {activeTab === 'archived-content' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Archived Content</h2>
            <p className="text-gray-600 mb-4">
              View and restore archived content from the E11EVEN University LMS.
            </p>
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Archived Content Tab</h3>
              <p>This area will display archived programs, courses, modules, and lessons.</p>
            </div>
          </div>
        )}
        
        {/* User Progress Tab */}
        {activeTab === 'user-progress' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">User Progress</h2>
            <p className="text-gray-600 mb-4">
              Track and manage user progress through E11EVEN University content.
            </p>
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">User Progress Tab</h3>
              <p>This area will provide tools for monitoring and managing user progress through the LMS content.</p>
            </div>
          </div>
        )}
        
        {/* Reporting Tab */}
        {activeTab === 'reporting' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Reporting</h2>
            <p className="text-gray-600 mb-4">
              Generate and view reports on E11EVEN University usage and performance.
            </p>
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Reporting Tab</h3>
              <p>This area will contain reporting tools for analyzing LMS usage and performance metrics.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManagement; 