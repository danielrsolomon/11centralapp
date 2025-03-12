'use client'

import { useState, useEffect } from 'react'
import { Archive, Eye, Trash, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import logger from '@/lib/logger'
import { usePrograms, Program } from '@/lib/hooks/usePrograms'
import { useUserPermissions } from '@/lib/hooks/useUserPermissions'
import Link from 'next/link'
import { isPlaceholderImage } from '@/lib/supabase-storage'

/**
 * ArchivedContent Component
 * 
 * Displays and manages archived training programs.
 * Allows users to view, permanently delete, or restore archived programs.
 */
export default function ArchivedContent({ 
  onRestoreProgram = (program: Program) => {} 
}: { 
  onRestoreProgram?: (program: Program) => void 
}) {
  // Component state
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewProgram, setViewProgram] = useState<Program | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  
  // Hooks
  const { isAdmin, canDelete, loading: permissionsLoading } = useUserPermissions()
  
  // Fetch archived programs with the usePrograms hook
  const { 
    programs: archivedPrograms, 
    isLoading, 
    error: programsError,
    refreshPrograms,
    deleteProgram,
    restoreProgram 
  } = usePrograms({
    status: 'archived',
    includeArchived: true,
    adminView: true,
    debug: true // Enable debug mode to get more information
  })
  
  /**
   * Handle API errors
   */
  useEffect(() => {
    if (programsError) {
      logger.error('Error loading archived programs:', programsError)
      setError(programsError instanceof Error ? programsError.message : 'Error loading archived programs')
    }
  }, [programsError])
  
  /**
   * Refresh archived programs
   */
  const handleRefresh = () => {
    setError(null)
    refreshPrograms()
  }
  
  /**
   * Get status badge component
   */
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
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
   * View program details
   */
  const handleViewProgram = (program: Program) => {
    setViewProgram(program);
  }
  
  /**
   * Initiate program deletion
   */
  const handleDeleteClick = (program: Program) => {
    setProgramToDelete(program);
    setShowDeleteConfirm(true);
  }
  
  /**
   * Restore an archived program
   */
  const handleRestoreProgram = async (program: Program) => {
    setRestoring(true);
    setError(null);
    
    try {
      await restoreProgram(program);
      
      // Call the parent callback
      onRestoreProgram(program);
    } catch (error) {
      logger.error('Failed to restore program', error as Error);
      setError('Failed to restore program. Please try again.');
    } finally {
      setRestoring(false);
    }
  }
  
  /**
   * Confirm and execute program deletion
   */
  const confirmDelete = async () => {
    if (!programToDelete) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      logger.debug('Permanently deleting program', { id: programToDelete.id, title: programToDelete.title });
      await deleteProgram(programToDelete.id);
      
      // Reset state
      setProgramToDelete(null);
      setShowDeleteConfirm(false);
      
      // Show a temporary success notification
      // This could be enhanced with a proper toast notification system
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg';
      notification.innerHTML = `<div class="flex items-center"><svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Program "${programToDelete.title}" was permanently deleted.</span></div>`;
      document.body.appendChild(notification);
      
      // Remove the notification after 5 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 5000);
    } catch (error) {
      logger.error('Failed to delete program', error as Error);
      setError('Failed to permanently delete program. Please try again.');
    } finally {
      setDeleting(false);
    }
  }
  
  // Loading state
  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    );
  }
  
  // Error state
  if (programsError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
        <h3 className="font-medium mb-1">Error Loading Archived Programs</h3>
        <p>There was an error loading archived programs. Please try refreshing the page.</p>
      </div>
    );
  }
  
  // Empty state
  if (archivedPrograms.length === 0) {
    return (
      <div className="py-10 text-center bg-white rounded-md border border-gray-200 shadow-sm">
        <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Archived Programs</h3>
        <p className="text-gray-600">
          Archived programs will appear here. You can restore them or permanently delete them.
        </p>
      </div>
    );
  }
  
  return (
    <div className="archived-content">
      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-red-800">{error}</p>
              <button 
                onClick={handleRefresh} 
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Archived Programs</h2>
        
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#AE9773] mb-4"></div>
            <p className="text-gray-500">Loading archived programs...</p>
          </div>
        ) : archivedPrograms && archivedPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPrograms.map(program => (
              <div 
                key={program.id} 
                className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Program content */}
                <div className="relative h-32 bg-gray-100">
                  {program.thumbnail_url && !isPlaceholderImage(program.thumbnail_url) ? (
                    <Image
                      src={program.thumbnail_url}
                      alt={program.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full bg-gray-200">
                      <Archive className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                    <p className="font-medium truncate">{program.title}</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-2">
                    <p>
                      <span className="font-medium">Archived:</span> {new Date(program.archived_at || '').toLocaleDateString()}
                    </p>
                    {program.department_name && (
                      <p className="mt-1">
                        <span className="font-medium">Department:</span> {program.department_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleViewProgram(program)}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded border border-gray-200 hover:bg-gray-200 flex items-center justify-center text-sm"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleRestoreProgram(program)}
                      className="flex-1 px-3 py-1.5 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 flex items-center justify-center text-sm"
                      disabled={restoring}
                    >
                      {restoring ? (
                        <>
                          <span className="animate-pulse">Restoring...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </>
                      )}
                    </button>
                    
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteClick(program)}
                        className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center text-sm"
                      >
                        <Trash className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No Archived Programs</h3>
            <p className="text-gray-500 mb-4">
              {programsError ? 
                'There was an error loading archived programs.' : 
                'There are no archived programs at this time.'
              }
            </p>
            {programsError && (
              <button
                onClick={handleRefresh}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* View program modal */}
      {viewProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Program Details</h3>
                <button
                  onClick={() => setViewProgram(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Program image */}
              <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
                {viewProgram.thumbnail_url && !isPlaceholderImage(viewProgram.thumbnail_url) ? (
                  <Image
                    src={viewProgram.thumbnail_url}
                    alt={viewProgram.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-gray-200">
                    <Archive className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Show placeholder warning if applicable */}
              {viewProgram.thumbnail_url && isPlaceholderImage(viewProgram.thumbnail_url) && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                  <div className="flex">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p>This program is using a placeholder image.</p>
                  </div>
                </div>
              )}
              
              {/* Program info */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{viewProgram.title}</h2>
                
                <div className="flex items-center mb-3">
                  <div className="mr-3">
                    {getStatusBadge(viewProgram.status || 'archived')}
                  </div>
                  {viewProgram.department_name && (
                    <span className="text-sm text-gray-500">{viewProgram.department_name}</span>
                  )}
                </div>
                
                <p className="text-gray-700 mb-4">{viewProgram.description || 'No description available'}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="font-medium text-gray-600">Created:</span>
                    <div>{new Date(viewProgram.created_at).toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="font-medium text-gray-600">Archived:</span>
                    <div>{viewProgram.archived_at ? new Date(viewProgram.archived_at).toLocaleString() : 'Unknown'}</div>
                  </div>
                  
                  {viewProgram.courses_count !== undefined && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-medium text-gray-600">Courses:</span>
                      <div>{viewProgram.courses_count}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
                <Link
                  href={`/dashboard/university/program/${viewProgram.id}`}
                  target="_blank"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Page
                </Link>
                
                <button
                  onClick={() => {
                    handleRestoreProgram(viewProgram);
                    setViewProgram(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center"
                  disabled={restoring}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {restoring ? 'Restoring...' : 'Restore Program'}
                </button>
                
                {canDelete && (
                  <button
                    onClick={() => {
                      setViewProgram(null);
                      handleDeleteClick(viewProgram);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && programToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Delete Program Permanently</h3>
                <button
                  onClick={() => {
                    setProgramToDelete(null);
                    setShowDeleteConfirm(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p><span className="font-medium">Warning:</span> This action cannot be undone. The program will be permanently deleted from the database.</p>
                </div>
              </div>
              
              {/* Program info */}
              <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-1">{programToDelete.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {programToDelete.description || 'No description available'}
                </p>
                {programToDelete.courses_count !== undefined && programToDelete.courses_count > 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                    This program has {programToDelete.courses_count} associated courses which will also be deleted.
                  </p>
                )}
              </div>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                  <div className="flex">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setProgramToDelete(null);
                    setShowDeleteConfirm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center"
                  disabled={deleting}
                >
                  {deleting ? (
                    <span className="animate-pulse">Deleting...</span>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="mb-6 flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md shadow-md transition-colors"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh List
      </button>
    </div>
  );
} 