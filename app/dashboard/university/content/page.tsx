'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import { 
  FolderTree, 
  Archive, 
  BarChart3, 
  FileImage,
  Plus,
  Search,
  AlertTriangle,
  AlertCircle,
  Settings,
  CheckCircle,
  ShieldAlert,
  BookOpen,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import ContentStructure from './components/ContentStructure'
import ArchivedContent from './components/ArchivedContent'
import ErrorBoundary from '@/components/ErrorBoundary'
import AuthGuard from '@/components/auth/AuthGuard'

/**
 * Content Management Page
 * 
 * This page provides an interface for managing training content:
 * - Programs: Collections of courses
 * - Courses: Organized training modules
 * - Lessons: Individual units of instruction
 * - Modules: Specific content items within lessons
 * 
 * It includes:
 * - Structure view for organizing content
 * - Archive view for retrieving archived content
 * - Reports for analytics
 * - Settings for configuration
 * 
 * Access is controlled by permissions:
 * - Admins and Managers: Full CRUD access
 * - Staff: Read-only access or restricted access
 */
export default function ContentManagementPage() {
  // State
  const [activeTab, setActiveTab] = useState('structure')
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [showCreateProgramForm, setShowCreateProgramForm] = useState(false)
  const [archivedProgramNotification, setArchivedProgramNotification] = useState<string | null>(null)
  const [restoredProgramNotification, setRestoredProgramNotification] = useState<string | null>(null)
  
  // Hooks
  const router = useRouter()
  const { isAdmin, isManager, canCreate, canUpdate, canDelete, loading: permissionsLoading } = useUserPermissions()
  
  // Performance monitoring
  const perf = usePerformanceMonitoring('ContentManagementPage')
  
  // Redirect non-admin users after a delay if environment is production
  useEffect(() => {
    if (!permissionsLoading && !isAdmin && !isManager) {
      logger.warn('Non-admin user attempted to access content management page', { redirecting: true });
      
      const timer = setTimeout(() => {
        router.push('/dashboard/university');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isAdmin, isManager, permissionsLoading, router]);
  
  /**
   * Handle program archived event
   */
  const handleProgramArchived = (programTitle: string) => {
    setArchivedProgramNotification(`"${programTitle}" has been archived.`);
    setTimeout(() => setArchivedProgramNotification(null), 5000);
  };
  
  /**
   * Handle program restored event
   */
  const handleProgramRestored = (programTitle: string) => {
    setRestoredProgramNotification(`"${programTitle}" has been restored.`);
    setTimeout(() => setRestoredProgramNotification(null), 5000);
  };
  
  // Show loading indicator while permissions are being loaded
  if (permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773] mb-4"></div>
        <p className="text-gray-600">Loading content management...</p>
      </div>
    );
  }
  
  // Show restricted access message for non-admin, non-manager users
  if (!isAdmin && !isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-amber-800 mb-2">Restricted Access</h2>
          <p className="text-amber-700 mb-4">
            The content management area is only accessible to administrators and content managers.
          </p>
          <p className="text-amber-700 mb-4">
            You will be redirected to the University dashboard shortly.
          </p>
          <Link 
            href="/dashboard/university"
            className="inline-block px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Link 
                href="/dashboard/university/programs" 
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Content Management</h1>
                <p className="text-gray-600">Create and manage training programs, courses, and lessons</p>
              </div>
            </div>
            
            <Link
              href="/dashboard/university/programs"
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              View Programs
            </Link>
          </div>
          
          {/* Admin-only indicator */}
          <div className="mb-6 flex items-center bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-800">
            <ShieldAlert className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-semibold">Admin Area:</span> Changes made here will affect all users.
              </p>
              <p className="text-xs mt-1">
                This page uses the Programs API (<code className="bg-blue-100 px-1 py-0.5 rounded">/api/learning/programs</code>) for all operations.
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          {archivedProgramNotification && (
            <div className="mb-4 flex items-center bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-800">
              <Archive className="h-5 w-5 text-blue-600 mr-2" />
              <p>{archivedProgramNotification}</p>
              <button 
                onClick={() => setArchivedProgramNotification(null)}
                className="ml-auto text-blue-600 hover:text-blue-800"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {restoredProgramNotification && (
            <div className="mb-4 flex items-center bg-green-50 p-4 rounded-lg border border-green-200 text-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p>{restoredProgramNotification}</p>
              <button 
                onClick={() => setRestoredProgramNotification(null)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'structure' 
                  ? 'text-[#AE9773] border-b-2 border-[#AE9773]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('structure')}
            >
              <div className="flex items-center">
                <FolderTree className="h-4 w-4 mr-2" />
                Structure
              </div>
            </button>
            
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'archived' 
                  ? 'text-[#AE9773] border-b-2 border-[#AE9773]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('archived')}
            >
              <div className="flex items-center">
                <Archive className="h-4 w-4 mr-2" />
                Archived
              </div>
            </button>
            
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'reports' 
                  ? 'text-[#AE9773] border-b-2 border-[#AE9773]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('reports')}
            >
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </div>
            </button>
            
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'assets' 
                  ? 'text-[#AE9773] border-b-2 border-[#AE9773]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('assets')}
            >
              <div className="flex items-center">
                <FileImage className="h-4 w-4 mr-2" />
                Assets
              </div>
            </button>
            
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'settings' 
                  ? 'text-[#AE9773] border-b-2 border-[#AE9773]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              <div className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </div>
            </button>
          </div>
          
          {/* Tab content */}
          <div className="mb-8">
            {activeTab === 'structure' && (
              <ContentStructure 
                showCreateProgramOnLoad={showCreateProgramForm} 
                onArchiveProgram={(program) => handleProgramArchived(program.title)}
              />
            )}
            
            {activeTab === 'archived' && (
              <ArchivedContent 
                onRestoreProgram={(program) => handleProgramRestored(program.title)}
              />
            )}
            
            {activeTab === 'reports' && (
              <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Reports Coming Soon</h3>
                <p className="text-gray-600">
                  We're working on comprehensive analytics for your training programs.
                </p>
              </div>
            )}
            
            {activeTab === 'assets' && (
              <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Asset Management Coming Soon</h3>
                <p className="text-gray-600">
                  A central place to manage all your training images, videos, and documents.
                </p>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Settings Coming Soon</h3>
                <p className="text-gray-600">
                  Configure your content management preferences and defaults.
                </p>
              </div>
            )}
          </div>
          
          {/* Important Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">API Integration</h4>
                <p className="text-blue-700 text-sm">
                  All content created here is managed through the <code className="bg-blue-100 px-1 py-0.5 rounded">/api/learning/programs</code> endpoint.
                  Changes will reflect immediately in the Programs page for users with appropriate permissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  )
} 