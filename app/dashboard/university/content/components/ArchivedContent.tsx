'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Archive, Eye, Trash, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

// Types
type Program = {
  id: string
  title: string
  description: string
  status: string
  thumbnail_url?: string
  departments?: string[]
  courses_count: number
  created_at: string
  updated_at: string
}

export default function ArchivedContent({ 
  onRestoreProgram = (program: Program) => {} 
}: { 
  onRestoreProgram?: (program: Program) => void 
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archivedPrograms, setArchivedPrograms] = useState<Program[]>([])
  const [viewProgram, setViewProgram] = useState<Program | null>(null)
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchArchivedPrograms() {
      setLoading(true)
      setError(null)
      
      try {
        // Check if the programs table exists first
        const { error: tableCheckError } = await supabase
          .from('programs')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.warn('Programs table may not exist yet. Using empty data.', tableCheckError);
          throw new Error('Programs table not ready');
        }
        
        // Fetch archived programs from Supabase
        const { data, error } = await supabase
          .from('programs')
          .select(`
            id,
            title,
            description,
            status,
            thumbnail_url,
            departments,
            created_at,
            updated_at,
            courses:courses(count)
          `)
          .eq('status', 'archived')
          .order('updated_at', { ascending: false })
        
        if (error) {
          throw error
        }

        const programsWithCourseCount = data.map(program => ({
          ...program,
          courses_count: program.courses[0]?.count || 0
        }))
        
        setArchivedPrograms(programsWithCourseCount)
        
        // If no data, use empty array
        if (programsWithCourseCount.length === 0 && process.env.NODE_ENV === 'development') {
          setArchivedPrograms([])
        }
      } catch (error) {
        console.error('Error fetching archived programs:', error)
        setError('Failed to load archived content. Please try again later.')
        
        // Set empty array instead of dummy data
        setArchivedPrograms([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchArchivedPrograms()
  }, [supabase])
  
  const handleViewProgram = (program: Program) => {
    setViewProgram(program)
  }
  
  const handleDeleteClick = (program: Program) => {
    setProgramToDelete(program)
    setShowDeleteConfirm(true)
  }
  
  const handleRestoreProgram = async (program: Program) => {
    setSubmitting(true)
    
    try {
      // Update program status back to draft
      const { error } = await supabase
        .from('programs')
        .update({ status: 'draft' })
        .eq('id', program.id)
      
      if (error) throw error
      
      // Remove from local state
      setArchivedPrograms(archivedPrograms.filter(p => p.id !== program.id))
      
      // Notify parent component
      onRestoreProgram(program)
      
    } catch (error) {
      console.error('Error restoring program:', error)
      setError('Failed to restore program. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  
  const confirmDelete = async () => {
    if (!programToDelete) return
    
    setSubmitting(true)
    
    try {
      // Delete program from Supabase
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programToDelete.id)
      
      if (error) throw error
      
      // Remove from local state
      setArchivedPrograms(archivedPrograms.filter(p => p.id !== programToDelete.id))
      
      // Reset state
      setProgramToDelete(null)
      setShowDeleteConfirm(false)
      
    } catch (error) {
      console.error('Error deleting program:', error)
      setError('Failed to delete program. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Archived Content</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {archivedPrograms.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Archive className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Archived Content</h3>
          <p className="text-gray-500">
            When you archive programs, they will appear here for temporary storage before permanent deletion.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archive Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Courses
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {archivedPrograms.map(program => (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {program.thumbnail_url ? (
                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                          <Image 
                            src={program.thumbnail_url} 
                            alt={program.title}
                            width={40}
                            height={40}
                            className="rounded-md object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 h-10 w-10 mr-3 bg-gray-200 rounded-md flex items-center justify-center">
                          <Archive className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{program.title}</div>
                        {program.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{program.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(program.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.courses_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleViewProgram(program)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleRestoreProgram(program)}
                        className="text-green-600 hover:text-green-800"
                        title="Restore Program"
                        disabled={submitting}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M21 7v6h-6"></path>
                          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(program)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Permanently"
                        disabled={submitting}
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* View Program Modal */}
      {viewProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Archived Program Details</h2>
                <button 
                  onClick={() => setViewProgram(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Archived Content</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    This program is archived and not visible to users. You can restore it or delete it permanently.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {viewProgram.thumbnail_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg mb-4">
                    <Image 
                      src={viewProgram.thumbnail_url}
                      alt={viewProgram.title}
                      width={640}
                      height={360}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div>
                  <h3 className="text-gray-500 text-sm">Title</h3>
                  <p className="text-gray-900 font-medium">{viewProgram.title}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-500 text-sm">Description</h3>
                  <p className="text-gray-900">{viewProgram.description || "No description provided."}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-500 text-sm">Created</h3>
                  <p className="text-gray-900">{new Date(viewProgram.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-500 text-sm">Last Updated</h3>
                  <p className="text-gray-900">{new Date(viewProgram.updated_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-500 text-sm">Courses</h3>
                  <p className="text-gray-900">{viewProgram.courses_count}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setViewProgram(null)
                    handleRestoreProgram(viewProgram)
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Restore Program'}
                </button>
                <button
                  onClick={() => {
                    setViewProgram(null)
                    handleDeleteClick(viewProgram)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  Delete Permanently
                </button>
                <button
                  onClick={() => setViewProgram(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && programToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4 flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Permanently Delete Program</h2>
              </div>
              
              <p className="mb-6 text-gray-600">
                Are you sure you want to <span className="font-bold text-red-600">permanently delete</span> the program "{programToDelete.title}"? 
                This action cannot be undone and all associated courses, lessons, and modules will also be deleted.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setProgramToDelete(null)
                    setShowDeleteConfirm(false)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 