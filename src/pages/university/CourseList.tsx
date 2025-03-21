import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Home, ChevronLeft, Play, Clock, BarChart, User, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { programService } from '../../services/programService';
import { progressService } from '../../services/progressService';
import { Program, Course } from '../../types/database.types';

// Enhanced Course type with progress information
interface CourseWithProgress extends Course {
  progress: number;
  isCompleted: boolean;
  lessonCount: number;
}

// Enhanced Program type with courses and progress
interface ProgramWithCourses extends Program {
  courses: CourseWithProgress[];
  progress: number;
  completedCourses: number;
}

export default function CourseList() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<ProgramWithCourses | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const fetchProgramWithCourses = async () => {
      if (!programId || !user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get program with courses
        const { data: programData, error: programError } = await programService.getProgramWithCourses(programId);
        
        if (programError) {
          throw new Error(programError.message);
        }
        
        if (!programData) {
          throw new Error('Program not found');
        }
        
        // Get user progress for this program
        const { data: programProgress, error: progressError } = await progressService.getUserProgramProgress(user.id, programId);
        
        if (progressError) {
          throw new Error(progressError.message);
        }
        
        // Get detailed user progress for each course
        const coursesWithProgress: CourseWithProgress[] = await Promise.all(
          programData.courses.map(async (course) => {
            // For each course, we could get detailed lesson progress in a real implementation
            // For now, we'll use a simpler approach with mock percentage values
            
            // Calculate a random progress value for each course (this should be replaced with real data)
            const progress = Math.floor(Math.random() * 101); // 0-100
            const isCompleted = progress === 100;
            
            return {
              ...course,
              progress,
              isCompleted,
              lessonCount: course.lessons?.length || 0
            };
          })
        );
        
        // Calculate overall program progress
        const totalProgress = programProgress?.completion_percentage || 
          (coursesWithProgress.reduce((sum, course) => sum + course.progress, 0) / 
           (coursesWithProgress.length || 1));
        
        const completedCourses = coursesWithProgress.filter(course => course.isCompleted).length;
        
        setProgram({
          ...programData,
          courses: coursesWithProgress,
          progress: totalProgress,
          completedCourses
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        console.error('Error fetching program with courses:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgramWithCourses();
  }, [programId, user]);
  
  // Filter courses based on search query if needed
  const filteredCourses = program?.courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-sm text-gray-600 mb-6">
        <Link to="/" className="flex items-center text-gold-light hover:text-gold-light">
          <Home className="h-4 w-4 mr-1" />
          <span>Home</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link to="/university" className="flex items-center text-gold-light hover:text-gold-light">
          <BookOpen className="h-4 w-4 mr-1" />
          <span>E11EVEN University</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link to="/university/programs" className="text-gold-light hover:text-gold-light">
          Training Portal
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-gold-light">
          {isLoading ? 'Loading...' : program?.title || 'Program'}
        </span>
      </div>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/university/programs')} 
        className="flex items-center mb-6 text-gray-600 hover:text-gold-light transition-colors"
      >
        <ChevronLeft className="h-5 w-5 mr-1" />
        <span>Back to Training Portal</span>
      </button>
      
      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <span className="ml-3 text-gray-600">Loading program...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start">
          <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Unable to load program</h3>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/university/programs')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Return to Training Portal
            </button>
          </div>
        </div>
      ) : program ? (
        <>
          {/* Program Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3">{program.title}</h1>
            <p className="text-gray-600 mb-6">{program.description}</p>
            
            {/* Program Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center text-gray-600 mb-2">
                  <BookOpen className="h-5 w-5 mr-2 text-gold-light" />
                  <span>Total Courses</span>
                </div>
                <div className="text-2xl font-semibold">{program.courses.length}</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center text-gray-600 mb-2">
                  <Check className="h-5 w-5 mr-2 text-green-500" />
                  <span>Completed</span>
                </div>
                <div className="text-2xl font-semibold">
                  {program.completedCourses} of {program.courses.length} courses
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center text-gray-600 mb-2">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  <span>Overall Progress</span>
                </div>
                <div className="flex items-center">
                  <div className="flex-grow mr-4">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${program.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{Math.round(program.progress)}%</div>
                </div>
              </div>
            </div>
            
            {/* Search Input */}
            {program.courses.length > 3 && (
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search courses..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
                <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Courses Found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {searchQuery ? 
                    `No courses match "${searchQuery}". Try a different search term.` : 
                    "This program doesn't have any courses yet."}
                </p>
                {searchQuery && (
                  <button 
                    className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} programId={program.id} />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Program Not Found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            The program you're looking for doesn't exist or you don't have access to it.
          </p>
          <button 
            onClick={() => navigate('/university/programs')}
            className="mt-6 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Return to Training Portal
          </button>
        </div>
      )}
    </div>
  );
}

// Course Card Component
function CourseCard({ course, programId }: { course: CourseWithProgress; programId: string }) {
  const navigate = useNavigate();
  
  // Navigate to the first lesson of the course when clicked
  const handleClick = () => {
    navigate(`/university/programs/${programId}/courses/${course.id}`);
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full cursor-pointer"
      onClick={handleClick}
    >
      {/* Course Thumbnail */}
      <div className="relative h-32 w-full bg-gray-100">
        {(course as any).thumbnail ? (
          <img 
            src={(course as any).thumbnail} 
            alt={course.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
        )}
        
        {/* Completed Badge */}
        {course.isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            Completed
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
          {course.description}
        </p>
        
        {/* Course Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
          <div className="flex items-center">
            <BookOpen className="h-3 w-3 mr-1" />
            <span>{course.lessonCount} Lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>~{course.sequence_order * 15} mins</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${course.isCompleted ? 'bg-green-500' : 'bg-gold-light'}`}
              style={{ width: `${course.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{course.progress}% Complete</span>
          </div>
        </div>
        
        {/* Action Button */}
        <button 
          className="w-full px-3 py-1.5 bg-gold-light text-white rounded-md hover:bg-gold-dark transition-colors mt-auto text-sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/university/programs/${programId}/courses/${course.id}`);
          }}
        >
          {course.progress === 0 ? 'Start Course' : 
           course.isCompleted ? 'Review Course' : 'Continue Course'}
        </button>
      </div>
    </div>
  );
} 