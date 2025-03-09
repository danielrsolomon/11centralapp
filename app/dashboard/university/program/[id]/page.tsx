'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Clock, Users, LayoutGrid, UserCircle2, Play, BookOpen } from 'lucide-react'

type Program = {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  departments?: string[]
  courses_count: number
  created_at: string
  updated_at: string
}

type Course = {
  id: string
  title: string
  description: string
  thumbnail_url?: string | null
  program_id: string
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
  lessons_count?: number
}

export default function ProgramDetail({ params }: { params: { id: string } }) {
  const [program, setProgram] = useState<Program | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchProgram()
    fetchCourses()
  }, [])
  
  const fetchProgram = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch real program data from Supabase
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', params.id)
        .single()
        
      if (error) throw error
      
      if (data) {
        setProgram(data)
      } else {
        setError('Program not found.')
      }
    } catch (error: any) {
      console.error('Error fetching program:', error)
      setError('Failed to fetch program details. Please try again later.')
    }
  }
  
  const fetchCourses = async () => {
    try {
      // Fetch real courses data from Supabase
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', params.id)
        .order('sequence_order', { ascending: true })
        
      if (error) throw error
      
      if (data) {
        setCourses(data)
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error)
      setError('Failed to fetch courses. Please try again later.')
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
  
  if (!program) return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
        Program not found.
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
          <Link href="/dashboard/university/training" className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Training Portal
          </Link>
        </div>
      </div>
      
      {/* Banner */}
      <div className="relative h-80 w-full bg-gray-900">
        {program.thumbnail_url ? (
          <Image
            src={program.thumbnail_url}
            alt={program.title}
            fill
            className="object-cover opacity-70"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#AE9773] to-[#8E795D]"></div>
        )}
        
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto max-w-7xl px-4 text-white">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">{program.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>{courses.length} {courses.length === 1 ? 'Course' : 'Courses'}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span>Updated {new Date(program.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex-1 px-4 py-8 lg:px-8">
          {/* Overview */}
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Overview</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700">{program.description}</p>
            </div>
          </div>
          
          {/* Courses */}
          <div>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Courses</h2>
            
            {courses.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No courses available yet</h3>
                <p className="text-gray-600">
                  Courses for this program are being developed. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {courses.map((course, index) => (
                  <Link 
                    key={course.id}
                    href={`/dashboard/university/course/${course.id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="h-40 overflow-hidden bg-gray-200 relative">
                      {course.thumbnail_url ? (
                        <Image
                          src={course.thumbnail_url}
                          alt={course.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <BookOpen className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 rounded-full bg-white p-2 shadow group-hover:bg-[#AE9773] group-hover:text-white transition-colors">
                        <Play className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-center text-sm text-gray-500">
                        <span>Course {index + 1}</span>
                        {course.lessons_count && (
                          <span className="ml-auto flex items-center">
                            <BookOpen className="mr-1 h-4 w-4" />
                            {course.lessons_count} {course.lessons_count === 1 ? 'Lesson' : 'Lessons'}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-[#AE9773]">
                        {course.title}
                      </h3>
                      
                      <p className="mb-4 flex-1 text-sm text-gray-600">
                        {course.description.length > 120 
                          ? `${course.description.substring(0, 120)}...` 
                          : course.description}
                      </p>
                      
                      <div className="mt-auto">
                        <span className="inline-flex items-center text-sm font-medium text-[#AE9773] group-hover:text-[#8E795D]">
                          Start Course <ChevronLeft className="ml-1 h-4 w-4 rotate-180" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 