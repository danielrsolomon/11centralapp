'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Clock, Users, LayoutGrid, UserCircle2, Play, BookOpen, Pencil } from 'lucide-react'

type Program = {
  id: string
  title: string
  description: string
  thumbnail_url?: string | null
  status: string
  created_at: string
  updated_at: string
  courses_count?: number
}

type Course = {
  id: string
  title: string
  description: string
  thumbnail_url?: string | null
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
  lessons_count?: number
}

export default function ProgramDetail() {
  // Use useParams hook instead of accepting params as a prop
  const params = useParams();
  const programId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  
  const [program, setProgram] = useState<Program | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInstructor, setIsInstructor] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    // Only fetch data if programId is available
    if (programId) {
      fetchProgram()
      fetchCourses()
      checkUserRoles()
    } else {
      setError('Program ID is required')
      setLoading(false)
    }
  }, [programId])
  
  const fetchProgram = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single()
        
      if (error) throw error
      
      if (data) {
        setProgram(data)
      } else {
        setError('Program not found.')
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching program:', err)
      setError('Failed to fetch program details. Please try again later.')
      setLoading(false)
    }
  }
  
  const fetchCourses = async () => {
    try {
      // Fetch real courses data from Supabase
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', programId)
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
  
  const checkUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        
      if (error) throw error
      
      if (data) {
        setIsAdmin(data.some((role: any) => role.role === 'admin'))
        setIsInstructor(data.some((role: any) => role.role === 'instructor'))
      }
    } catch (error: any) {
      console.error('Error checking user roles:', error)
      setError('Failed to check user roles. Please try again later.')
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
  
  if (!program) return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
        Program not found.
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
          <Link href="/dashboard/university/programs" className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Programs
          </Link>
        </div>
      </div>
      
      {/* Banner */}
      <div className="relative h-80 w-full bg-gray-900">
        {program?.thumbnail_url ? (
          <Image
            src={program.thumbnail_url}
            alt={program.title}
            fill
            className="object-cover opacity-70"
            priority
            onError={(e) => {
              // Fix: Better fallback if image fails to load
              const imgElement = e.currentTarget as HTMLImageElement;
              imgElement.style.display = 'none';
              // Parent div already has gradient background
              
              // Add a book icon to the gradient background
              const parent = imgElement.parentElement;
              if (parent) {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'absolute inset-0 flex items-center justify-center';
                iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
                parent.appendChild(iconDiv);
              }
            }}
          />
        ) : (
          // Fix: Better fallback for missing thumbnails with a book icon
          <div className="absolute inset-0 bg-gradient-to-r from-[#AE9773] to-[#8E795D] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
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
                          className="object-cover"
                          onError={(e) => {
                            // Fix: Better fallback for failed course thumbnail images
                            const imgElement = e.currentTarget as HTMLImageElement;
                            imgElement.style.display = 'none';
                            
                            // Add gradient background with book icon
                            const parent = imgElement.parentElement;
                            if (parent) {
                              parent.classList.add('bg-gradient-to-r', 'from-[#AE9773]', 'to-[#8E795D]');
                              
                              // Add book icon
                              const iconDiv = document.createElement('div');
                              iconDiv.className = 'flex items-center justify-center h-full';
                              iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
                              parent.appendChild(iconDiv);
                            }
                          }}
                        />
                      ) : (
                        // Fix: Better fallback for missing course thumbnails
                        <div className="w-full h-full bg-gradient-to-r from-[#AE9773] to-[#8E795D] flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                          </svg>
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