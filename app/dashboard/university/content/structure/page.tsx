'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../../lib/supabase'
import { 
  Plus, 
  ChevronRight, 
  MoreHorizontal, 
  Book, 
  Folder,
  FileText,
  Eye,
  Edit,
  Archive,
  Copy,
  Trash2,
  Play,
  Layers,
  BookOpen,
  GraduationCap
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ModuleForm from './components/ModuleForm'

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
  program_id: string
  title: string
  description: string
  overview?: string
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
  lessons_count?: number
}

type Lesson = {
  id: string
  course_id: string
  title: string
  description: string
  instructors?: string[]
  sequence_order: number
  status: string
  created_at: string
  updated_at: string
  modules_count?: number
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
  quiz_questions: QuizQuestion[]
  created_at: string
  updated_at: string
}

type QuizQuestion = {
  id: string
  question_text: string
  options: string[] | boolean[]
  correct_answer: string | boolean
  question_type: 'multiple_choice' | 'true_false'
}

export default function ContentStructure() {
  const [activeTab, setActiveTab] = useState('programs')
  const [programs, setPrograms] = useState<Program[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    departments: [] as string[],
    status: 'draft'
  })
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchPrograms() {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch from Supabase
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
          .order('created_at', { ascending: false })
        
        if (error) {
          throw error
        }

        const programsWithCourseCount = data.map(program => ({
          ...program,
          courses_count: program.courses[0]?.count || 0
        }))
        
        setPrograms(programsWithCourseCount)
        
        // For demo/development only - use dummy data if no real data
        if (programsWithCourseCount.length === 0) {
          const dummyPrograms: Program[] = [
            {
              id: '1',
              title: 'Management Training',
              description: 'Leadership and management skills for club managers',
              status: 'published',
              thumbnail_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=300&auto=format&fit=crop',
              departments: ['management', 'administration'],
              courses_count: 5,
              created_at: '2023-06-15T14:30:00.000Z',
              updated_at: '2023-07-01T11:20:00.000Z'
            },
            {
              id: '2',
              title: 'Service Excellence',
              description: 'Customer service best practices for front-line staff',
              status: 'draft',
              thumbnail_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=300&auto=format&fit=crop',
              departments: ['service'],
              courses_count: 2,
              created_at: '2023-06-20T10:15:00.000Z',
              updated_at: '2023-06-20T10:15:00.000Z'
            },
            {
              id: '3',
              title: 'Security Protocols',
              description: 'Essential security training for all security personnel',
              status: 'published',
              thumbnail_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=300&auto=format&fit=crop',
              departments: ['security'],
              courses_count: 3,
              created_at: '2023-04-10T09:45:00.000Z',
              updated_at: '2023-05-05T16:20:00.000Z'
            }
          ]
          
          setPrograms(dummyPrograms)
        }
      } catch (error) {
        console.error('Error fetching programs:', error)
        setError('Failed to load programs. Please try again later.')
        
        // Fallback to dummy data for development
        const dummyPrograms: Program[] = [
          {
            id: '1',
            title: 'Management Training',
            description: 'Leadership and management skills for club managers',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=300&auto=format&fit=crop',
            departments: ['management', 'administration'],
            courses_count: 5,
            created_at: '2023-06-15T14:30:00.000Z',
            updated_at: '2023-07-01T11:20:00.000Z'
          },
          {
            id: '2',
            title: 'Service Excellence',
            description: 'Customer service best practices for front-line staff',
            status: 'draft',
            thumbnail_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=300&auto=format&fit=crop',
            departments: ['service'],
            courses_count: 2,
            created_at: '2023-06-20T10:15:00.000Z',
            updated_at: '2023-06-20T10:15:00.000Z'
          },
          {
            id: '3',
            title: 'Security Protocols',
            description: 'Essential security training for all security personnel',
            status: 'published',
            thumbnail_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=300&auto=format&fit=crop',
            departments: ['security'],
            courses_count: 3,
            created_at: '2023-04-10T09:45:00.000Z',
            updated_at: '2023-05-05T16:20:00.000Z'
          }
        ]
        
        setPrograms(dummyPrograms)
      } finally {
        setLoading(false)
      }
    }
    
    async function fetchDepartments() {
      try {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, description')
          .order('name', { ascending: true })
        
        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          console.log('Fetched departments:', data);
          setDepartments(data);
        } else {
          // If no departments in database, set defaults
          setDepartments([
            { id: 'all', name: 'All' },
            { id: 'management', name: 'Management' },
            { id: 'service', name: 'Service' },
            { id: 'security', name: 'Security' },
            { id: 'administration', name: 'Administration' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching departments:', error)
        // Keep using the default departments array
        setDepartments([
          { id: 'all', name: 'All' },
          { id: 'management', name: 'Management' },
          { id: 'service', name: 'Service' },
          { id: 'security', name: 'Security' },
          { id: 'administration', name: 'Administration' }
        ]);
      }
    }
    
    fetchPrograms()
    fetchDepartments()
    
    // Check URL params for actions
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'create-program') {
      setShowProgramForm(true)
    }
  }, [supabase])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewProgram(prev => ({ ...prev, [name]: value }))
  }
  
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setNewProgram(prev => {
      let updatedDepartments: string[];
      
      if (checked && !prev.departments.includes(value)) {
        updatedDepartments = [...prev.departments, value];
      } else if (!checked) {
        updatedDepartments = prev.departments.filter(dept => dept !== value);
      } else {
        updatedDepartments = [...prev.departments];
      }
      
      // If 'all' is checked, only keep 'all'
      if (value === 'all' && checked) {
        updatedDepartments = ['all'];
      } 
      // If another department is checked while 'all' is checked, remove 'all'
      else if (value !== 'all' && checked && updatedDepartments.includes('all')) {
        updatedDepartments = updatedDepartments.filter(dept => dept !== 'all');
      }
      
      console.log('Updated departments:', updatedDepartments);
      return { ...prev, departments: updatedDepartments };
    });
  }
  
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Log the file details
      console.log('Thumbnail file:', file.name, file.type, file.size);
      
      // For demonstration purposes, we'll use a placeholder image URL
      // In production, this would upload to Supabase Storage
      const placeholderUrl = `https://via.placeholder.com/300x200?text=${encodeURIComponent(file.name)}`;
      setNewProgram(prev => ({ ...prev, thumbnail_url: placeholderUrl }));
      
      /* Real implementation would be:
      const { data, error } = await supabase
        .storage
        .from('program-thumbnails')
        .upload(`program-${Date.now()}-${file.name}`, file);
        
      if (error) throw error;
      
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/program-thumbnails/${data.path}`;
      setNewProgram(prev => ({ ...prev, thumbnail_url: url }));
      */
    } catch (error) {
      console.error('Error handling thumbnail:', error);
      alert('Failed to process the thumbnail. Please try a different image.');
    }
  }
  
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      // Upload thumbnail if provided
      let thumbnailUrl = newProgram.thumbnail_url;
      
      console.log('Creating program with data:', {
        title: newProgram.title,
        description: newProgram.description,
        status: newProgram.status,
        departments: newProgram.departments,
        thumbnail_url: thumbnailUrl
      });
      
      // Insert the new program into Supabase
      const { data, error } = await supabase
        .from('programs')
        .insert({
          title: newProgram.title,
          description: newProgram.description,
          status: newProgram.status,
          thumbnail_url: thumbnailUrl,
          departments: newProgram.departments
        })
        .select()
        .single()
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error
      }
      
      console.log('Program created successfully:', data);
      
      // Add to state for immediate UI update
      setPrograms([
        {
          ...data,
          courses_count: 0
        },
        ...programs
      ])
      
      // Close the form and reset
      setShowProgramForm(false)
      setNewProgram({
        title: '',
        description: '',
        thumbnail_url: '',
        departments: [],
        status: 'draft'
      })
      
      // Show success message
      alert('Program created successfully!')
    } catch (error: any) {
      console.error('Error creating program:', error)
      alert(`Failed to create program: ${error?.message || 'Please try again.'}`)
    } finally {
      setSubmitting(false)
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Published</span>
      case 'draft':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Draft</span>
      case 'archived':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Archived</span>
      default:
        return null
    }
  }
  
  // Module handling
  const handleShowModuleForm = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setShowModuleForm(true)
  }
  
  const handleModuleSuccess = () => {
    setShowModuleForm(false)
    // Refresh modules list
    if (selectedLessonId) {
      fetchModules(selectedLessonId)
    }
  }
  
  // Function to fetch modules for a selected lesson
  const fetchModules = async (lessonId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sequence_order')
      
      if (error) {
        throw error
      }
      
      setModules(data || [])
    } catch (error) {
      console.error('Error fetching modules:', error)
      setError('Failed to load modules')
      
      // Fallback to empty array
      setModules([])
    } finally {
      setLoading(false)
    }
  }
  
  // When a lesson is selected, fetch its modules
  useEffect(() => {
    if (selectedLessonId) {
      fetchModules(selectedLessonId)
    }
  }, [selectedLessonId, supabase])
  
  const resetForm = () => {
    setNewProgram({
      title: '',
      description: '',
      thumbnail_url: '',
      departments: [],
      status: 'draft'
    });
    setShowProgramForm(false);
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Content Structure</h1>
        <button 
          onClick={() => setShowProgramForm(true)}
          className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Program
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Program Creation Form */}
      {showProgramForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Program</h2>
          <form onSubmit={handleCreateProgram}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Program Title*
              </label>
              <input
                type="text"
                name="title"
                value={newProgram.title}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-400 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium"
                placeholder="Enter program title"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={newProgram.description}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-400 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] h-24 text-gray-900 font-medium"
                placeholder="Enter program description"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Program Thumbnail
              </label>
              <input
                type="file"
                onChange={handleThumbnailUpload}
                className="block w-full text-gray-900 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#AE9773] file:text-white hover:file:bg-[#8E795D]"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Department Access
              </label>
              <div className="flex flex-wrap gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`dept-${dept.id}`}
                      checked={newProgram.departments.includes(dept.id)}
                      onChange={(e) => handleDepartmentChange(e)}
                      value={dept.id}
                      className="mr-2 h-4 w-4 text-[#AE9773] focus:ring-[#AE9773]"
                    />
                    <label htmlFor={`dept-${dept.id}`} className="text-gray-900 font-medium">
                      {dept.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Status
              </label>
              <select
                name="status"
                value={newProgram.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-400 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900 font-medium"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-400 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#AE9773] text-white font-medium rounded-md hover:bg-[#8E795D]"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 mt-4">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departments
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Courses
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
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No programs found. Create your first program to get started!
                  </td>
                </tr>
              ) : (
                programs.map(program => (
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
                            <Folder className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{program.title}</div>
                          {program.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{program.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {program.departments && program.departments.map(deptId => {
                          const dept = departments.find(d => d.id === deptId);
                          return (
                            <span 
                              key={deptId} 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {dept ? dept.name : deptId}
                            </span>
                          );
                        })}
                        {(!program.departments || program.departments.length === 0) && (
                          <span className="text-sm text-gray-500">All</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        program.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : program.status === 'draft' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {program.courses_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(program.created_at).toLocaleDateString()}
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
                          href={`/dashboard/university/content/structure/program/${program.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Module creation form */}
      {showModuleForm && selectedLessonId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <ModuleForm
              lessonId={selectedLessonId}
              onCancel={() => setShowModuleForm(false)}
              onSuccess={handleModuleSuccess}
            />
          </div>
        </div>
      )}
    </div>
  )
} 