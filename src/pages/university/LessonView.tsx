import { BookOpen, ChevronRight, Home, ChevronLeft, Play, Clock, BarChart, CheckCircle, Book } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';

// Define types for our data
interface Module {
  id: number;
  title: string;
  type: 'video' | 'quiz' | 'pdf' | 'image';
  duration?: string;
  completed: boolean;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  modules: Module[];
  completed: boolean;
}

interface CourseDetails {
  id: number;
  title: string;
  description: string;
  programId: number;
  programTitle: string;
  lessons: Lesson[];
}

// Mock data for courses
const mockCourseDetails: Record<number, CourseDetails> = {
  // Customer Service Fundamentals
  101: {
    id: 101,
    title: "Customer Service Fundamentals",
    description: "Introduction to the core principles of customer service",
    programId: 1,
    programTitle: "Customer Service Excellence",
    lessons: [
      {
        id: 1001,
        title: "Introduction to Customer Service",
        description: "Overview of customer service principles and importance",
        completed: true,
        modules: [
          { id: 10001, title: "Welcome to Customer Service", type: "video", duration: "5:30", completed: true },
          { id: 10002, title: "The Importance of Great Service", type: "video", duration: "8:45", completed: true },
          { id: 10003, title: "Module 1 Quiz", type: "quiz", completed: true }
        ]
      },
      {
        id: 1002,
        title: "Customer Expectations",
        description: "Understanding and exceeding customer expectations",
        completed: true,
        modules: [
          { id: 10004, title: "What Customers Expect", type: "video", duration: "7:15", completed: true },
          { id: 10005, title: "Exceeding Expectations", type: "video", duration: "6:20", completed: true },
          { id: 10006, title: "Customer Expectations Checklist", type: "pdf", completed: true },
          { id: 10007, title: "Module 2 Quiz", type: "quiz", completed: true }
        ]
      },
      {
        id: 1003,
        title: "First Impressions",
        description: "Creating positive first impressions with customers",
        completed: true,
        modules: [
          { id: 10008, title: "The Power of First Impressions", type: "video", duration: "6:50", completed: true },
          { id: 10009, title: "Body Language and Tone", type: "video", duration: "7:30", completed: true },
          { id: 10010, title: "First Impressions Scenarios", type: "image", completed: true },
          { id: 10011, title: "Module 3 Quiz", type: "quiz", completed: true }
        ]
      }
    ]
  },
  // Communication Skills
  102: {
    id: 102,
    title: "Communication Skills",
    description: "Effective communication techniques for customer interactions",
    programId: 1,
    programTitle: "Customer Service Excellence",
    lessons: [
      {
        id: 1004,
        title: "Active Listening",
        description: "Techniques for effective listening and understanding",
        completed: true,
        modules: [
          { id: 10012, title: "What is Active Listening", type: "video", duration: "6:15", completed: true },
          { id: 10013, title: "Active Listening Techniques", type: "video", duration: "9:40", completed: true },
          { id: 10014, title: "Module 1 Quiz", type: "quiz", completed: true }
        ]
      },
      {
        id: 1005,
        title: "Clear Communication",
        description: "How to communicate clearly and effectively",
        completed: true,
        modules: [
          { id: 10015, title: "Clarity in Communication", type: "video", duration: "7:20", completed: true },
          { id: 10016, title: "Avoiding Jargon and Confusion", type: "video", duration: "5:45", completed: true },
          { id: 10017, title: "Module 2 Quiz", type: "quiz", completed: true }
        ]
      },
      {
        id: 1006,
        title: "Non-verbal Communication",
        description: "Understanding body language and facial expressions",
        completed: false,
        modules: [
          { id: 10018, title: "Reading Body Language", type: "video", duration: "8:10", completed: true },
          { id: 10019, title: "Your Non-verbal Signals", type: "video", duration: "7:35", completed: false },
          { id: 10020, title: "Body Language Reference Guide", type: "pdf", completed: false },
          { id: 10021, title: "Module 3 Quiz", type: "quiz", completed: false }
        ]
      },
      {
        id: 1007,
        title: "Digital Communication",
        description: "Best practices for email and chat support",
        completed: false,
        modules: [
          { id: 10022, title: "Email Communication Best Practices", type: "video", duration: "8:50", completed: false },
          { id: 10023, title: "Chat Support Techniques", type: "video", duration: "6:30", completed: false },
          { id: 10024, title: "Email Templates", type: "pdf", completed: false },
          { id: 10025, title: "Module 4 Quiz", type: "quiz", completed: false }
        ]
      }
    ]
  }
};

