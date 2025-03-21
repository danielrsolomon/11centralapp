import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { programService } from '../../services/programService';
import { progressService } from '../../services/progressService';
import { Program } from '../../types/database.types';

// Interface for program with progress information
interface ProgramWithProgress extends Program {
  courseCount: number;
  progress: number;
  isCompleted: boolean;
}

export default function Programs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramWithProgress[]>([]);
  
  useEffect(() => {
    // Fetch programs and progress data
    const fetchProgramsWithProgress = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Programs: Starting to fetch programs for user:', user.id);
        
        // Get all published programs
        const { data: programsData, error: programsError } = await programService.getPublishedPrograms();
        
        if (programsError) {
          console.error('Programs: Error fetching programs:', programsError);
          throw new Error(programsError.message);
        }
        
        if (!programsData || programsData.length === 0) {
          console.log('Programs: No programs found or empty array returned');
          setPrograms([]);
          setIsLoading(false);
          return;
        }
        
        console.log(`Programs: Successfully fetched ${programsData.length} programs`);
        
        // Get user progress across all programs
        const { data: progressData, error: progressError } = await progressService.getAllUserProgress(user.id);
        
        if (progressError) {
          console.error('Programs: Error fetching progress data:', progressError);
          throw new Error(progressError.message);
        }
        
        console.log(`Programs: Fetched progress data for ${progressData?.length || 0} programs`);
        
        try {
          // Map programs with course counts and progress
          const programsWithDetails = await Promise.all(
            programsData.map(async (program) => {
              try {
                // Get detailed program info with courses
                const { data: programDetail, error: detailError } = await programService.getProgramWithCourses(program.id);
                
                if (detailError) {
                  console.error(`Programs: Error fetching details for program ${program.id}:`, detailError);
                }
                
                // Find progress for this program
                const programProgress = progressData?.find(p => p.program_id === program.id);
                
                // Calculate course count
                const courseCount = programDetail?.courses?.length || 0;
                
                return {
                  ...program,
                  courseCount,
                  progress: programProgress?.completion_percentage || 0,
                  isCompleted: programProgress?.status === 'completed' || false
                };
              } catch (progError) {
                console.error(`Programs: Error processing program ${program.id}:`, progError);
                // Return program with default values rather than failing
                return {
                  ...program,
                  courseCount: 0,
                  progress: 0,
                  isCompleted: false
                };
              }
            })
          );
          
          console.log('Programs: Successfully processed all program details');
          setPrograms(programsWithDetails);
        } catch (mapError) {
          console.error('Programs: Error mapping program details:', mapError);
          // Still show programs even if we couldn't get all details
          const basicPrograms = programsData.map(program => ({
            ...program,
            courseCount: 0,
            progress: 0,
            isCompleted: false
          }));
          setPrograms(basicPrograms);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Programs: Critical error in fetchProgramsWithProgress:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgramsWithProgress();
  }, [user]);
  
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
        <span className="font-medium text-gold-light">Training Portal</span>
      </div>
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <GraduationCap className="h-8 w-8 mr-2 text-gold-light" />
          Training Portal
        </h1>
        <p className="text-gray-600 mt-2">
          Explore training programs and enhance your skills with interactive courses.
        </p>
      </div>
      
      {/* Programs Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
          <h3 className="text-lg font-semibold mb-2">Error loading programs</h3>
          <p>{error}</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <GraduationCap className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Programs Available</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There are currently no training programs assigned to you. Please check back later or contact your manager.
          </p>
        </div>
      ) : (
        // Program grid with 3 columns on large screens, 2 on medium, 1 on small
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}

// Program Card Component
function ProgramCard({ program }: { program: ProgramWithProgress }) {
  const navigate = useNavigate();
  
  // Handle card click to navigate to courses
  const handleClick = () => {
    navigate(`/university/programs/${program.id}`);
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full cursor-pointer"
      onClick={handleClick}
    >
      {/* Program Thumbnail */}
      <div className="relative h-48 w-full bg-gray-100">
        {program.thumbnail_url ? (
          <img 
            src={program.thumbnail_url} 
            alt={program.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <BookOpen className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Completed Badge (if applicable) */}
        {program.isCompleted && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            Completed
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold mb-2">{program.title}</h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
          {program.description}
        </p>
        
        {/* Course Count */}
        <div className="text-sm text-gray-500 mb-3">
          {program.courseCount} {program.courseCount === 1 ? 'Course' : 'Courses'}
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${program.isCompleted ? 'bg-green-500' : 'bg-gold-light'}`}
              style={{ width: `${program.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{program.progress}% Complete</span>
            {program.progress < 100 && (
              <span>{100 - program.progress}% Remaining</span>
            )}
          </div>
        </div>
        
        {/* Action Button */}
        <button 
          className="w-full px-4 py-2 bg-gold-light text-white rounded-md hover:bg-gold-dark transition-colors mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/university/programs/${program.id}`);
          }}
        >
          {program.progress === 0 ? 'Start Program' : 
           program.isCompleted ? 'Review Program' : 'Continue Program'}
        </button>
      </div>
    </div>
  );
} 