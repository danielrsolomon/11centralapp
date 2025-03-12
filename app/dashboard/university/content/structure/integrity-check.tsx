'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { AlertCircle, CheckCircle, ArrowUpDown, Trash2, RefreshCw, PanelLeft } from 'lucide-react'

export default function ContentIntegrityCheck() {
  const [loading, setLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [fixStatus, setFixStatus] = useState<Record<string, string>>({})
  const supabase = createClient()

  const runVerification = async () => {
    setLoading(true)
    setShowResults(true)
    setFixStatus({})
    
    try {
      const response = await fetch('/api/dev-actions/verify-relationships')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      setVerifyResult(result)
      
    } catch (error) {
      console.error('Error verifying content relationships:', error)
      setVerifyResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }
  
  const fixSequenceOrder = async (table: string) => {
    setFixStatus(prev => ({ ...prev, [table]: 'fixing' }))
    
    try {
      const response = await fetch('/api/dev-actions/fix-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fix-sequence-order',
          data: { table }
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      setFixStatus(prev => ({ ...prev, [table]: 'success' }))
      
      // Re-run verification after fix
      await runVerification()
      
    } catch (error) {
      console.error(`Error fixing sequence order in ${table}:`, error)
      setFixStatus(prev => ({ ...prev, [table]: 'error' }))
    }
  }
  
  const deleteOrphanedContent = async (entityType: string, orphanedIds: string[]) => {
    const key = `delete-${entityType}`
    setFixStatus(prev => ({ ...prev, [key]: 'fixing' }))
    
    try {
      const response = await fetch('/api/dev-actions/fix-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fix-orphaned-content',
          data: { entityType, orphanedIds }
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      setFixStatus(prev => ({ ...prev, [key]: 'success' }))
      
      // Re-run verification after fix
      await runVerification()
      
    } catch (error) {
      console.error(`Error deleting orphaned ${entityType}:`, error)
      setFixStatus(prev => ({ ...prev, [key]: 'error' }))
    }
  }
  
  const getStatusIcon = (key: string) => {
    if (fixStatus[key] === 'fixing') return <RefreshCw className="animate-spin h-4 w-4" />
    if (fixStatus[key] === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (fixStatus[key] === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className="content-integrity-check p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <PanelLeft className="h-5 w-5 mr-2 text-[#AE9773]" />
            Content Integrity Check
          </h2>
          
          <button
            onClick={runVerification}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-white text-sm flex items-center ${
              loading ? 'bg-gray-400' : 'bg-[#AE9773] hover:bg-[#8b7255]'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Check
              </>
            )}
          </button>
        </div>
        
        {showResults && (
          <div className="results-area">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
              </div>
            ) : verifyResult?.error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                <h3 className="font-semibold">Error Running Check</h3>
                <p className="text-sm">{verifyResult.error}</p>
              </div>
            ) : verifyResult ? (
              <div className="grid gap-6">
                {/* Overview */}
                <div className="overview">
                  <h3 className="font-medium text-gray-700 mb-2">Content Overview</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <div className="text-sm text-blue-700">Programs</div>
                      <div className="text-xl font-semibold">{verifyResult.counts?.programs || 0}</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-md p-3">
                      <div className="text-sm text-green-700">Courses</div>
                      <div className="text-xl font-semibold">{verifyResult.counts?.courses || 0}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-md p-3">
                      <div className="text-sm text-purple-700">Lessons</div>
                      <div className="text-xl font-semibold">{verifyResult.counts?.lessons || 0}</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-md p-3">
                      <div className="text-sm text-orange-700">Modules</div>
                      <div className="text-xl font-semibold">{verifyResult.counts?.modules || 0}</div>
                    </div>
                  </div>
                </div>
                
                {/* Issues */}
                <div className="issues">
                  <h3 className="font-medium text-gray-700 mb-2">Potential Issues</h3>
                  
                  {/* Orphaned Content */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Orphaned Content (Parent Does Not Exist)</h4>
                    
                    {(verifyResult.issues?.orphanedCourses?.length || 0) > 0 && (
                      <div className="mb-2 bg-red-50 border border-red-100 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-red-700">
                            Orphaned Courses: {verifyResult.issues.orphanedCourses.length}
                          </div>
                          <button
                            onClick={() => 
                              deleteOrphanedContent(
                                'courses', 
                                verifyResult.issues.orphanedCourses.map((c: any) => c.id)
                              )
                            }
                            disabled={fixStatus['delete-courses'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete All
                            {getStatusIcon('delete-courses')}
                          </button>
                        </div>
                        <div className="text-xs text-red-600 max-h-24 overflow-y-auto">
                          {verifyResult.issues.orphanedCourses.map((course: any) => (
                            <div key={course.id} className="mb-1">
                              ID: {course.id} - {course.title} (Missing Program: {course.program_id})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(verifyResult.issues?.orphanedLessons?.length || 0) > 0 && (
                      <div className="mb-2 bg-red-50 border border-red-100 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-red-700">
                            Orphaned Lessons: {verifyResult.issues.orphanedLessons.length}
                          </div>
                          <button
                            onClick={() => 
                              deleteOrphanedContent(
                                'lessons', 
                                verifyResult.issues.orphanedLessons.map((l: any) => l.id)
                              )
                            }
                            disabled={fixStatus['delete-lessons'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete All
                            {getStatusIcon('delete-lessons')}
                          </button>
                        </div>
                        <div className="text-xs text-red-600 max-h-24 overflow-y-auto">
                          {verifyResult.issues.orphanedLessons.map((lesson: any) => (
                            <div key={lesson.id} className="mb-1">
                              ID: {lesson.id} - {lesson.title} (Missing Course: {lesson.course_id})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(verifyResult.issues?.orphanedModules?.length || 0) > 0 && (
                      <div className="mb-2 bg-red-50 border border-red-100 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-red-700">
                            Orphaned Modules: {verifyResult.issues.orphanedModules.length}
                          </div>
                          <button
                            onClick={() => 
                              deleteOrphanedContent(
                                'modules', 
                                verifyResult.issues.orphanedModules.map((m: any) => m.id)
                              )
                            }
                            disabled={fixStatus['delete-modules'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete All
                            {getStatusIcon('delete-modules')}
                          </button>
                        </div>
                        <div className="text-xs text-red-600 max-h-24 overflow-y-auto">
                          {verifyResult.issues.orphanedModules.map((module: any) => (
                            <div key={module.id} className="mb-1">
                              ID: {module.id} - {module.title} (Missing Lesson: {module.lesson_id})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(verifyResult.issues?.orphanedCourses?.length || 0) === 0 && 
                     (verifyResult.issues?.orphanedLessons?.length || 0) === 0 && 
                     (verifyResult.issues?.orphanedModules?.length || 0) === 0 && (
                      <div className="bg-green-50 border border-green-100 rounded-md p-3">
                        <div className="text-sm text-green-700 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          No orphaned content found
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Empty Containers */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Empty Containers (No Children)</h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                        <div className="text-sm text-amber-700 mb-1">
                          Empty Programs: {verifyResult.issues?.emptyPrograms?.length || 0}
                        </div>
                        {(verifyResult.issues?.emptyPrograms?.length || 0) > 0 ? (
                          <div className="text-xs text-amber-600 max-h-24 overflow-y-auto">
                            {verifyResult.issues.emptyPrograms.map((program: any) => (
                              <div key={program.id} className="mb-1 truncate">
                                {program.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-green-700">All programs have courses</div>
                        )}
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                        <div className="text-sm text-amber-700 mb-1">
                          Empty Courses: {verifyResult.issues?.emptyCourses?.length || 0}
                        </div>
                        {(verifyResult.issues?.emptyCourses?.length || 0) > 0 ? (
                          <div className="text-xs text-amber-600 max-h-24 overflow-y-auto">
                            {verifyResult.issues.emptyCourses.map((course: any) => (
                              <div key={course.id} className="mb-1 truncate">
                                {course.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-green-700">All courses have lessons</div>
                        )}
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                        <div className="text-sm text-amber-700 mb-1">
                          Empty Lessons: {verifyResult.issues?.emptyLessons?.length || 0}
                        </div>
                        {(verifyResult.issues?.emptyLessons?.length || 0) > 0 ? (
                          <div className="text-xs text-amber-600 max-h-24 overflow-y-auto">
                            {verifyResult.issues.emptyLessons.map((lesson: any) => (
                              <div key={lesson.id} className="mb-1 truncate">
                                {lesson.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-green-700">All lessons have modules</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sequence Order Fixes */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Sequence Order Fixes</h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-blue-700">Course Order</div>
                          <button
                            onClick={() => fixSequenceOrder('courses')}
                            disabled={fixStatus['courses'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Fix Order
                            {getStatusIcon('courses')}
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-blue-700">Lesson Order</div>
                          <button
                            onClick={() => fixSequenceOrder('lessons')}
                            disabled={fixStatus['lessons'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Fix Order
                            {getStatusIcon('lessons')}
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-blue-700">Module Order</div>
                          <button
                            onClick={() => fixSequenceOrder('modules')}
                            disabled={fixStatus['modules'] === 'fixing'}
                            className="flex items-center text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Fix Order
                            {getStatusIcon('modules')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Run the integrity check to see content statistics and fix any issues
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 