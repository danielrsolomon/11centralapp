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
  GraduationCap,
  Settings,
  AlertTriangle,
  X
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ModuleForm from './components/ModuleForm'
import ContentIntegrityCheck from './integrity-check'
import ProgramForm from '../components/ProgramForm'

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
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [programToArchive, setProgramToArchive] = useState<Program | null>(null)
  const [departments, setDepartments] = useState<string[]>(['All Departments'])
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    status: 'draft',
    departments: [] as string[],
    thumbnail_url: ''
  })
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [showAdminTools, setShowAdminTools] = useState(false)
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchPrograms() {
      setLoading(true)
      
      // Just use dummy data instead of trying to query the database
      const dummyPrograms: Program[] = [
        {
          id: '1',
          title: 'Management Training',
          description: 'Leadership and management skills for club managers',
          status: 'published',
          thumbnail_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=300&auto=format&fit=crop',
          departments: ['Management', 'Administration'],
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
          departments: ['Service'],
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
          departments: ['Security'],
          courses_count: 3,
          created_at: '2023-04-10T09:45:00.000Z',
          updated_at: '2023-05-05T16:20:00.000Z'
        }
      ]
      
      // Use timeout to simulate network request
      setTimeout(() => {
        setPrograms(dummyPrograms)
        setLoading(false)
      }, 500)
    }
    
    function fetchDepartments() {
      // Hard-coded departments
      setDepartments(["All", "Management", "Service", "Security", "Administration"])
    }
    
    fetchPrograms()
    fetchDepartments()
    
    // Check URL params for actions
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'create-program') {
      setShowProgramForm(true)
    }
  }, [])  // Remove supabase dependency since we're not using it
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewProgram(prev => ({ ...prev, [name]: value }))
  }
  
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    console.log(`Department changed: ${value}, checked: ${checked}`);
    
    // Create a new departments array based on the current state
    let updatedDepartments = [...newProgram.departments];
    
    if (checked) {
      // If "All" is selected, clear other selections
      if (value === "All") {
        updatedDepartments = ["All"];
      } else {
        // If another department is selected while "All" is selected, remove "All"
        if (updatedDepartments.includes("All")) {
          updatedDepartments = updatedDepartments.filter(dept => dept !== "All");
        }
        
        // Add the newly selected department
        if (!updatedDepartments.includes(value)) {
          updatedDepartments.push(value);
        }
      }
    } else {
      // Remove the unchecked department
      updatedDepartments = updatedDepartments.filter(dept => dept !== value);
    }
    
    // Update the state with the new departments array
    setNewProgram(prev => ({
      ...prev,
      departments: updatedDepartments
    }));
  };
  
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
    
    console.log('Creating program with departments:', newProgram.departments);
    
    try {
      // Validate that we have at least one department selected
      if (newProgram.departments.length === 0) {
        alert("Please select at least one department access option.");
        setSubmitting(false);
        return;
      }
      
      // Generate a fake ID
      const fakeId = `dummy-${Date.now()}`;
      
      // Create a new program object
      const createdProgram: Program = {
        id: fakeId,
        title: newProgram.title,
        description: newProgram.description,
        status: newProgram.status,
        departments: newProgram.departments,
        thumbnail_url: newProgram.thumbnail_url || 'https://via.placeholder.com/300x200?text=Program+Thumbnail',
        courses_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Program object created:', createdProgram);
      
      // Add the new program to the state
      setPrograms([createdProgram, ...programs]);
      
      // Reset the form and close modal
      resetForm();
      
      // Show success message
      alert('Program created successfully!');
    } catch (error: any) {
      console.error('Error creating program:', error);
      alert(`Failed to create program: ${error?.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
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
      status: 'draft',
      departments: [],
      thumbnail_url: ''
    });
    setThumbnailFile(null);
    setShowProgramForm(false);
    console.log('Form reset successfully');
  }
  
  // Add this function to render the admin tools
  const renderAdminTools = () => {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-[#AE9773]" />
            Administrator Tools
          </h2>
          <button
            onClick={() => setShowAdminTools(!showAdminTools)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdminTools ? 'Hide Tools' : 'Show Tools'}
          </button>
        </div>
        
        {showAdminTools && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-3 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Content Integrity Tools</p>
                <p className="text-sm">
                  These tools help identify and fix issues with content relationships. Use them to ensure the Training Portal displays content correctly.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-white">
              <ContentIntegrityCheck />
            </div>
          </div>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Content Structure</h1>
        <button
          onClick={() => setShowProgramForm(true)}
          className="flex items-center px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Program
        </button>
      </div>
      
      {/* Add the admin tools section */}
      {renderAdminTools()}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Program Creation Form */}
      {showProgramForm && (
        <ProgramForm 
          onCancel={() => setShowProgramForm(false)}
          onSuccess={(newProgram: Program) => {
            // Add the new program to the state
            setPrograms([newProgram, ...programs]);
            // Close the form
            setShowProgramForm(false);
          }}
        />
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
                          const dept = departments.find(d => d === deptId);
                          return (
                            <span 
                              key={deptId} 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {dept ? dept : deptId}
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