'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Folder, Book, Edit, Trash2, ArrowLeft, Plus, X, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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

type Course = {
  id: string
  title: string
  description: string
  status: string
  program_id: string
  lessons_count: number
  sequence_order: number
  created_at: string
  updated_at: string
}

export default function ProgramDetail({ params }: { params: { id: string } }) {
  const [program, setProgram] = useState<Program | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    status: 'draft',
    sequence_order: 1
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchProgram()
    fetchCourses()
  }, [])
  
  const fetchProgram = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // For demo purposes, return dummy data
      const dummyProgram: Program = {
        id: params.id,
        title: 'Management Training',
        description: 'Comprehensive program for new and existing managers',
        status: 'published',
        thumbnail_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=300&auto=format&fit=crop',
        departments: ['Management', 'Administration'],
        courses_count: 4,
        created_at: '2023-05-15T08:00:00.000Z',
        updated_at: '2023-06-10T14:30:00.000Z'
      }
      
      setProgram(dummyProgram)
      
      // In a real app, you would fetch from Supabase
      /*
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', params.id)
        .single()
        
      if (error) throw error
      
      if (data) {
        setProgram(data)
      }
      */
    } catch (error: any) {
      console.error('Error fetching program:', error)
      setError('Failed to fetch program details. Please try again later.')
    }
  }
  
  const fetchCourses = async () => {
    try {
      // For demo purposes, return dummy data
      const dummyCourses: Course[] = [
        {
          id: '101',
          title: 'Leadership Fundamentals',
          description: 'Core leadership principles for new managers',
          status: 'published',
          program_id: params.id,
          lessons_count: 5,
          sequence_order: 1,
          created_at: '2023-05-16T09:00:00.000Z',
          updated_at: '2023-06-10T14:30:00.000Z'
        },
        {
          id: '102',
          title: 'Team Building Strategies',
          description: 'Effective techniques for building cohesive teams',
          status: 'published',
          program_id: params.id,
          lessons_count: 4,
          sequence_order: 2,
          created_at: '2023-05-17T10:15:00.000Z',
          updated_at: '2023-06-01T11:45:00.000Z'
        },
        {
          id: '103',
          title: 'Conflict Resolution',
          description: 'Methods for addressing and resolving workplace conflicts',
          status: 'draft',
          program_id: params.id,
          lessons_count: 3,
          sequence_order: 3,
          created_at: '2023-05-18T14:30:00.000Z',
          updated_at: '2023-05-18T14:30:00.000Z'
        },
        {
          id: '104',
          title: 'Performance Management',
          description: 'Setting goals and evaluating team performance',
          status: 'draft',
          program_id: params.id,
          lessons_count: 0,
          sequence_order: 4,
          created_at: '2023-05-19T16:45:00.000Z',
          updated_at: '2023-05-19T16:45:00.000Z'
        }
      ]
      
      setCourses(dummyCourses)
      
      // In a real app, you would fetch from Supabase
      /*
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', params.id)
        .order('sequence_order', { ascending: true })
        
      if (error) throw error
      
      if (data) {
        setCourses(data)
      }
      */
    } catch (error: any) {
      console.error('Error fetching courses:', error)
      setError('Failed to fetch courses. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewCourse(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real application, you would send this data to your backend/API
    // For this demo, we'll just add it to our state
    
    const currentTime = new Date().toISOString()
    const id = Date.now().toString()
    const newCourseWithId = { 
      id, 
      ...newCourse, 
      program_id: params.id,
      lessons_count: 0,
      created_at: currentTime,
      updated_at: currentTime
    }
    
    setCourses(prev => [...prev, newCourseWithId])
    setShowCourseForm(false)
    setNewCourse({ 
      title: '', 
      description: '', 
      status: 'draft',
      sequence_order: courses.length + 1
    })
    
    // Update program courses_count
    if (program) {
      setProgram({
        ...program,
        courses_count: program.courses_count + 1
      })
    }
  }
  
  if (loading) return <div className="flex justify-center p-12"><span className="loading loading-spinner loading-lg"></span></div>
  if (error) return <div className="p-12 text-red-500">{error}</div>
  if (!program) return <div className="p-12">Program not found</div>
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/dashboard/university/content/structure" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Programs
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start md:items-center flex-col md:flex-row justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            {program.thumbnail_url ? (
              <div className="h-16 w-16 mr-4 relative">
                <Image
                  src={program.thumbnail_url}
                  alt={program.title}
                  fill
                  className="rounded-md object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 mr-4 bg-gray-200 rounded-md flex items-center justify-center">
                <Folder className="h-8 w-8 text-gray-500" />
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{program.title}</h1>
              <p className="text-gray-600">{program.description}</p>
              
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  program.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : program.status === 'draft' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                </span>
                
                {program.departments && program.departments.map(dept => (
                  <span 
                    key={dept} 
                    className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-1 inline" />
              Edit Program
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Courses ({program.courses_count})</h2>
            <button 
              onClick={() => setShowCourseForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Course
            </button>
          </div>
          
          {showCourseForm && (
            <div className="mb-8 p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Create New Course</h3>
              <form onSubmit={handleCreateCourse}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title*
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={newCourse.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter course title"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={newCourse.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newCourse.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter course description"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="sequence_order" className="block text-sm font-medium text-gray-700 mb-1">
                    Sequence Order
                  </label>
                  <input
                    type="number"
                    id="sequence_order"
                    name="sequence_order"
                    value={newCourse.sequence_order}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCourseForm(false)
                      setNewCourse({
                        title: '',
                        description: '',
                        status: 'draft',
                        sequence_order: courses.length + 1
                      })
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {courses.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Book className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first course</p>
              <button 
                onClick={() => setShowCourseForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Course
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lessons
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {course.sequence_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 mr-3 bg-blue-100 rounded-md flex items-center justify-center">
                            <Book className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                            {course.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{course.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          course.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : course.status === 'draft' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {course.lessons_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(course.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-5 w-5" />
                          </button>
                          <Link 
                            href={`/dashboard/university/content/structure/program/${program.id}/course/${course.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 