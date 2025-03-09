'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Book, CheckCircle, Clock, Edit, ExternalLink } from 'lucide-react'

type CourseCard = {
  id: string
  title: string
  description: string
  moduleCount: number
  status: 'completed' | 'in_progress' | 'not_started'
  progress: number
  imageUrl: string
  programId: string
}

export default function TrainingPortal() {
  const [activeTab, setActiveTab] = useState('all')
  const [courses, setCourses] = useState<CourseCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  
  // Check if the user is an admin or training manager
  useEffect(() => {
    async function checkUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
            
          if (data && (data.role === 'admin' || data.role === 'training_manager')) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }
    
    checkUserRole()
  }, [supabase])
  
  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      
      try {
        // Check if necessary tables exist
        const { error: tableCheckError } = await supabase
          .from('programs')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.warn('Required tables may not exist yet.', tableCheckError);
          setCourses([]);
          setLoading(false);
          return;
        }
        
        // Fetch real course data from Supabase
        // This should eventually be replaced with a proper query that includes user progress
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select(`
            id,
            title,
            description, 
            thumbnail_url,
            courses:courses(count)
          `)
          .eq('status', 'published');
          
        if (programsError) {
          throw programsError;
        }
        
        // Transform to expected format
        // In a real implementation, we'd fetch actual user progress as well
        const transformedCourses: CourseCard[] = programsData.map(program => ({
          id: program.id,
          programId: program.id,
          title: program.title,
          description: program.description || '',
          moduleCount: program.courses[0]?.count || 0,
          status: 'not_started' as 'not_started', // Default status
          progress: 0,  // Default progress
          imageUrl: program.thumbnail_url || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=300&auto=format&fit=crop'
        }));
        
        setCourses(transformedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCourses();
  }, [supabase]);
  
  const filteredCourses = courses.filter(course => {
    if (activeTab === 'all') return true
    if (activeTab === 'in_progress') return course.status === 'in_progress'
    if (activeTab === 'completed') return course.status === 'completed'
    if (activeTab === 'not_started') return course.status === 'not_started'
    return true
  })
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center text-green-600 font-medium">
            <CheckCircle className="w-4 h-4 mr-1" />
          </div>
        )
      case 'in_progress':
        return (
          <div className="flex items-center text-amber-600 font-medium">
            <Clock className="w-4 h-4 mr-1" />
          </div>
        )
      case 'not_started':
        return (
          <div className="flex items-center text-gray-600 font-medium">
            <Clock className="w-4 h-4 mr-1" />
          </div>
        )
      default:
        return null
    }
  }
  
  const getActionButton = (course: CourseCard) => {
    switch (course.status) {
      case 'completed':
      case 'in_progress':
        return (
          <Link 
            href={`/dashboard/university/program/${course.programId}`}
            className="py-2 px-4 bg-[#AE9773] text-white font-medium rounded hover:bg-[#9e866a] transition-colors"
          >
            Continue
          </Link>
        )
      case 'not_started':
        return (
          <Link 
            href={`/dashboard/university/program/${course.programId}`}
            className="py-2 px-4 bg-[#AE9773] text-white font-medium rounded hover:bg-[#9e866a] transition-colors"
          >
            Start Course
          </Link>
        )
      default:
        return null
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Training Portal</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all' 
                ? 'border-[#AE9773] text-[#AE9773]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Courses
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'in_progress' 
                ? 'border-[#AE9773] text-[#AE9773]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed' 
                ? 'border-[#AE9773] text-[#AE9773]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('not_started')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'not_started' 
                ? 'border-[#AE9773] text-[#AE9773]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Not Started
          </button>
        </nav>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white rounded-lg overflow-hidden shadow border border-gray-200">
              <div className="h-48 relative overflow-hidden">
                {course.imageUrl ? (
                  <Image 
                    src={course.imageUrl}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <Book className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                
                {/* Admin Edit Link - Only visible to admins/training managers */}
                {isAdmin && (
                  <Link
                    href={`/dashboard/university/content/structure?edit=course&id=${course.id}`}
                    className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                    title="Edit Course"
                  >
                    <Edit className="h-4 w-4 text-gray-700" />
                  </Link>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                  <div className="flex items-center">
                    {getStatusIcon(course.status)}
                    <span className="text-xs font-medium text-white ml-1 uppercase">
                      {course.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 mt-2">{course.title}</h3>
                <p className="text-gray-600 mt-1 mb-4">{course.description}</p>
                
                {/* Progress bar with higher contrast */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        course.status === 'completed' ? 'bg-green-600' : 
                        course.status === 'in_progress' ? 'bg-amber-600' : 'bg-gray-300'
                      }`}
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">{course.moduleCount} modules</span>
                  
                  {course.progress > 0 && (
                    <span className="text-gray-900 font-bold">
                      {course.progress}% Complete
                    </span>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  {getActionButton(course)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 