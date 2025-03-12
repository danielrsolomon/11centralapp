'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, BookOpen, Play, FileText, Video } from 'lucide-react'

type Lesson = {
  id: string
  course_id: string
  title: string
  description: string
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
}

type Course = {
  id: string
  program_id: string
  title: string
}

type Module = {
  id: string
  lesson_id: string
  title: string
  description: string
  content: string
  sequence_order: number
  status: string
  video_url: string | null
  video_required: boolean
  has_quiz: boolean
  quiz_type: string | null
  created_at: string
  updated_at: string
}

export default function LessonDetail({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInstructor, setIsInstructor] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchLesson()
  }, [])
  
  const fetchLesson = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch real lesson data from Supabase
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', params.id)
        .single()
        
      if (error) throw error
      
      if (data) {
        setLesson(data)
        // Fetch the course this lesson belongs to
        fetchCourse(data.course_id)
        // Fetch modules for this lesson
        fetchModules(data.id)
        // Check user roles
        checkUserRoles()
      } else {
        setError('Lesson not found.')
      }
    } catch (error: any) {
      console.error('Error fetching lesson:', error)
      setError('Failed to fetch lesson details. Please try again later.')
    }
  }
  
  const fetchCourse = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, program_id, title')
        .eq('id', courseId)
        .single()
        
      if (error) throw error
      
      if (data) {
        setCourse(data)
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    }
  }
  
  const fetchModules = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sequence_order', { ascending: true })
        
      if (error) throw error
      
      if (data) {
        setModules(data)
      }
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const checkUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data, error } = await supabase
        .from('users')
        .select('is_admin, is_instructor')
        .eq('id', user.id)
        .single()
        
      if (error) throw error
      
      if (data) {
        setIsAdmin(data.is_admin)
        setIsInstructor(data.is_instructor)
      }
    } catch (error) {
      console.error('Error checking user roles:', error)
    }
  }
  
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#AE9773] border-t-transparent"></div>
    </div>
  )
  
  if (error) return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
        {error}
      </div>
      <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
      </Link>
    </div>
  )
  
  if (!lesson) return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
        Lesson not found.
      </div>
      <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
      </Link>
    </div>
  )
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Back Navigation */}
      <div className="bg-gray-100 py-4">
        <div className="mx-auto max-w-7xl px-4">
          {course ? (
            <Link href={`/dashboard/university/course/${course.id}`} className="inline-flex items-center text-gray-600 hover:text-gray-800">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to {course.title}
            </Link>
          ) : (
            <Link href="/dashboard/university/programs" className="inline-flex items-center text-gray-600 hover:text-gray-800">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
            </Link>
          )}
        </div>
      </div>
      
      {/* Lesson Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{lesson.title}</h1>
          <p className="mb-4 text-lg text-gray-700">{lesson.description}</p>
          
          {modules.length > 0 && (
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <BookOpen className="mr-1 h-4 w-4" />
              <span>{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Admin Actions */}
      {isAdmin && (
        <div className="mb-4">
          <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
          </Link>
        </div>
      )}
      
      {/* Instructor Actions */}
      {isInstructor && (
        <div className="mb-4">
          <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
          </Link>
        </div>
      )}
      
      {/* Standard User Actions */}
      {!isAdmin && !isInstructor && (
        <div className="mb-4">
          <Link href="/dashboard/university/programs" className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
          </Link>
        </div>
      )}
      
      {/* Lesson Content */}
      <div className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Modules */}
          <div>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Modules</h2>
            
            {modules.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No modules available yet</h3>
                <p className="text-gray-600">
                  Modules for this lesson are being developed. Please check back later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div key={module.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <span className="text-lg font-semibold text-gray-700">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                          <p className="text-gray-600">{module.description}</p>
                          
                          <div className="mt-2 flex flex-wrap gap-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <FileText className="mr-1 h-4 w-4" />
                              <span>Content</span>
                            </div>
                            
                            {module.video_url && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Video className="mr-1 h-4 w-4" />
                                <span>{module.video_required ? 'Required Video' : 'Optional Video'}</span>
                              </div>
                            )}
                            
                            {module.has_quiz && (
                              <div className="flex items-center text-sm text-gray-500">
                                <BookOpen className="mr-1 h-4 w-4" />
                                <span>Quiz</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Link
                          href={`/dashboard/university/module/${module.id}`}
                          className="ml-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#AE9773] text-white shadow-sm hover:bg-[#8E795D]"
                        >
                          <Play className="h-5 w-5" />
                        </Link>
                      </div>
                      
                      {/* Module Content Preview */}
                      {module.content && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3">
                            <div dangerouslySetInnerHTML={{ 
                              __html: module.content.length > 300 
                                ? module.content.substring(0, 300) + '...' 
                                : module.content 
                            }} />
                          </div>
                          {module.content.length > 300 && (
                            <Link
                              href={`/dashboard/university/module/${module.id}`}
                              className="mt-2 inline-block text-sm font-medium text-[#AE9773] hover:text-[#8E795D]"
                            >
                              Read more
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 