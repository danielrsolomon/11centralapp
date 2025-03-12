'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Clock, BookOpen, Play, CheckCircle, Lock } from 'lucide-react'

type Course = {
  id: string
  program_id: string
  title: string
  description: string
  overview?: string
  sequence_order: number
  status: string
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
}

type Program = {
  id: string
  title: string
}

type Lesson = {
  id: string
  course_id: string
  title: string
  description: string
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
  modules_count?: number
}

export default function CourseDetail() {
  // Use useParams hook instead of accepting params as a prop
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  
  const [course, setCourse] = useState<Course | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInstructor, setIsInstructor] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    // Only fetch data if courseId is available
    if (courseId) {
      fetchCourse()
      checkUserRoles()
    } else {
      setError('Course ID is required')
      setLoading(false)
    }
  }, [courseId])
  
  const fetchCourse = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
        
      if (error) throw error
      
      if (data) {
        setCourse(data)
        fetchProgram(data.program_id)
        fetchLessons(data.id)
      } else {
        setError('Course not found.')
      }
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to fetch course')
      console.error('Error fetching course:', err)
    }
  }
  
  const fetchProgram = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, title')
        .eq('id', programId)
        .single()
        
      if (error) throw error
      
      if (data) {
        setProgram(data)
      }
    } catch (error) {
      console.error('Error fetching program:', error)
    }
  }
  
  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, modules:modules(count)')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true })
        
      if (error) throw error
      
      if (data) {
        setLessons(data)
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
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
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-50 p-4 rounded-lg mb-4 text-red-800">
        {error}
      </div>
      <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
      </Link>
    </div>
  )
  
  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-lg mb-4 text-red-800">
          Course not found.
        </div>
        <Link href="/dashboard/university/programs" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
        </Link>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Back Navigation */}
      <div className="bg-gray-100 py-4">
        <div className="mx-auto max-w-7xl px-4">
          {program ? (
            <Link href={`/dashboard/university/program/${program.id}`} className="inline-flex items-center text-gray-600 hover:text-gray-800">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to {program.title}
            </Link>
          ) : (
            <Link href="/dashboard/university/programs" className="inline-flex items-center text-gray-600 hover:text-gray-800">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
            </Link>
          )}
        </div>
      </div>
      
      {/* Course Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Add course thumbnail if available */}
          {course?.thumbnail_url ? (
            <div className="mb-6 overflow-hidden rounded-lg">
              <Image 
                src={course.thumbnail_url}
                alt={course.title}
                width={800}
                height={400}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  // Fix: Improved fallback if image fails to load
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.classList.add('bg-gradient-to-r', 'from-[#AE9773]', 'to-[#8E795D]', 'h-64');
                    // Add a book icon to the gradient background
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'flex items-center justify-center h-full';
                    iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
                    parent.appendChild(iconDiv);
                  }
                }}
              />
            </div>
          ) : (
            // Fix: Better fallback for missing thumbnails
            <div className="mb-6 h-64 rounded-lg bg-gradient-to-r from-[#AE9773] to-[#8E795D] flex items-center justify-center">
              {/* BookOpen icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
          )}
          
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{course?.title}</h1>
          <p className="mb-4 text-lg text-gray-700">{course?.description}</p>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Clock className="mr-1 h-4 w-4" />
            <span className="mr-4">Updated {course && new Date(course.updated_at).toLocaleDateString()}</span>
            
            {lessons.length > 0 && (
              <div className="flex items-center ml-4">
                <BookOpen className="mr-1 h-4 w-4" />
                <span>{lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <div className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Overview */}
          {course.overview && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-gray-900">Overview</h2>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="prose max-w-none">
                  <p>{course.overview}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Lessons */}
          <div>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Lessons</h2>
            
            {lessons.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No lessons available yet</h3>
                <p className="text-gray-600">
                  Lessons for this course are being developed. Please check back later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div key={lesson.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center p-6">
                      <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <span className="text-lg font-semibold text-gray-700">{index + 1}</span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                        <p className="text-gray-600">{lesson.description}</p>
                        
                        {lesson.modules_count && lesson.modules_count > 0 && (
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <BookOpen className="mr-1 h-4 w-4" />
                            <span>{lesson.modules_count} {lesson.modules_count === 1 ? 'Module' : 'Modules'}</span>
                          </div>
                        )}
                      </div>
                      
                      <Link
                        href={`/dashboard/university/lesson/${lesson.id}`}
                        className="ml-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#AE9773] text-white shadow-sm hover:bg-[#8E795D]"
                      >
                        <Play className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    </div>
  )
} 