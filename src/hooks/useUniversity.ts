import { useState, useEffect } from 'react';
import { useAuth } from '../providers/auth-provider';
import { 
  getPrograms, 
  getCoursesByProgram,
  getLessonsByCourse,
  getModulesByLesson,
  getUserModuleProgress,
  updateUserModuleProgress
} from '../services/universityService';
import { Program, Course, Lesson, Module, UserProgress } from '../types/database.types';

// Hook for fetching programs
export const usePrograms = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const departmentId = (user as any).department_id || null;
        const result = await getPrograms(departmentId);
        
        if ('error' in result) {
          setError(result.error.message);
        } else {
          setPrograms(result.programs);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch programs');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrograms();
  }, [user]);
  
  return { programs, isLoading, error };
};

// Hook for fetching courses by program ID
export const useCourses = (programId: string) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCourses = async () => {
      if (!programId) return;
      
      setIsLoading(true);
      try {
        const result = await getCoursesByProgram(programId);
        
        if ('error' in result) {
          setError(result.error.message);
        } else {
          setCourses(result.courses);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch courses');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourses();
  }, [programId]);
  
  return { courses, isLoading, error };
};

// Hook for fetching lessons by course ID
export const useLessons = (courseId: string) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchLessons = async () => {
      if (!courseId) return;
      
      setIsLoading(true);
      try {
        const result = await getLessonsByCourse(courseId);
        
        if ('error' in result) {
          setError(result.error.message);
        } else {
          setLessons(result.lessons);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch lessons');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLessons();
  }, [courseId]);
  
  return { lessons, isLoading, error };
};

// Hook for fetching modules by lesson ID
export const useModules = (lessonId: string) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchModules = async () => {
      if (!lessonId) return;
      
      setIsLoading(true);
      try {
        const result = await getModulesByLesson(lessonId);
        
        if ('error' in result) {
          setError(result.error.message);
        } else {
          setModules(result.modules);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch modules');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModules();
  }, [lessonId]);
  
  return { modules, isLoading, error };
};

// Hook for tracking and updating module progress
export const useModuleProgress = (moduleId: string) => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || !moduleId) return;
      
      setIsLoading(true);
      try {
        const result = await getUserModuleProgress(user.id, moduleId);
        
        if ('error' in result) {
          setError(result.error.message);
        } else {
          setProgress(result.progress);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch module progress');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [user, moduleId]);
  
  const updateProgress = async (progressUpdate: Partial<UserProgress>) => {
    if (!user || !moduleId) return null;
    
    try {
      const result = await updateUserModuleProgress(user.id, moduleId, progressUpdate);
      
      if ('error' in result) {
        setError(result.error.message);
        return null;
      } else {
        setProgress(result.progress);
        setError(null);
        return result.progress;
      }
    } catch (err) {
      setError('Failed to update module progress');
      console.error(err);
      return null;
    }
  };
  
  return { progress, isLoading, error, updateProgress };
};