// For other course IDs, we'll create a default set of lessons
const getDefaultCourseDetails = (courseId: number, programId: number = 0): CourseDetails => {
  return {
    id: courseId,
    title: `Course ${courseId}`,
    description: "Course description",
    programId: programId,
    programTitle: `Program ${programId}`,
    lessons: [
      {
        id: courseId * 10 + 1,
        title: "Lesson 1",
        description: "Introduction to the course",
        completed: false,
        modules: [
          { id: courseId * 100 + 1, title: "Welcome to the Course", type: "video", duration: "5:00", completed: false },
          { id: courseId * 100 + 2, title: "Course Overview", type: "video", duration: "7:30", completed: false },
          { id: courseId * 100 + 3, title: "Lesson 1 Quiz", type: "quiz", completed: false }
        ]
      },
      {
        id: courseId * 10 + 2,
        title: "Lesson 2",
        description: "Core concepts",
        completed: false,
        modules: [
          { id: courseId * 100 + 4, title: "Understanding the Basics", type: "video", duration: "6:15", completed: false },
          { id: courseId * 100 + 5, title: "Key Principles", type: "pdf", completed: false },
          { id: courseId * 100 + 6, title: "Lesson 2 Quiz", type: "quiz", completed: false }
        ]
      }
    ]
  };
};

export default function LessonView() {
  const { programId, courseId } = useParams<{ programId: string; courseId: string }>();
  const numericCourseId = Number(courseId || 0);
  const numericProgramId = Number(programId || 0);
  
  // Get course data based on ID
  const courseData = mockCourseDetails[numericCourseId] || getDefaultCourseDetails(numericCourseId, numericProgramId);
  
  // Calculate course progress
  const totalModules = courseData.lessons.reduce((sum, lesson) => sum + lesson.modules.length, 0);
  const completedModules = courseData.lessons.reduce((sum, lesson) => {
    return sum + lesson.modules.filter(module => module.completed).length;
  }, 0);
  const courseProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-gray-500 mb-4">
        <Link to="/university" className="flex items-center text-gold-light hover:text-gold-light">
          <Home className="h-4 w-4 mr-1" />
          <span>University</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link to="/university/programs" className="text-gold-light hover:text-gold-light">Training Portal</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link to={`/university/programs/${programId}`} className="text-gold-light hover:text-gold-light">{courseData.programTitle}</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-gold-light font-medium">{courseData.title}</span>
      </nav>
      
      {/* Back Button */}
      <div>
        <Link to={`/university/programs/${programId}`} className="inline-flex items-center text-sm font-medium text-gold-light hover:underline">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Course List
        </Link>
      </div>
      
      {/* Course Header */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800 mb-1">{courseData.title}</h1>
        <p className="text-gray-500 mb-4">{courseData.description}</p>
        
        {/* Course Progress */}
        <div className="bg-white rounded-lg border border-gray-200 shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Course Progress</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">Overall Completion:</span>
            <span className="text-sm font-medium text-gray-800">{courseProgress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
            <div 
              className="h-2 bg-[#AE9773] rounded-full" 
              style={{ width: `${courseProgress}%` }}
            ></div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center text-sm text-gray-500">
              <BookOpen className="h-4 w-4 mr-1 text-[#AE9773]" />
              <span>{courseData.lessons.length} {courseData.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Book className="h-4 w-4 mr-1 text-[#AE9773]" />
              <span>{totalModules} modules</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 mr-1 text-[#AE9773]" />
              <span>{completedModules} completed</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lessons List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Lessons</h2>
        <div className="space-y-4">
          {courseData.lessons.map((lesson, index) => (
            <div key={lesson.id} className="rounded-lg border border-gray-200 bg-white shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-[#AE9773]/10 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-[#AE9773]">{index + 1}</span>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-800">{lesson.title}</h3>
                  </div>
                  {lesson.completed && (
                    <div className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                      Completed
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mb-3 ml-11">{lesson.description}</p>
                
                {/* Module List */}
                <div className="ml-11 space-y-2 mt-4">
                  <p className="text-sm font-medium text-gray-800 mb-2">Modules:</p>
                  {lesson.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className="mr-3 w-5 h-5 flex-shrink-0">
                          {module.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                              {moduleIndex + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{module.title}</p>
                          <div className="flex items-center">
                            {module.type === 'video' && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Play className="h-3 w-3 mr-1" />
                                <span>Video • {module.duration}</span>
                              </div>
                            )}
                            {module.type === 'quiz' && (
                              <div className="flex items-center text-xs text-gray-500">
                                <BookOpen className="h-3 w-3 mr-1" />
                                <span>Quiz</span>
                              </div>
                            )}
                            {module.type === 'pdf' && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Book className="h-3 w-3 mr-1" />
                                <span>PDF Document</span>
                              </div>
                            )}
                            {module.type === 'image' && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Book className="h-3 w-3 mr-1" />
                                <span>Image</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link 
                        to={`/university/programs/${programId}/courses/${courseId}/lessons/${lesson.id}/modules/${module.id}`}
                        className="text-xs font-medium text-[#AE9773] hover:underline"
                      >
                        {module.completed ? 'Review' : 'Start'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 