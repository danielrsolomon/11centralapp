'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Folder, Book, Edit, Trash2, ArrowLeft, Plus, X, Eye, FileText } from 'lucide-react'
import Link from 'next/link'

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

type Lesson = {
  id: string
  title: string
  description: string
  status: string
  course_id: string
  modules_count: number
  sequence_order: number
  created_at: string
  updated_at: string
}

export default function CourseDetailClient({ programId, courseId }: { programId: string; courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    status: 'draft',
    sequence_order: 1
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    fetchCourse()
    fetchLessons()
  }, [])
  
  const fetchCourse = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // For demo purposes, return dummy data
      const dummyCourse: Course = {
        id: courseId,
        title: 'Leadership Fundamentals',
        description: 'Core leadership principles for new managers',
        status: 'published',
        program_id: programId,
        lessons_count: 5,
        sequence_order: 1,
        created_at: '2023-05-16T09:00:00.000Z',
        updated_at: '2023-06-10T14:30:00.000Z'
      }
      
      setCourse(dummyCourse)
      
      // In a real app, you would fetch from Supabase
      /*
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
        
      if (error) throw error
      
      if (data) {
        setCourse(data)
      }
      */
    } catch (error: any) {
      console.error('Error fetching course:', error)
      setError('Failed to fetch course details. Please try again later.')
    }
  }
  
  const fetchLessons = async () => {
    try {
      // For demo purposes, return dummy data
      const dummyLessons: Lesson[] = [
        {
          id: '201',
          title: 'Introduction to Leadership',
          description: 'Overview of leadership principles and styles',
          status: 'published',
          course_id: courseId,
          modules_count: 3,
          sequence_order: 1,
          created_at: '2023-05-16T09:00:00.000Z',
          updated_at: '2023-06-10T14:30:00.000Z'
        },
        {
          id: '202',
          title: 'Effective Communication',
          description: 'Strategies for clear and effective communication',
          status: 'published',
          course_id: courseId,
          modules_count: 4,
          sequence_order: 2,
          created_at: '2023-05-17T10:15:00.000Z',
          updated_at: '2023-06-01T11:45:00.000Z'
        },
        {
          id: '203',
          title: 'Delegation Skills',
          description: 'How to delegate tasks effectively',
          status: 'draft',
          course_id: courseId,
          modules_count: 2,
          sequence_order: 3,
          created_at: '2023-05-18T14:30:00.000Z',
          updated_at: '2023-05-18T14:30:00.000Z'
        },
        {
          id: '204',
          title: 'Managing Performance',
          description: 'Setting expectations and giving feedback',
          status: 'draft',
          course_id: courseId,
          modules_count: 0,
          sequence_order: 4,
          created_at: '2023-05-19T16:45:00.000Z',
          updated_at: '2023-05-19T16:45:00.000Z'
        },
        {
          id: '205',
          title: 'Building Team Trust',
          description: 'Creating a culture of trust and psychological safety',
          status: 'draft',
          course_id: courseId,
          modules_count: 0,
          sequence_order: 5,
          created_at: '2023-05-20T11:20:00.000Z',
          updated_at: '2023-05-20T11:20:00.000Z'
        }
      ]
      
      setLessons(dummyLessons)
      
      // In a real app, you would fetch from Supabase
      /*
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true })
        
      if (error) throw error
      
      if (data) {
        setLessons(data)
      }
      */
    } catch (error: any) {
      console.error('Error fetching lessons:', error)
      setError('Failed to fetch lessons. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewLesson(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real application, you would send this data to your backend/API
    // For this demo, we'll just add it to our state
    
    const currentTime = new Date().toISOString()
    const id = Date.now().toString()
    const newLessonWithId = { 
      id, 
      ...newLesson, 
      course_id: courseId,
      modules_count: 0,
      created_at: currentTime,
      updated_at: currentTime
    }
    
    setLessons(prev => [...prev, newLessonWithId])
    setShowLessonForm(false)
    setNewLesson({ 
      title: '', 
      description: '', 
      status: 'draft',
      sequence_order: lessons.length + 1
    })
    
    // Update course lessons_count
    if (course) {
      setCourse({
        ...course,
        lessons_count: course.lessons_count + 1
      })
    }
  }
  
  if (loading) return <div className="flex justify-center p-12"><span className="loading loading-spinner loading-lg"></span></div>
  if (error) return <div className="p-12 text-red-500">{error}</div>
  if (!course) return <div className="p-12">Course not found</div>
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center mb-4">
          <Link href={`/dashboard/university/content/structure/program/${programId}`} className="text-[#AE9773] hover:text-[#8E795D] mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Course Details</h1>
        </div>
        
        {course && (
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{course.title}</h2>
              <p className="text-gray-600 mt-1 mb-2">{course.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                </span>
                
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  Order: {course.sequence_order}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] flex items-center">
                <Edit className="h-4 w-4 mr-1" />
                Edit Course
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Lessons ({course?.lessons_count || 0})</h2>
          <button 
            onClick={() => setShowLessonForm(true)}
            className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Lesson
          </button>
        </div>
        
        {showLessonForm && (
          <div className="mb-8 p-6 border rounded-lg bg-white shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Create New Lesson</h3>
              <button 
                type="button" 
                onClick={() => setShowLessonForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateLesson}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title*
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newLesson.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-[#AE9773]"
                    placeholder="Enter lesson title"
                  />
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={newLesson.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-[#AE9773]"
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
                  value={newLesson.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-[#AE9773]"
                  placeholder="Enter lesson description"
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
                  value={newLesson.sequence_order}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-[#AE9773]"
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLessonForm(false)}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#AE9773] text-white font-medium rounded-md hover:bg-[#8E795D]"
                >
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        )}
        
        {lessons.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No lessons yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first lesson</p>
            <button 
              onClick={() => setShowLessonForm(true)}
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Lesson
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
                    Lesson
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modules
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
                {lessons.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {lesson.sequence_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 mr-3 bg-indigo-100 rounded-md flex items-center justify-center">
                          <FileText className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{lesson.title}</div>
                          {lesson.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{lesson.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lesson.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : lesson.status === 'draft' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lesson.modules_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lesson.created_at).toLocaleDateString()}
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
                          href={`/dashboard/university/content/structure/program/${programId}/course/${course.id}/lesson/${lesson.id}`}
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
  )
} 