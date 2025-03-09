'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
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

export default function CourseDetail({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchCourse()
  }, [])
  
  const fetchCourse = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch real course data from Supabase
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', params.id)
        .single()
        
      if (error) throw error
      
      if (data) {
        setCourse(data)
        // Fetch the program this course belongs to
        fetchProgram(data.program_id)
        // Fetch lessons for this course
        fetchLessons(data.id)
      } else {
        setError('Course not found.')
      }
    } catch (error: any) {
      console.error('Error fetching course:', error)
      setError('Failed to fetch course details. Please try again later.')
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
      <Link href="/dashboard/university/training" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Training Portal
      </Link>
    </div>
  )
  
  if (!course) return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
        Course not found.
      </div>
      <Link href="/dashboard/university/training" className="inline-flex items-center text-[#AE9773] hover:text-[#8E795D]">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Training Portal
      </Link>
    </div>
  )
  
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
            <Link href="/dashboard/university/training" className="inline-flex items-center text-gray-600 hover:text-gray-800">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Training Portal
            </Link>
          )}
        </div>
      </div>
      
      {/* Course Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">{course.title}</h1>
          <p className="mb-4 text-lg text-gray-700">{course.description}</p>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Clock className="mr-1 h-4 w-4" />
            <span className="mr-4">Updated {new Date(course.updated_at).toLocaleDateString()}</span>
            
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
    </div>
  )
} 