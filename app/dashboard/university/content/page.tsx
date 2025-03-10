'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import optimizedSupabase from '@/lib/supabase-optimized'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'
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
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import ContentStructure from './components/ContentStructure'
import ArchivedContent from './components/ArchivedContent'
import ErrorBoundary from '@/components/ErrorBoundary'
import AuthGuard from '@/components/auth/AuthGuard'

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState('structure')
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [departments, setDepartments] = useState<string[]>(['All'])
  const [showCreateProgramForm, setShowCreateProgramForm] = useState(false)
  const [archivedProgramNotification, setArchivedProgramNotification] = useState<string | null>(null)
  const [restoredProgramNotification, setRestoredProgramNotification] = useState<string | null>(null)
  const router = useRouter()
  const supabase = optimizedSupabase

  // Performance monitoring
  const perf = usePerformanceMonitoring('ContentManagementPage')
  
  // Fetch departments from database
  useEffect(() => {
    async function fetchDepartments() {
      perf.startTiming('fetchDepartments')
      
      try {
        logger.debug('Fetching departments', { component: 'ContentManagementPage' })
        
        const { data, error } = await supabase
          .from('departments')
          .select({
            columns: 'name',
            cacheKey: 'all-departments',
            timeout: 30 * 60 * 1000 // 30 minute cache
          })
          .execute()
        
        if (error) {
          logger.error('Error fetching departments', error, { component: 'ContentManagementPage' })
          return
        }
        
        if (data) {
          // Add 'All' option and extract department names
          setDepartments(['All', ...data.map((d: any) => d.name)])
          logger.debug(`Loaded ${data.length} departments`, { component: 'ContentManagementPage' })
        }
      } catch (error) {
        logger.error('Failed to fetch departments', error instanceof Error ? error : new Error(String(error)), {
          component: 'ContentManagementPage'
        })
      } finally {
        perf.endTiming('fetchDepartments')
      }
    }
    
    fetchDepartments()
  }, [perf, supabase])

  // Reset the create program form flag after it's been used
  useEffect(() => {
    if (showCreateProgramForm) {
      // Reset the flag after a short delay to ensure the component has time to respond
      const timer = setTimeout(() => {
        setShowCreateProgramForm(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [showCreateProgramForm]);

  const tabs = [
    {
      id: 'structure',
      label: 'Content Structure',
      icon: <FolderTree className="w-5 h-5 mr-2" />,
      href: '/dashboard/university/content/structure'
    },
    {
      id: 'archive',
      label: 'Archived Content',
      icon: <Archive className="w-5 h-5 mr-2" />,
      href: '/dashboard/university/content/archive'
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: <BarChart3 className="w-5 h-5 mr-2" />,
      href: '/dashboard/university/content/reporting'
    },
    {
      id: 'media',
      label: 'Media Library',
      icon: <FileImage className="w-5 h-5 mr-2" />,
      href: '/dashboard/university/content/media'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 mr-2" />,
      href: '/dashboard/university/content/settings'
    }
  ]

  // Handler for when a program is archived
  const handleProgramArchived = (program: any) => {
    setArchivedProgramNotification(`"${program.title}" has been archived successfully.`);
    setTimeout(() => setArchivedProgramNotification(null), 5000);
  };

  // Handler for when a program is restored from archive
  const handleProgramRestored = (program: any) => {
    setRestoredProgramNotification(`"${program.title}" has been restored successfully.`);
    setTimeout(() => setRestoredProgramNotification(null), 5000);
  };

  return (
    <AuthGuard requiredRoles={['admin', 'training_manager']}>
      <ErrorBoundary>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Content Management</h1>
            <div className="flex space-x-2">
              <div className="relative flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black w-60"
                  />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="py-2 pl-3 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    // Force refresh by setting a new Date.now() which will re-mount the component
                    setActiveTab('');
                    setTimeout(() => setActiveTab('structure'), 10);
                  }}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
                  title="Refresh content"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Important Note</p>
              <p className="text-sm">
                All content created here will automatically sync with the Training Portal. 
                Published content is immediately visible to users with appropriate permissions.
              </p>
            </div>
          </div>
          
          {/* Tabs - Horizontal layout for all screen sizes */}
          <div className="overflow-x-auto mb-4 border-b border-gray-200">
            <div className="flex whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 transition-colors border-b-2 ${
                    activeTab === tab.id 
                    ? 'border-[#AE9773] text-[#AE9773] font-medium' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area - Children components will be rendered here */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
            {/* Notification for archived program */}
            {archivedProgramNotification && (
              <div className="mb-4 p-3 bg-amber-100 border border-amber-200 text-amber-800 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{archivedProgramNotification}</span>
              </div>
            )}
            
            {/* Notification for restored program */}
            {restoredProgramNotification && (
              <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-800 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{restoredProgramNotification}</span>
              </div>
            )}
            
            {/* Lazy load the content based on active tab */}
            {activeTab === 'structure' && (
              <Fragment key={Date.now()}>
                <ContentStructure showCreateProgramOnLoad={false} />
              </Fragment>
            )}
            
            {activeTab === 'archive' && (
              <ArchivedContent 
                onRestoreProgram={handleProgramRestored}
              />
            )}
            
            {activeTab === 'reporting' && (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Reporting Module</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  The reporting module is coming soon. You'll be able to generate insightful reports about training completion, engagement, and more.
                </p>
              </div>
            )}
            
            {activeTab === 'media' && (
              <div className="text-center py-12">
                <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Media Library</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  The media library feature is currently under development. This will allow you to manage images, videos, and other assets used in your training content.
                </p>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Content Settings</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Content settings will allow you to configure global options for your training content, such as default visibility, notifications, and more.
                </p>
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
} 