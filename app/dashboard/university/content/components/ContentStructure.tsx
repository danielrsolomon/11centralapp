'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { devInsert } from '@/lib/supabase-dev'
import { DEVELOPMENT_MODE } from '@/lib/development-mode'

// Initialize the Supabase client
const supabase = createClient()

import {
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash,
  Eye,
  BookOpen,
  Layers,
  File,
  Archive
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import ModuleForm from '../structure/components/ModuleForm'

// Types
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
  created_at: string
  updated_at: string
}

type Department = {
  id: string
  name: string
}

export default function ContentStructureComponent({ 
  showCreateProgramOnLoad = false,
  onArchiveProgram = (program: Program) => {}
}: { 
  showCreateProgramOnLoad?: boolean,
  onArchiveProgram?: (program: Program) => void
}) {
  // Force a fresh instance when component mounts
  const [instanceKey] = useState(() => Date.now().toString());
  
  // Global click tracker for debugging
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      console.log('Global click detected:', {
        target: e.target,
        currentTarget: e.currentTarget,
        x: e.clientX,
        y: e.clientY,
        element: (e.target as HTMLElement).outerHTML.substring(0, 100) + '...'
      });
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>([])
  const [courses, setCourses] = useState<Record<string, Course[]>>({})
  const [expandedCourses, setExpandedCourses] = useState<string[]>([])
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [expandedLessons, setExpandedLessons] = useState<string[]>([])
  const [modules, setModules] = useState<Record<string, Module[]>>({})
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  
  // State for forms
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    departments: [] as string[],
    status: 'draft'
  })
  
  // State for new course form
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    overview: '',
    status: 'draft'
  })
  
  // State for edit mode
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [programToMove, setProgramToMove] = useState<Program | null>(null)
  const [showConfirmArchive, setShowConfirmArchive] = useState(false)
  const [programToArchive, setProgramToArchive] = useState<Program | null>(null)
  const [viewProgramDetails, setViewProgramDetails] = useState<Program | null>(null)
  
  const [departments, setDepartments] = useState<Department[]>([])
  
  // Define fetchCoursesForProgram outside the useEffect
  const fetchCoursesForProgram = async (programId: string) => {
    try {
      console.log(`🔍 DEBUG: fetchCoursesForProgram called for programId: ${programId}`);
      
      // Compare with the IDs in your database to help identify mismatches
      console.log(`🔍 DEBUG: Compare with your Supabase program_id: f6d33a20-df8a-4737-a81d-bd7f405b7c44`);
      
      console.log(`=== FETCH COURSES START: Fetching courses for program ${programId} ===`);
      
      // Standard query attempt
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lessons:lessons(count)
        `)
        .eq('program_id', programId)
        .order('sequence_order');
      
      console.log(`Raw courses data received:`, data);
      console.log(`Error from course query:`, error);
      
      // If we get an RLS error, try the development bypass
      if (error && error.message && error.message.includes('row-level security policy') && DEVELOPMENT_MODE) {
        console.log(`⚠️ RLS blocked course fetch, attempting direct fetch using dev API...`);
        
        // Make a fetch request to your /api/dev-actions endpoint
        try {
          const response = await fetch('/api/dev-actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'select',
              table: 'courses',
              filter: { program_id: programId }
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const result = await response.json();
          if (result.error) {
            throw result.error;
          }
          
          console.log('✅ Development bypass fetch successful:', result);
          
          // Process the data to include lessons count
          const coursesData = result.data || [];
          const coursesWithLessonCount = coursesData.map((course: any) => ({
            ...course,
            lessons_count: 0 // We don't have lesson counts in this simplified query
          }));
          
          // Update state
          setCourses(prev => ({
            ...prev,
            [programId]: coursesWithLessonCount
          }));
          
          return; // Exit the function after successful bypass
        } catch (bypassError) {
          console.error('💥 Development bypass fetch failed:', bypassError);
        }
      }
      
      if (error) {
        console.error(`⚠️ Error fetching courses for program ${programId}:`, error);
        throw error;
      }
      
      // Include lessons_count in each course
      const coursesWithLessonCount = data?.map(course => ({
        ...course,
        lessons_count: course.lessons[0]?.count || 0
      })) || [];
      
      console.log(`After mapping, coursesWithLessonCount length: ${coursesWithLessonCount.length}`);
      console.log(`Mapped courses data:`, coursesWithLessonCount);
      
      if (coursesWithLessonCount.length > 0) {
        console.log(`✅ Successfully fetched ${coursesWithLessonCount.length} courses for program ${programId}`);
        console.log(`Before setCourses, current courses state:`, courses);
        
        setCourses(prev => {
          const newState = {
            ...prev,
            [programId]: coursesWithLessonCount
          };
          console.log(`New courses state after update:`, newState);
          return newState;
        });
        
        // Pre-fetch lessons for courses that have them
        for (const course of coursesWithLessonCount) {
          if (course.lessons_count > 0) {
            // Use setTimeout to prevent overwhelming the database with requests
            setTimeout(() => {
              const { id: courseId } = course;
              if (!lessons[courseId]) {
                console.log(`Pre-fetching lessons for course ${courseId}`);
                fetchLessonsForCourse(courseId);
              }
            }, 100);
          }
        }
      } else {
        console.log(`ℹ️ No courses found for program ${programId}`);
        setCourses(prev => ({
          ...prev,
          [programId]: []
        }));
      }
    } catch (error) {
      console.error(`💥 Error in fetchCoursesForProgram for ${programId}:`, error);
    }
  };
  
  // Define fetchPrograms function
  const fetchPrograms = async () => {
    setLoading(true);
    setError(null);
      
    try {
      console.log('🔍 DEBUG: fetchPrograms called - attempting to fetch all programs');
      
      // Check if the programs table exists first
      const { error: tableCheckError } = await supabase
        .from('programs')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.warn('Programs table may not exist yet. Using dummy data instead.', tableCheckError);
        throw new Error('Programs table not ready');
      }
      
      console.log('Fetching fresh program data from database...');
      
      // First, fetch the programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select(`
          id,
          title,
          description,
          status,
          thumbnail_url,
          departments,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (programsError) {
        throw programsError;
      }
      
      console.log('🔍 DEBUG: Fetched programs from database:', programsData);
      
      // Now make a separate query to get accurate course counts
      const { data: courseCountsData, error: courseCountsError } = await supabase
        .from('courses')
        .select('program_id, count')
        .order('program_id');
        
      if (courseCountsError) {
        console.warn('Error fetching course counts:', courseCountsError);
      }
      
      // Create a map of program_id to course counts
      const courseCounts: {[key: string]: number} = {};
      
      if (courseCountsData) {
        courseCountsData.forEach(row => {
          // Aggregate counts by program_id
          if (courseCounts[row.program_id]) {
            courseCounts[row.program_id]++;
          } else {
            courseCounts[row.program_id] = 1;
          }
        });
      }
      
      console.log('Course counts from direct query:', courseCounts);
      
      // Process the data to include course count
      const programsWithCourseCount = programsData.map(program => ({
        ...program,
        courses_count: courseCounts[program.id] || 0
      }));
      
      console.log('Fetched programs with course counts:', programsWithCourseCount);
      
      // If we have real data, use it
      if (programsWithCourseCount && programsWithCourseCount.length > 0) {
        setPrograms(programsWithCourseCount);
        
        // Always pre-fetch courses for all programs to ensure they're loaded
        console.log('Pre-fetching courses for all programs...');
        for (const program of programsWithCourseCount) {
          fetchCoursesForProgram(program.id);
        }
      } else {
        // Otherwise use dummy data
        console.log('No programs found in database. Using dummy data.');
        useDummyPrograms();
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      setError('Development mode: Using dummy data');
      
      // Always use dummy data for development
      useDummyPrograms();
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to set dummy programs data
  function useDummyPrograms() {
    // Use some placeholder data for development
    const dummyPrograms: Program[] = [
      {
        id: 'dummy-1',
        title: 'Development Mode - Sample Program 1',
        description: 'This is placeholder data for development.',
        status: 'draft',
        courses_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    setPrograms(dummyPrograms);
  }
  
  // Define fetchDepartments function
  const fetchDepartments = async () => {
    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
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
      console.error('Error fetching departments:', error);
      // Keep using the default departments array
      setDepartments([
        { id: 'all', name: 'All' },
        { id: 'management', name: 'Management' },
        { id: 'service', name: 'Service' },
        { id: 'security', name: 'Security' },
        { id: 'administration', name: 'Administration' }
      ]);
    }
  };
  
  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
    
    // Set initial state based on props
    if (showCreateProgramOnLoad) {
      setShowProgramForm(true);
    }
  }, [showCreateProgramOnLoad]);
  
  const toggleProgram = async (programId: string) => {
    if (expandedPrograms.includes(programId)) {
      setExpandedPrograms(expandedPrograms.filter(id => id !== programId));
    } else {
      setExpandedPrograms([...expandedPrograms, programId]);
      
      // Fetch courses if they haven't been loaded yet
      if (!courses[programId]) {
        try {
          setLoading(true);
          
          // Check if the courses table exists first (for development)
          const { error: tableCheckError } = await supabase
            .from('courses')
            .select('id')
            .limit(1);
            
          if (tableCheckError) {
            console.warn('Courses table may not exist yet. Using empty data.', tableCheckError);
            throw new Error('Courses table not ready');
          }
          
          // If table exists, fetch the actual data
          const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('program_id', programId)
            .order('sequence_order');
            
          if (error) throw error;
          
          setCourses(prev => ({
            ...prev,
            [programId]: data || []
          }));
          
          // If we got no data, use empty array
          if (!data || data.length === 0) {
            console.info('No courses found for this program.');
            setCourses(prev => ({
              ...prev,
              [programId]: []
            }));
          }
        } catch (error) {
          console.error('Error fetching courses:', error);
          // Use empty array instead of dummy data
          setCourses(prev => ({
            ...prev,
            [programId]: []
          }));
        } finally {
          setLoading(false);
        }
      }
    }
  };
  
  const toggleCourse = async (courseId: string) => {
    if (expandedCourses.includes(courseId)) {
      setExpandedCourses(expandedCourses.filter(id => id !== courseId));
    } else {
      setExpandedCourses([...expandedCourses, courseId]);
      
      // Always fetch lessons when expanding a course to ensure we have fresh data
      try {
        setLoading(true);
        
        // Check if the lessons table exists first
        const { error: tableCheckError } = await supabase
          .from('lessons')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.warn('Lessons table may not exist yet. Using empty data.', tableCheckError);
          throw new Error('Lessons table not ready');
        }
        
        console.log(`Fetching fresh lesson data for course ${courseId}...`);
        
        const { data, error } = await supabase
          .from('lessons')
          .select(`
            id,
            course_id,
            title,
            description,
            instructors,
            sequence_order,
            status,
            created_at,
            updated_at,
            modules:modules(count)
          `)
          .eq('course_id', courseId)
          .order('sequence_order');
          
        if (error) throw error;
        
        // Process the data to include module count
        const lessonsWithCount = data.map(lesson => ({
          ...lesson,
          modules_count: lesson.modules[0]?.count || 0
        }));
        
        console.log(`Fetched ${lessonsWithCount.length} lessons with module counts for course ${courseId}`);
        
        setLessons(prev => ({
          ...prev,
          [courseId]: lessonsWithCount || []
        }));
        
        // Always pre-fetch modules for all lessons to ensure they're loaded
        console.log(`Pre-fetching modules for all lessons in course ${courseId}...`);
        for (const lesson of lessonsWithCount) {
          fetchModulesForLesson(lesson.id);
        }
        
        // If we got no data, use empty array
        if (!data || data.length === 0) {
          console.info('No lessons found for this course.');
          setLessons(prev => ({
            ...prev,
            [courseId]: []
          }));
        }
      } catch (error) {
        console.error('Error fetching lessons:', error);
        // Use empty array instead of dummy data
        setLessons(prev => ({
          ...prev,
          [courseId]: []
        }));
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Helper function to fetch modules for a single lesson
  async function fetchModulesForLesson(lessonId: string) {
    try {
      // Fetch modules from Supabase
      const { data, error } = await supabase
        .from('modules')
        .select(`
          id,
          lesson_id,
          title,
          description,
          content,
          sequence_order,
          status,
          video_url,
          video_required,
          has_quiz,
          quiz_type,
          created_at,
          updated_at
        `)
        .eq('lesson_id', lessonId)
        .order('sequence_order');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log(`Pre-fetched ${data.length} modules for lesson ${lessonId}`);
        setModules(prev => ({
          ...prev,
          [lessonId]: data
        }));
      }
    } catch (error) {
      console.error(`Error pre-fetching modules for lesson ${lessonId}:`, error);
    }
  }
  
  const toggleLesson = async (lessonId: string) => {
    if (expandedLessons.includes(lessonId)) {
      setExpandedLessons(expandedLessons.filter(id => id !== lessonId));
    } else {
      setExpandedLessons([...expandedLessons, lessonId]);
      
      // Always fetch fresh module data
      console.log(`Fetching fresh module data for lesson ${lessonId}...`);
      await fetchModulesForLesson(lessonId);
    }
  };
  
  const handleShowCreateProgram = () => {
    setShowProgramForm(true);
  };
  
  const handleShowCreateCourse = (programId: string) => {
    console.log('handleShowCreateCourse called with programId:', programId);
    
    // Make sure we have a valid programId
    if (!programId) {
      console.error('No program ID provided for course creation');
      return;
    }
    
    // Reset the course form
    setNewCourse({
      title: '',
      description: '',
      overview: '',
      status: 'draft'
    });
    
    // Set up the form
    setSelectedProgramId(programId);
    setShowCourseForm(true);
    
    console.log('Course form should now be visible:', { showCourseForm: true, programId });
  };
  
  const handleShowCreateLesson = (courseId: string) => {
    setSelectedCourseId(courseId);
    setShowLessonForm(true);
  };
  
  const handleShowCreateModule = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setShowModuleForm(true);
  };
  
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
  };
  
  // Placeholders for form handlers - these would be implemented fully in production
  const handleCourseSuccess = () => {
    setShowCourseForm(false);
    // Refetch courses for the selected program after adding a new course
    if (selectedProgramId) {
      console.log(`Refetching courses for program ${selectedProgramId} after course operation`);
      fetchCoursesForProgram(selectedProgramId);
      
      // Also update the program's course count by refetching all programs
      fetchPrograms();
    }
  };
  
  const handleLessonSuccess = () => {
    setShowLessonForm(false);
  };
  
  const handleModuleSuccess = () => {
    setShowModuleForm(false);
  };
  
  const handleViewProgram = (program: Program) => {
    setViewProgramDetails(program);
  };
  
  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setNewProgram({
      title: program.title,
      description: program.description,
      thumbnail_url: program.thumbnail_url || '',
      departments: program.departments || [],
      status: program.status
    });
    setShowProgramForm(true);
  };
  
  const handleMoveProgram = (program: Program) => {
    setProgramToMove(program);
    setShowMoveDialog(true);
  };
  
  const handleArchiveProgram = (program: Program) => {
    setProgramToArchive(program);
    setShowConfirmArchive(true);
  };
  
  const confirmArchiveProgram = async () => {
    if (!programToArchive) return;
    
    setSubmitting(true);
    try {
      // Update the program status to 'archived' in Supabase
      const { error } = await supabase
        .from('programs')
        .update({ status: 'archived' })
        .eq('id', programToArchive.id);
        
      if (error) throw error;
      
      // Update local state
      setPrograms(programs.filter(p => p.id !== programToArchive.id));
      
      // Notify parent component
      onArchiveProgram(programToArchive);
      
      // Reset state
      setProgramToArchive(null);
      setShowConfirmArchive(false);
    } catch (error) {
      console.error('Error archiving program:', error);
      setError('Failed to archive program. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCancelArchive = () => {
    setProgramToArchive(null);
    setShowConfirmArchive(false);
  };
  
  const executeMoveProgram = async (newSequence: number) => {
    if (!programToMove) return;
    
    setSubmitting(true);
    try {
      // In a real application, you would update the sequence_order in Supabase
      console.log(`Moving program ${programToMove.id} to position ${newSequence}`);
      
      // For demonstration, we'll just simulate reordering the programs array
      const updatedPrograms = [...programs];
      const currentIndex = updatedPrograms.findIndex(p => p.id === programToMove.id);
      const [movedProgram] = updatedPrograms.splice(currentIndex, 1);
      
      // Insert at new position, ensuring it's within bounds
      const insertIndex = Math.max(0, Math.min(newSequence, updatedPrograms.length));
      updatedPrograms.splice(insertIndex, 0, movedProgram);
      
      setPrograms(updatedPrograms);
      
      // Reset state
      setProgramToMove(null);
      setShowMoveDialog(false);
    } catch (error) {
      console.error('Error moving program:', error);
      setError('Failed to move program. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCancelMove = () => {
    setProgramToMove(null);
    setShowMoveDialog(false);
  };
  
  // Function to render a module item
  const renderModule = (module: Module) => {
    return (
      <div key={module.id} className="flex items-center py-2 pl-2 hover:bg-gray-50">
        <div className="flex items-center flex-1">
          <div className="w-5 h-5 bg-green-100 rounded-md flex items-center justify-center mr-2">
            <File className="h-3 w-3 text-green-600" />
          </div>
          <div>
            <h6 className="font-medium text-gray-700 text-xs">{module.title} <span className="text-gray-400 text-xs">(Module)</span></h6>
            <div className="flex items-center text-xs text-gray-500">
              <span>{module.has_quiz ? 'Has Quiz' : 'No Quiz'}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-1 mr-2">
          <button 
            className="p-0.5 text-blue-600 hover:text-blue-800" 
            title="View Module"
            onClick={(e) => {
              e.stopPropagation();
              handleViewModule(module);
            }}
          >
            <Eye className="h-3 w-3" />
          </button>
          <button 
            className="p-0.5 text-gray-600 hover:text-gray-800" 
            title="Edit Module"
            onClick={(e) => {
              e.stopPropagation();
              // Handle edit module
              handleEditModule(module);
            }}
          >
            <Edit className="h-3 w-3" />
          </button>
          <button 
            className="p-0.5 text-red-600 hover:text-red-800" 
            title="Delete Module"
            onClick={(e) => {
              e.stopPropagation();
              // Handle delete module
              handleDeleteModule(module);
            }}
          >
            <Trash className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // Function to render a lesson item with its modules
  const renderLesson = (lesson: Lesson, courseId: string) => {
    const isExpanded = expandedLessons.includes(lesson.id);
    
    return (
      <div key={lesson.id} className="border border-gray-200 rounded-md overflow-hidden mb-2">
        <div 
          className="flex items-center p-2 bg-white cursor-pointer hover:bg-gray-50"
          onClick={() => toggleLesson(lesson.id)}
        >
          <span className="mr-2">
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 text-gray-500" /> : 
              <ChevronRight className="h-4 w-4 text-gray-500" />
            }
          </span>
          <div className="flex items-center flex-1">
            <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-2">
              <Layers className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div>
              <h5 className="font-medium text-gray-700 text-xs">{lesson.title} <span className="text-gray-400 text-xs">(Lesson)</span></h5>
              <div className="flex items-center text-xs text-gray-500">
                <span>
                  {lesson.modules_count || 0} Modules
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            <button 
              className="p-1 text-gray-600 hover:text-gray-800" 
              title="Edit Lesson"
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit lesson
              }}
            >
              <Edit className="h-3 w-3" />
            </button>
            <button 
              className="p-1 text-red-600 hover:text-red-800" 
              title="Delete Lesson"
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete lesson
              }}
            >
              <Trash className="h-3 w-3" />
            </button>
            <button 
              className="p-1 text-[#AE9773] hover:text-[#8E795D]"
              onClick={(e) => {
                e.stopPropagation();
                handleShowCreateModule(lesson.id);
              }}
              title="Add Module"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="pl-8 pr-3 py-2 border-t border-gray-100">
            {modules[lesson.id]?.length > 0 ? (
              <div className="space-y-1">
                {modules[lesson.id].map(module => renderModule(module))}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-gray-500 text-xs">No modules added yet</p>
                <button
                  onClick={() => handleShowCreateModule(lesson.id)}
                  className="mt-1 text-xs text-[#AE9773] hover:text-[#8E795D] flex items-center justify-center mx-auto"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Module
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Function to render a course item with its lessons
  const renderCourse = (course: Course, programId: string) => {
    const isExpanded = expandedCourses.includes(course.id);
    
    return (
      <div key={course.id} className="border border-gray-200 rounded-md overflow-hidden mb-3">
        <div 
          className="flex items-center p-2 bg-white cursor-pointer hover:bg-gray-50"
          onClick={() => toggleCourse(course.id)}
        >
          <span className="mr-2">
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 text-gray-500" /> : 
              <ChevronRight className="h-4 w-4 text-gray-500" />
            }
          </span>
          <div className="flex items-center flex-1">
            <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center mr-3">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-700 text-sm">{course.title} <span className="text-gray-400 text-xs">(Course)</span></h4>
              <div className="flex items-center text-xs text-gray-500">
                <span>
                  {course.lessons_count || 0} Lessons
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            <button 
              className="p-1 text-blue-600 hover:text-blue-800" 
              title="View Course"
              onClick={(e) => {
                e.stopPropagation();
                // Handle view course
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button 
              className="p-1 text-gray-600 hover:text-gray-800" 
              title="Edit Course"
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit course
              }}
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button 
              className="p-1 text-red-600 hover:text-red-800" 
              title="Delete Course"
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete course
              }}
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
            <button 
              className="p-1 text-[#AE9773] hover:text-[#8E795D]"
              onClick={(e) => {
                e.stopPropagation();
                handleShowCreateLesson(course.id);
              }}
              title="Add Lesson"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="pl-9 pr-3 py-2 border-t border-gray-100">
            {lessons[course.id]?.length > 0 ? (
              <div className="space-y-2">
                {lessons[course.id].map(lesson => renderLesson(lesson, course.id))}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-gray-500 text-xs">No lessons added yet</p>
                <button
                  onClick={() => handleShowCreateLesson(course.id)}
                  className="mt-1 text-xs text-[#AE9773] hover:text-[#8E795D] flex items-center justify-center mx-auto"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Lesson
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render the course creation form directly in the expanded program section
  const renderCourseForm = (programId: string) => {
    if (!selectedProgramId || selectedProgramId !== programId || !showCourseForm) {
      return null;
    }

    return (
      <div className="mt-4 border border-[#AE9773] rounded-md p-4 bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Create New Course</h3>
        <form onSubmit={handleCreateCourse}>
          <div className="mb-4">
            <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title*
            </label>
            <input
              type="text"
              id="courseTitle"
              name="title"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773] bg-white text-gray-900"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="courseDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea
              id="courseDescription"
              name="description"
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773] bg-white text-gray-900"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label htmlFor="courseOverview" className="block text-sm font-medium text-gray-700 mb-1">
              Overview (Optional)
            </label>
            <textarea
              id="courseOverview"
              name="overview"
              value={newCourse.overview}
              onChange={(e) => setNewCourse({...newCourse, overview: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773] bg-white text-gray-900"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label htmlFor="courseStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Status*
            </label>
            <select
              id="courseStatus"
              name="status"
              value={newCourse.status}
              onChange={(e) => setNewCourse({...newCourse, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773] bg-white text-gray-900"
              required
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Adding this course to: <span className="font-medium text-gray-700">{programs.find(p => p.id === programId)?.title}</span>
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowCourseForm(false);
                setNewCourse({
                  title: '',
                  description: '',
                  overview: '',
                  status: 'draft'
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] focus:outline-none disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Modify the renderProgram function to include debugging
  const renderProgram = (program: Program) => {
    console.log(`🔍 DEBUG: Rendering program: ${program.title} with ID: ${program.id}`);
    console.log(`🔍 DEBUG: This program has ${program.courses_count} courses according to the state`);
    console.log(`🔍 DEBUG: Expanded state for this program: ${expandedPrograms.includes(program.id)}`);
    
    const hasChildren = courses[program.id] && courses[program.id].length > 0;
    
    const isExpanded = expandedPrograms.includes(program.id);
    const showCourseFormForThis = isExpanded && showCourseForm && selectedProgramId === program.id;
    
    return (
      <div key={program.id} className="border border-gray-200 rounded-md overflow-hidden mb-4">
        <div className="flex items-center p-3 bg-gray-50">
          {/* Program header with collapsible control */}
          <a 
            href="#"
            className="mr-2"
            onClick={(e) => {
              e.preventDefault();
              console.log('Toggle program clicked:', program.id);
              toggleProgram(program.id);
            }}
          >
            {isExpanded ? 
              <span>▼</span> : 
              <span>▶</span>
            }
          </a>
          
          {/* Program info */}
          <div className="flex items-center flex-1" onClick={() => toggleProgram(program.id)}>
            {program.thumbnail_url ? (
              <Image
                src={program.thumbnail_url}
                alt={program.title}
                width={36}
                height={36}
                className="rounded-md mr-3 object-cover"
              />
            ) : (
              <div className="w-9 h-9 bg-[#AE9773] rounded-md flex items-center justify-center mr-3">
                <Folder className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-800">{program.title} <span className="text-gray-400 text-xs">(Program)</span></h3>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-3">{program.courses_count} Courses</span>
                {getStatusBadge(program.status)}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Program action buttons */}
            <button 
              className="p-1 text-blue-600 hover:text-blue-800 focus:outline-none" 
              title="View Program"
              onClick={() => handleViewProgram(program)}
            >
              <Eye className="h-4 w-4" />
            </button>
            
            <button 
              className="p-1 text-gray-600 hover:text-gray-800 focus:outline-none" 
              title="Edit Program"
              onClick={() => handleEditProgram(program)}
            >
              <Edit className="h-4 w-4" />
            </button>
            
            <button 
              className="p-1 text-amber-600 hover:text-amber-800 focus:outline-none" 
              title="Archive Program"
              onClick={() => handleArchiveProgram(program)}
            >
              <Archive className="h-4 w-4" />
            </button>

            <button 
              className="p-1 text-cyan-600 hover:text-cyan-800 focus:outline-none" 
              title="Refresh Courses"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Manual refresh for program:', program.id);
                fetchCoursesForProgram(program.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Direct "Add Course" button that toggles the form */}
            <a 
              href="#"
              id={`addCourseButton-${program.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // If not expanded, expand the program first
                if (!isExpanded) {
                  toggleProgram(program.id);
                }
                
                // Show the course form for this program
                console.log('Add Course link clicked for program:', program.id);
                setSelectedProgramId(program.id);
                setShowCourseForm(true);
                
                // Make sure the program is expanded to see the form
                if (!expandedPrograms.includes(program.id)) {
                  setExpandedPrograms(prev => [...prev, program.id]);
                }
              }}
              className="ml-2 bg-[#AE9773] hover:bg-[#8E795D] text-white px-3 py-1 rounded-md inline-flex items-center"
            >
              <span className="mr-1">+</span>
              <span className="text-sm font-medium">Add Course</span>
            </a>
          </div>
        </div>
        
        {/* Expanded content */}
        {isExpanded && (
          <div className="pl-10 pr-3 py-2 border-t border-gray-200">
            {/* Debug info for development */}
            <div className="bg-yellow-50 p-2 text-xs mb-2 border border-yellow-200 rounded">
              <div><strong>Debug Info:</strong></div>
              <div>Program ID: {program.id}</div>
              <div>Program courses_count: {program.courses_count}</div>
              <div>Courses in state: {courses[program.id] ? courses[program.id].length : 'None'}</div>
              {courses[program.id] && <div>First course title: {courses[program.id][0]?.title || 'N/A'}</div>}
            </div>
            
            {/* Show course form directly when button is clicked */}
            {showCourseFormForThis && renderCourseForm(program.id)}
            
            {/* Check for courses in state first, then render them */}
            {courses[program.id] && courses[program.id].length > 0 ? (
              <div className="space-y-3">
                {courses[program.id].map(course => {
                  console.log(`Rendering course: ${course.title} (${course.id})`);
                  return renderCourse(course, program.id);
                })}
              </div>
            ) : (
              !showCourseFormForThis && (
                <div className="text-center py-5">
                  <p className="text-gray-500 mb-3">No courses added yet</p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Add Your First Course link clicked for program:', program.id);
                      setSelectedProgramId(program.id);
                      setShowCourseForm(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-[#AE9773] text-white rounded hover:bg-[#8E795D]"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Your First Course
                  </a>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  // Function to handle module view
  const [viewingModule, setViewingModule] = useState<Module | null>(null);
  
  const handleViewModule = (module: Module) => {
    setViewingModule(module);
  };
  
  const handleEditModule = (module: Module) => {
    // Set module for editing
    setSelectedLessonId(module.lesson_id);
    // TODO: Implement module editing
    console.log("Edit module:", module);
  };
  
  const handleDeleteModule = (module: Module) => {
    // TODO: Implement module deletion with confirmation
    console.log("Delete module:", module);
    
    if (confirm(`Are you sure you want to delete the module "${module.title}"?`)) {
      deleteModule(module.id);
    }
  };
  
  const deleteModule = async (moduleId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);
        
      if (error) throw error;
      
      // Update local state
      setModules(prev => {
        const updated = { ...prev };
        
        Object.keys(updated).forEach(lessonId => {
          updated[lessonId] = updated[lessonId].filter(m => m.id !== moduleId);
        });
        
        return updated;
      });
      
    } catch (error) {
      console.error("Error deleting module:", error);
      setError("Failed to delete module. Please try again.");
    }
  };

  // Program Creation Form
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    console.log('🚀 Creating new program with data:', newProgram);
    
    try {
      // Get current user (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user && !DEVELOPMENT_MODE) {
        alert("You must be logged in to create content");
        setSubmitting(false);
        return;
      }
      
      // Prepare program data - using UUID v4 for consistent ID generation
      const programData = {
        title: newProgram.title,
        description: newProgram.description,
        thumbnail_url: newProgram.thumbnail_url || null,
        departments: newProgram.departments.length > 0 ? newProgram.departments : null,
        status: newProgram.status,
        created_by: user?.id || '00000000-0000-0000-0000-000000000000', // Use a default ID if no user in dev mode
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 Program data to insert:', programData);
      
      // Try normal insert first (might fail due to RLS)
      try {
        console.log("Attempting standard program insert...");
        const { data, error } = await supabase
          .from('programs')
          .insert(programData)
          .select();
          
        if (error) {
          // If we get an RLS error, try the development bypass
          if (error.message && error.message.includes('row-level security policy')) {
            console.warn("RLS policy blocked program insert, trying development bypass...");
            
            if (DEVELOPMENT_MODE) {
              console.log("Using development workaround...");
              
              // Use our development helper to bypass RLS
              const { data: devData, error: devError } = await devInsert('programs', programData);
              
              if (devError) {
                throw devError;
              }
              
              // If we get here, the development insert was successful
              if (devData) {
                console.log("Development program insert successful:", devData);
                
                // Add the new program to the programs state
                const newProgramData = devData[0] as Program;
                
                console.log("🆕 Created program with ID:", newProgramData.id);
                console.log("Please use this ID to verify against any created courses later");
                
                setPrograms(prev => [newProgramData, ...prev]);
                
                // Reset form and close it
                resetForm();
                setShowProgramForm(false);
                alert("Program created successfully!");
              }
            } else {
              throw new Error("Unable to create program due to RLS policy. Development mode is not enabled.");
            }
          } else {
            // This is an unexpected error - not just RLS
            throw error;
          }
        } else {
          // If we get here, the standard insert was successful
          if (data) {
            console.log("Standard program insert successful:", data);
            
            // Add the new program to the programs state
            const newProgramData = data[0] as Program;
            
            console.log("🆕 Created program with ID:", newProgramData.id);
            console.log("Please use this ID to verify against any created courses later");
            
            setPrograms(prev => [newProgramData, ...prev]);
            
            // Reset form and close it
            resetForm();
            setShowProgramForm(false);
            alert("Program created successfully!");
          }
        }
      } catch (error) {
        console.error("Program creation error:", error);
        alert(`Error creating program: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("Program creation error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Check if we're editing a program or course form
    if (showProgramForm) {
      setNewProgram({
        ...newProgram,
        [name]: value
      });
    } else if (showCourseForm) {
      setNewCourse({
        ...newCourse,
        [name]: value
      });
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProgram(prev => ({ ...prev, thumbnail_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewProgram(prev => ({
      ...prev,
      departments: prev.departments.includes(value) ? prev.departments.filter(d => d !== value) : [...prev.departments, value]
    }));
  };

  const resetForm = () => {
    setNewProgram({
      title: '',
      description: '',
      thumbnail_url: '',
      departments: [],
      status: 'draft'
    });
    setShowProgramForm(false);
  };

  // Handle course creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log("🚀 Creating new course:", newCourse, "for program:", selectedProgramId);
      
      if (!selectedProgramId) {
        alert("No program selected for this course");
        setSubmitting(false);
        return;
      }
      
      // Get current sequence number for this program's courses
      const existingCourses = courses[selectedProgramId] || [];
      const sequenceOrder = existingCourses.length + 1;
      
      // Get current user (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user && !DEVELOPMENT_MODE) {
        alert("You must be logged in to create content");
        setSubmitting(false);
        return;
      }
      
      // Prepare course data
      const courseData = {
        program_id: selectedProgramId,
        title: newCourse.title,
        description: newCourse.description,
        overview: newCourse.overview,
        sequence_order: sequenceOrder,
        status: newCourse.status,
        created_by: user?.id || '00000000-0000-0000-0000-000000000000', // Use a default ID if no user in dev mode
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("📝 Course data to insert:", courseData);
      console.log("✓ Linking to program with ID:", selectedProgramId);
      
      // Try normal insert first (might fail due to RLS)
      try {
        console.log("Attempting standard course insert...");
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select();
          
        if (error) {
          // If we get an RLS error, try the development bypass
          if (error.message && error.message.includes('row-level security policy')) {
            console.warn("RLS policy blocked course insert, trying development bypass...");
            
            if (DEVELOPMENT_MODE) {
              console.log("Using development workaround...");
              
              // Use our development helper to bypass RLS
              const { data: devData, error: devError } = await devInsert('courses', courseData);
              
              if (devError) {
                throw devError;
              }
              
              // If we get here, the development insert was successful
              if (devData) {
                console.log("Development course insert successful:", devData);
                
                // Add the new course to the courses state
                const newCourseData = devData[0] as Course;
                console.log("🆕 Created course with ID:", newCourseData.id);
                console.log("✓ Linked to program with ID:", newCourseData.program_id);
                
                // Update the courses state
                setCourses(prev => ({
                  ...prev,
                  [selectedProgramId]: [...(prev[selectedProgramId] || []), newCourseData]
                }));
                
                // Update the program's course count
                setPrograms(prev => 
                  prev.map(p => 
                    p.id === selectedProgramId 
                      ? { ...p, courses_count: p.courses_count + 1 } 
                      : p
                  )
                );
                
                // Reset form and close it
                setNewCourse({
                  title: '',
                  description: '',
                  overview: '',
                  status: 'draft'
                });
                
                setShowCourseForm(false);
                alert("Course created successfully!");
              }
            } else {
              throw new Error("Unable to create course due to RLS policy. Development mode is not enabled.");
            }
          } else {
            // This is an unexpected error - not just RLS
            throw error;
          }
        } else {
          // If we get here, the standard insert was successful
          if (data) {
            console.log("Standard course insert successful:", data);
            
            // Add the new course to the courses state
            const newCourseData = data[0] as Course;
            console.log("🆕 Created course with ID:", newCourseData.id);
            console.log("✓ Linked to program with ID:", newCourseData.program_id);
            
            // Update the courses state
            setCourses(prev => ({
              ...prev,
              [selectedProgramId]: [...(prev[selectedProgramId] || []), newCourseData]
            }));
            
            // Update the program's course count
            setPrograms(prev => 
              prev.map(p => 
                p.id === selectedProgramId 
                  ? { ...p, courses_count: p.courses_count + 1 } 
                  : p
              )
            );
            
            // Reset form and close it
            setNewCourse({
              title: '',
              description: '',
              overview: '',
              status: 'draft'
            });
            
            setShowCourseForm(false);
            alert("Course created successfully!");
          }
        }
      } catch (error) {
        console.error("Course creation error:", error);
        alert(`Error creating course: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("Course creation error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Render the program creation form directly
  const renderProgramForm = () => {
    if (!showProgramForm) {
      return null;
    }

    return (
      <div className="mb-6 border border-[#AE9773] rounded-md p-4 bg-amber-50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Create New Program</h3>
          <button
            onClick={() => {
              console.log("Closing program form");
              setShowProgramForm(false);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleCreateProgram}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Program Title*
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={newProgram.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea
              id="description"
              name="description"
              value={newProgram.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Thumbnail
            </label>
            <div className="flex items-center space-x-4">
              {newProgram.thumbnail_url && (
                <div className="h-20 w-20 bg-gray-100 rounded-md overflow-hidden">
                  <Image 
                    src={newProgram.thumbnail_url} 
                    width={80} 
                    height={80} 
                    alt="Thumbnail preview" 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="thumbnail"
                  name="thumbnail"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <label
                  htmlFor="thumbnail"
                  className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 inline-block"
                >
                  Choose Image
                </label>
                <p className="text-xs text-gray-500 mt-1">Optional. Recommended size: 300x200px</p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Access
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {departments.map(department => (
                <div key={department.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`dept-${department.id}`}
                    name={department.id}
                    checked={newProgram.departments.includes(department.id)}
                    onChange={handleDepartmentChange}
                    className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773]"
                  />
                  <label htmlFor={`dept-${department.id}`} className="ml-2 text-sm text-gray-700">
                    {department.name}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select "All" for all departments or select specific departments</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status*
            </label>
            <select
              id="status"
              name="status"
              value={newProgram.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#AE9773] focus:border-[#AE9773]"
              required
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowProgramForm(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] focus:outline-none disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Program"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Define fetchLessonsForCourse based on toggleCourse logic
  const fetchLessonsForCourse = async (courseId: string) => {
    try {
      // Check if the lessons table exists first
      const { error: tableCheckError } = await supabase
        .from('lessons')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.warn('Lessons table may not exist yet. Using empty data.', tableCheckError);
        throw new Error('Lessons table not ready');
      }
      
      console.log(`Fetching fresh lesson data for course ${courseId}...`);
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          course_id,
          title,
          description,
          instructors,
          sequence_order,
          status,
          created_at,
          updated_at,
          modules:modules(count)
        `)
        .eq('course_id', courseId)
        .order('sequence_order');
        
      if (error) throw error;
      
      // Process the data to include module count
      const lessonsWithCount = data.map(lesson => ({
        ...lesson,
        modules_count: lesson.modules[0]?.count || 0
      }));
      
      console.log(`Fetched ${lessonsWithCount.length} lessons with module counts for course ${courseId}`);
      
      setLessons(prev => ({
        ...prev,
        [courseId]: lessonsWithCount || []
      }));
    } catch (error) {
      console.error(`Error fetching lessons for course ${courseId}:`, error);
    }
  };

  // Add a function to directly query courses for a specific program ID
  const debugFetchCoursesForKnownID = async () => {
    const knownProgramID = 'f6d33a20-df8a-4737-a81d-bd7f405b7c44'; // The ID from your Supabase screenshot
    console.log(`🔧 DIAGNOSTIC: Directly querying courses for known program ID: ${knownProgramID}`);
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', knownProgramID);
        
      if (error) {
        console.error('🔧 DIAGNOSTIC ERROR:', error);
      } else {
        console.log(`🔧 DIAGNOSTIC RESULT: Found ${data?.length || 0} courses:`, data);
        
        // Update the courses state with this data
        if (data && data.length > 0) {
          setCourses(prev => ({
            ...prev,
            [knownProgramID]: data
          }));
          
          // Now update programs to include this program if it doesn't exist
          if (!programs.some(p => p.id === knownProgramID)) {
            const newProgram: Program = {
              id: knownProgramID,
              title: "Recovered Program",
              description: "This program was recovered from courses in the database",
              status: "draft",
              courses_count: data.length,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setPrograms(prev => [...prev, newProgram]);
            console.log('🔧 DIAGNOSTIC: Added recovered program to state');
          } else {
            // Update the course count for the existing program
            setPrograms(prev => 
              prev.map(p => 
                p.id === knownProgramID 
                  ? { ...p, courses_count: data.length } 
                  : p
              )
            );
            console.log('🔧 DIAGNOSTIC: Updated course count for existing program');
          }
        }
      }
    } catch (e) {
      console.error('🔧 DIAGNOSTIC EXCEPTION:', e);
    }
  };

  // Add a function to clean up database tables
  const debugCleanupDatabase = async () => {
    if (!confirm('WARNING: This will delete ALL content from your database (Programs, Courses, Lessons, Modules). Are you sure?')) {
      return;
    }
    
    console.log('🧹 CLEANUP: Starting database cleanup...');
    
    try {
      console.log('🧹 CLEANUP: Using development API to bypass RLS...');
      
      // Delete modules first (child records)
      try {
        const modulesResponse = await fetch('/api/dev-actions/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'modules'
          }),
        });
        
        if (!modulesResponse.ok) {
          throw new Error(`API error: ${modulesResponse.statusText}`);
        }
        
        const modulesResult = await modulesResponse.json();
        if (modulesResult.error) {
          throw modulesResult.error;
        }
        
        console.log('✓ Modules deleted successfully via admin API');
      } catch (modulesError) {
        console.error('Error deleting modules:', modulesError);
      }
      
      // Delete lessons next
      try {
        const lessonsResponse = await fetch('/api/dev-actions/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'lessons'
          }),
        });
        
        if (!lessonsResponse.ok) {
          throw new Error(`API error: ${lessonsResponse.statusText}`);
        }
        
        const lessonsResult = await lessonsResponse.json();
        if (lessonsResult.error) {
          throw lessonsResult.error;
        }
        
        console.log('✓ Lessons deleted successfully via admin API');
      } catch (lessonsError) {
        console.error('Error deleting lessons:', lessonsError);
      }
      
      // Delete courses next
      try {
        const coursesResponse = await fetch('/api/dev-actions/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'courses'
          }),
        });
        
        if (!coursesResponse.ok) {
          throw new Error(`API error: ${coursesResponse.statusText}`);
        }
        
        const coursesResult = await coursesResponse.json();
        if (coursesResult.error) {
          throw coursesResult.error;
        }
        
        console.log('✓ Courses deleted successfully via admin API');
      } catch (coursesError) {
        console.error('Error deleting courses:', coursesError);
      }
      
      // Delete programs last
      try {
        const programsResponse = await fetch('/api/dev-actions/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'programs'
          }),
        });
        
        if (!programsResponse.ok) {
          throw new Error(`API error: ${programsResponse.statusText}`);
        }
        
        const programsResult = await programsResponse.json();
        if (programsResult.error) {
          throw programsResult.error;
        }
        
        console.log('✓ Programs deleted successfully via admin API');
      } catch (programsError) {
        console.error('Error deleting programs:', programsError);
      }
      
      // Refresh the UI
      fetchPrograms();
      
      console.log('🧹 CLEANUP: Database cleanup completed via admin API');
      alert('Database cleanup completed. All content has been removed.');
    } catch (e) {
      console.error('Error during cleanup:', e);
      alert('Error during cleanup. Check console for details.');
    }
  };
  
  // Debug function to show IDs of programs and courses
  const debugShowAllEntityIDs = async () => {
    console.log('📊 DEBUG INFO: Fetching all entity IDs for inspection');
    
    try {
      // Programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, title');
        
      if (programsError) {
        console.error('Error fetching programs:', programsError);
      } else {
        console.log('Programs:', programsData?.map(p => ({ id: p.id, title: p.title })));
      }
      
      // Courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, program_id');
        
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      } else {
        console.log('Courses:', coursesData?.map(c => ({ id: c.id, title: c.title, program_id: c.program_id })));
      }
      
      // Lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, course_id');
        
      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
      } else {
        console.log('Lessons:', lessonsData?.map(l => ({ id: l.id, title: l.title, course_id: l.course_id })));
      }
      
      // Modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, lesson_id');
        
      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
      } else {
        console.log('Modules:', modulesData?.map(m => ({ id: m.id, title: m.title, lesson_id: m.lesson_id })));
      }
      
      console.log('📊 DEBUG INFO: Entity inspection complete');
    } catch (e) {
      console.error('Error during entity inspection:', e);
    }
  };

  // Function specifically to fix the All Staff Training program issue
  const fixAllStaffTrainingProgram = async () => {
    const allStaffProgramId = 'f6d33a20-df8a-4737-a81d-bd7f405b7c44'; // From your Supabase screenshot
    
    console.log('🔧 FIX: Running diagnostic on All Staff Training program...');
    
    try {
      // Step 1: Directly fetch courses for this program ID using admin API
      const coursesResponse = await fetch('/api/dev-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'select',
          table: 'courses',
          data: { program_id: allStaffProgramId }
        }),
      });
      
      if (!coursesResponse.ok) {
        throw new Error(`API error: ${coursesResponse.statusText}`);
      }
      
      const coursesResult = await coursesResponse.json();
      
      // Log what we found
      console.log(`🔍 Found ${coursesResult.result?.data?.length || 0} courses for program ID ${allStaffProgramId}`);
      console.log('Course data:', coursesResult.result?.data);
      
      // Update the UI with these courses
      if (coursesResult.result?.data && coursesResult.result.data.length > 0) {
        // Process the data
        const coursesWithLessonCount = coursesResult.result.data.map((course: any) => ({
          ...course,
          lessons_count: 0 // Default since we don't have lesson counts in this simple query
        }));
        
        // Update the courses state
        setCourses(prev => ({
          ...prev,
          [allStaffProgramId]: coursesWithLessonCount
        }));
        
        // Update the program's course count in the UI
        setPrograms(prev => 
          prev.map(p => 
            p.id === allStaffProgramId 
              ? { ...p, courses_count: coursesWithLessonCount.length } 
              : p
          )
        );
        
        console.log('✅ Successfully updated UI with courses from admin API');
        alert(`Found ${coursesWithLessonCount.length} courses for All Staff Training. UI has been updated.`);
      } else {
        console.log('⚠️ No courses found for this program ID');
        alert('No courses found for All Staff Training program ID.');
      }
    } catch (error) {
      console.error('Error fixing All Staff Training program:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="content-structure-wrapper" key={instanceKey}>
      {/* Add diagnostic buttons at the top */}
      {DEVELOPMENT_MODE && (
        <div className="debug-tools p-2 mb-4 bg-blue-100 rounded-md">
          <h3 className="font-bold text-blue-800 mb-2">Developer Tools</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={debugFetchCoursesForKnownID}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Diagnose Courses (Known ID)
            </button>
            
            <button 
              onClick={debugShowAllEntityIDs}
              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Show All Entity IDs
            </button>
            
            <button 
              onClick={fixAllStaffTrainingProgram}
              className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              Fix All Staff Training
            </button>
            
            <button 
              onClick={debugCleanupDatabase}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Clean Database (Delete All)
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Development tools for debugging content structure issues
          </p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Main content area */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Program Structure</h1>
          <p className="text-sm text-gray-600">Organize your content into programs, courses, lessons, and modules</p>
        </div>
        
        {/* COMPLETELY REWRITTEN PROGRAM BUTTON WITH ONCLICK HANDLER */}
        <a 
          href="#"
          id="createProgramButton"
          onClick={(e) => {
            e.preventDefault();
            console.log("Create Program link clicked");
            setShowProgramForm(!showProgramForm);
          }}
          className="bg-[#AE9773] hover:bg-[#8E795D] text-white px-4 py-2 rounded-md inline-flex items-center"
        >
          <span className="mr-2">+</span>
          Create Program
        </a>
      </div>
      
      {/* Program form rendered directly in page */}
      {renderProgramForm()}
      
      {/* Loading state */}
      {loading && programs.length === 0 && (
        <div className="py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#AE9773] border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-gray-600">Loading programs...</p>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && programs.length === 0 && !showProgramForm && (
        <div className="py-10 text-center bg-white rounded-md border border-gray-200 shadow-sm">
          <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No programs found.</p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              console.log("Create Your First Program link clicked");
              setShowProgramForm(true);
            }}
            className="mt-4 px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#8E795D] inline-block"
          >
            Create Your First Program
          </a>
        </div>
      )}
      
      {/* Programs list */}
      {!loading && programs.length > 0 && (
        <div className="space-y-4">
          {programs.map(program => renderProgram(program))}
        </div>
      )}
      
      {/* Other modals (not course-related) */}
      {viewingModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            {/* Module viewing code... */}
          </div>
        </div>
      )}
      
      {showMoveDialog && programToMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          {/* Move dialog code... */}
        </div>
      )}
      
      {showConfirmArchive && programToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          {/* Archive confirm dialog code... */}
        </div>
      )}
    </div>
  );
} 