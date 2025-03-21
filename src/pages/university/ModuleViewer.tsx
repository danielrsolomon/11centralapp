import { 
  ChevronRight, 
  Home, 
  ChevronLeft, 
  Play, 
  PauseCircle, 
  CheckCircle, 
  ChevronRightCircle,
  FileText,
  Image as ImageIcon,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw
} from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

// Define types for module data
interface ModuleContent {
  id: number;
  title: string;
  type: 'video' | 'quiz' | 'pdf' | 'image';
  duration?: string;
  content: string; // URL or content string
  description?: string;
  completed: boolean;
}

// Define quiz question and answer types
interface QuizQuestion {
  id: number;
  text: string;
  options: QuizOption[];
  correctOptionId: number;
}

interface QuizOption {
  id: number;
  text: string;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
}

// Add quiz data to our mock data
const mockQuizData: Record<string, QuizData> = {
  'quiz-data-1': {
    id: 'quiz-data-1',
    title: 'Customer Service Fundamentals Quiz',
    description: 'Test your knowledge of customer service fundamentals.',
    questions: [
      {
        id: 1,
        text: 'What is the primary goal of customer service?',
        options: [
          { id: 1, text: 'To make sales' },
          { id: 2, text: 'To build customer satisfaction and loyalty' },
          { id: 3, text: 'To minimize customer interactions' }
        ],
        correctOptionId: 2
      },
      {
        id: 2,
        text: 'Which of the following is NOT an important aspect of customer service?',
        options: [
          { id: 1, text: 'Active listening' },
          { id: 2, text: 'Clear communication' },
          { id: 3, text: 'Avoiding eye contact' }
        ],
        correctOptionId: 3
      },
      {
        id: 3,
        text: 'What is the first step in handling a customer complaint?',
        options: [
          { id: 1, text: 'Listen actively to understand the issue' },
          { id: 2, text: 'Offer a discount immediately' },
          { id: 3, text: 'Transfer the customer to a manager' }
        ],
        correctOptionId: 1
      }
    ],
    passingScore: 70
  },
  'quiz-data-2': {
    id: 'quiz-data-2',
    title: 'Customer Expectations Quiz',
    description: 'Test your understanding of customer expectations and how to exceed them.',
    questions: [
      {
        id: 1,
        text: 'What is the primary expectation of most customers?',
        options: [
          { id: 1, text: 'Low prices' },
          { id: 2, text: 'Fast service' },
          { id: 3, text: 'Value for their money' }
        ],
        correctOptionId: 3
      },
      {
        id: 2,
        text: 'How can businesses best exceed customer expectations?',
        options: [
          { id: 1, text: 'By promising less than they can deliver' },
          { id: 2, text: 'By surprising customers with unexpected perks' },
          { id: 3, text: 'By charging premium prices' }
        ],
        correctOptionId: 2
      }
    ],
    passingScore: 50
  },
  'quiz-data-3': {
    id: 'quiz-data-3',
    title: 'First Impressions Quiz',
    description: 'Test your understanding of creating positive first impressions.',
    questions: [
      {
        id: 1,
        text: 'How long does it typically take for customers to form a first impression?',
        options: [
          { id: 1, text: 'About 7 seconds' },
          { id: 2, text: 'About 2 minutes' },
          { id: 3, text: 'After the first transaction is complete' }
        ],
        correctOptionId: 1
      },
      {
        id: 2,
        text: 'Which body language signal communicates interest and attention?',
        options: [
          { id: 1, text: 'Crossed arms' },
          { id: 2, text: 'Looking at your watch or phone' },
          { id: 3, text: 'Eye contact and a slight lean forward' }
        ],
        correctOptionId: 3
      },
      {
        id: 3,
        text: 'What should you do if you don\'t know the answer to a customer\'s question?',
        options: [
          { id: 1, text: 'Make up an answer to appear knowledgeable' },
          { id: 2, text: 'Say "I don\'t know" and find someone who does know' },
          { id: 3, text: 'Change the subject to something you know about' }
        ],
        correctOptionId: 2
      },
      {
        id: 4,
        text: 'What is the most important factor in creating a positive first impression?',
        options: [
          { id: 1, text: 'How you look' },
          { id: 2, text: 'How you make the customer feel' },
          { id: 3, text: 'How much you know' }
        ],
        correctOptionId: 2
      }
    ],
    passingScore: 75
  },
  'quiz-data-4': {
    id: 'quiz-data-4',
    title: 'Active Listening Quiz',
    description: 'Test your understanding of active listening principles and techniques.',
    questions: [
      {
        id: 1,
        text: 'Which of the following is NOT an active listening technique?',
        options: [
          { id: 1, text: 'Paraphrasing what the speaker said' },
          { id: 2, text: 'Thinking about your response while they speak' },
          { id: 3, text: 'Making appropriate eye contact' }
        ],
        correctOptionId: 2
      },
      {
        id: 2,
        text: 'Why is active listening important in customer service?',
        options: [
          { id: 1, text: 'It helps identify and solve customer problems efficiently' },
          { id: 2, text: 'It makes conversations shorter' },
          { id: 3, text: 'It impresses management' }
        ],
        correctOptionId: 1
      },
      {
        id: 3,
        text: 'What is the benefit of using clarifying questions?',
        options: [
          { id: 1, text: "They show the customer you're intelligent" },
          { id: 2, text: "They ensure you correctly understand the customer's needs" },
          { id: 3, text: 'They extend the conversation to meet time quotas' }
        ],
        correctOptionId: 2
      }
    ],
    passingScore: 67
  }
};

// For any undefined quiz IDs, create a default quiz
const getDefaultQuiz = (quizId: string): QuizData => {
  return {
    id: quizId,
    title: 'Module Quiz',
    description: 'Test your understanding of this module\'s content.',
    questions: [
      {
        id: 1,
        text: 'Which of the following is most important for success in this area?',
        options: [
          { id: 1, text: 'Technical knowledge' },
          { id: 2, text: 'Communication skills' },
          { id: 3, text: 'Following procedures precisely' }
        ],
        correctOptionId: 2
      },
      {
        id: 2,
        text: 'What is the first step in the process outlined in this module?',
        options: [
          { id: 1, text: 'Assessment' },
          { id: 2, text: 'Planning' },
          { id: 3, text: 'Implementation' }
        ],
        correctOptionId: 1
      }
    ],
    passingScore: 50
  };
};

// Continue with the rest of the interfaces
interface Lesson {
  id: number;
  title: string;
  description: string;
  modules: ModuleContent[];
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
          { 
            id: 10001, 
            title: "Welcome to Customer Service", 
            type: "video", 
            duration: "0:10", 
            completed: false,
            content: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
            description: "An introduction to the foundations of customer service and what you'll learn in this course."
          },
          { 
            id: 10002, 
            title: "The Importance of Great Service", 
            type: "video", 
            duration: "8:45", 
            completed: true,
            content: "https://example.com/videos/importance-of-great-service.mp4",
            description: "Learn why exceptional customer service is critical for business success and customer loyalty."
          },
          { 
            id: 10003, 
            title: "Module 1 Quiz", 
            type: "quiz", 
            completed: true,
            content: "quiz-data-1",
            description: "Test your knowledge of customer service fundamentals."
          }
        ]
      },
      {
        id: 1002,
        title: "Customer Expectations",
        description: "Understanding and exceeding customer expectations",
        completed: true,
        modules: [
          { 
            id: 10004, 
            title: "What Customers Expect", 
            type: "video", 
            duration: "7:15", 
            completed: true,
            content: "https://example.com/videos/what-customers-expect.mp4",
            description: "Understanding the baseline expectations customers have when interacting with your business."
          },
          { 
            id: 10005, 
            title: "Exceeding Expectations", 
            type: "video", 
            duration: "6:20", 
            completed: true,
            content: "https://example.com/videos/exceeding-expectations.mp4",
            description: "Strategies for going beyond the basics to create memorable customer experiences."
          },
          { 
            id: 10006, 
            title: "Customer Expectations Checklist", 
            type: "pdf", 
            completed: true,
            content: "https://example.com/pdfs/customer-expectations-checklist.pdf",
            description: "A downloadable checklist to help ensure you're meeting and exceeding customer expectations."
          },
          { 
            id: 10007, 
            title: "Module 2 Quiz", 
            type: "quiz", 
            completed: true,
            content: "quiz-data-2",
            description: "Test your understanding of customer expectations and how to exceed them."
          }
        ]
      },
      {
        id: 1003,
        title: "First Impressions",
        description: "Creating positive first impressions with customers",
        completed: false,
        modules: [
          { 
            id: 10008, 
            title: "The Power of First Impressions", 
            type: "video", 
            duration: "6:50", 
            completed: true,
            content: "https://example.com/videos/power-first-impressions.mp4",
            description: "Learn about the psychological impact of first impressions in customer service."
          },
          { 
            id: 10009, 
            title: "Body Language and Tone", 
            type: "video", 
            duration: "7:30", 
            completed: false,
            content: "https://example.com/videos/body-language-tone.mp4",
            description: "Master the non-verbal aspects of communication that create positive impressions."
          },
          { 
            id: 10010, 
            title: "First Impressions Scenarios", 
            type: "image", 
            completed: false,
            content: "https://example.com/images/first-impression-scenarios.jpg",
            description: "Visual examples of positive and negative first impressions."
          },
          { 
            id: 10011, 
            title: "Module 3 Quiz", 
            type: "quiz", 
            completed: false,
            content: "quiz-data-3",
            description: "Test your understanding of creating positive first impressions."
          }
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
          { 
            id: 10012, 
            title: "What is Active Listening", 
            type: "video", 
            duration: "6:15", 
            completed: true,
            content: "https://example.com/videos/what-is-active-listening.mp4",
            description: "An introduction to the concept and importance of active listening in communication."
          },
          { 
            id: 10013, 
            title: "Active Listening Techniques", 
            type: "video", 
            duration: "9:40", 
            completed: true,
            content: "https://example.com/videos/active-listening-techniques.mp4",
            description: "Learn practical techniques to improve your active listening skills."
          },
          { 
            id: 10014, 
            title: "Module 1 Quiz", 
            type: "quiz", 
            completed: true,
            content: "quiz-data-4",
            description: "Test your understanding of active listening principles and techniques."
          }
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
          { 
            id: courseId * 100 + 1, 
            title: "Welcome to the Course", 
            type: "video", 
            duration: "5:00", 
            completed: false,
            content: "https://example.com/videos/welcome.mp4",
            description: "A warm welcome and overview of what you'll learn in this course."
          },
          { 
            id: courseId * 100 + 2, 
            title: "Course Overview", 
            type: "video", 
            duration: "7:30", 
            completed: false,
            content: "https://example.com/videos/overview.mp4",
            description: "Detailed explanation of course structure and learning objectives."
          }
        ]
      }
    ]
  };
};

export default function ModuleViewer() {
  const { programId, courseId, lessonId, moduleId } = useParams();
  const navigate = useNavigate();
  
  // Convert params to numbers
  const numericProgramId = Number(programId || 0);
  const numericCourseId = Number(courseId || 0);
  const numericLessonId = Number(lessonId || 0);
  const numericModuleId = Number(moduleId || 0);
  
  // Get course data
  const courseData = mockCourseDetails[numericCourseId] || getDefaultCourseDetails(numericCourseId, numericProgramId);
  
  // Find current lesson
  const currentLessonIndex = courseData.lessons.findIndex(l => l.id === numericLessonId);
  const currentLesson = currentLessonIndex >= 0 
    ? courseData.lessons[currentLessonIndex] 
    : courseData.lessons[0];
  
  // Find current module
  const currentModuleIndex = currentLesson.modules.findIndex(m => m.id === numericModuleId);
  const currentModule = currentModuleIndex >= 0 
    ? currentLesson.modules[currentModuleIndex] 
    : currentLesson.modules[0];
  
  // State for mobile view
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Navigation states
  const isFirstModule = currentModuleIndex === 0 && currentLessonIndex === 0;
  const isLastModule = currentModuleIndex === currentLesson.modules.length - 1 && 
                       currentLessonIndex === courseData.lessons.length - 1;
  
  // Calculate lesson progress
  const completedModulesInLesson = currentLesson.modules.filter(m => m.completed).length;
  const lessonProgress = Math.round((completedModulesInLesson / currentLesson.modules.length) * 100);
  
  // State for video progress tracking
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(currentModule.completed);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Quiz state management
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Get the quiz data if this is a quiz module
  const quizData = currentModule.type === 'quiz' 
    ? (mockQuizData[currentModule.content] || getDefaultQuiz(currentModule.content))
    : null;

  // Immediate test for quizzes with an existing module
  const [showTestQuiz, setShowTestQuiz] = useState(false);
  const testQuizData = mockQuizData['quiz-data-1'] || getDefaultQuiz('test-quiz');

  // Handle selecting an answer in the quiz
  const handleSelectAnswer = (questionId: number, optionId: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Calculate quiz score
  const calculateQuizScore = () => {
    if (!quizData) return 0;
    
    let correctAnswers = 0;
    quizData.questions.forEach(question => {
      if (selectedAnswers[question.id] === question.correctOptionId) {
        correctAnswers++;
      }
    });
    
    return Math.round((correctAnswers / quizData.questions.length) * 100);
  };

  // Update the submit quiz function to handle both the module quizzes and the post-video quizzes
  const handleQuizSubmit = () => {
    // For a post-video quiz, we only check the first question
    if (currentModule.type !== 'quiz' && quizData) {
      const questionToCheck = quizData.questions[0];
      const isCorrect = selectedAnswers[questionToCheck.id] === questionToCheck.correctOptionId;
      
      setQuizSubmitted(true);
      setShowFeedback(true);
      
      if (isCorrect) {
        setQuizPassed(true);
        setQuizCompleted(true);
      } else {
        // Failed quiz - reset the video completion
        setCompleted(false);
        setProgress(0);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
      }
      return;
    }
    
    // For regular quizzes, proceed as before
    // Make sure all questions are answered
    const allQuestionsAnswered = quizData?.questions.every(q => selectedAnswers[q.id] !== undefined);
    
    if (!allQuestionsAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }
    
    const score = calculateQuizScore();
    setQuizScore(score);
    setQuizSubmitted(true);
    setShowFeedback(true);
    
    // Check if the quiz is passed
    if (quizData && score >= quizData.passingScore) {
      setQuizPassed(true);
      setQuizCompleted(true);
      setCompleted(true);
    }
  };

  // Retry the quiz
  const handleRetryQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setShowFeedback(false);
    setQuizScore(0);
    setQuizPassed(false);
  };
  
  // Handle video playing
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle video progress updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      
      // Mark as completed when the video is watched 95% through
      if (currentProgress > 95 && !completed) {
        setCompleted(true);
      }
    }
  };
  
  // Handle video loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };
  
  // Format time from seconds
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Force quiz to show for testing
  useEffect(() => {
    if (currentModule.type === 'video' && !completed) {
      // Short timer to auto-complete the video for testing
      const timer = setTimeout(() => {
        console.log("Auto-completing video...");
        setCompleted(true);
        setShowTestQuiz(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentModule.type, completed]);
  
  // Autoplay video when component mounts
  useEffect(() => {
    if (videoRef.current && currentModule.type === 'video') {
      // Try to autoplay the video
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        // Autoplay was prevented by browser
        console.log('Autoplay prevented:', error);
        setIsPlaying(false);
      });
    }
    
    // Reset quiz state when changing modules
    if (currentModule.type === 'quiz') {
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setShowFeedback(false);
      setQuizScore(0);
      setQuizPassed(false);
      setQuizCompleted(currentModule.completed);
    }
  }, [currentModule.id, currentModule.type, currentModule.completed]);
  
  // Navigate to next or previous module
  const navigateToModule = (direction: 'next' | 'prev') => {
    let nextModuleId: number | undefined;
    let nextLessonId: number | undefined;
    
    if (direction === 'next') {
      // Check if there's a next module in the current lesson
      if (currentModuleIndex < currentLesson.modules.length - 1) {
        nextModuleId = currentLesson.modules[currentModuleIndex + 1].id;
        nextLessonId = currentLesson.id;
      } 
      // Check if there's a next lesson
      else if (currentLessonIndex < courseData.lessons.length - 1) {
        const nextLesson = courseData.lessons[currentLessonIndex + 1];
        nextLessonId = nextLesson.id;
        nextModuleId = nextLesson.modules[0].id;
      }
    } else {
      // Check if there's a previous module in the current lesson
      if (currentModuleIndex > 0) {
        nextModuleId = currentLesson.modules[currentModuleIndex - 1].id;
        nextLessonId = currentLesson.id;
      } 
      // Check if there's a previous lesson
      else if (currentLessonIndex > 0) {
        const prevLesson = courseData.lessons[currentLessonIndex - 1];
        nextLessonId = prevLesson.id;
        nextModuleId = prevLesson.modules[prevLesson.modules.length - 1].id;
      }
    }
    
    if (nextModuleId && nextLessonId) {
      navigate(`/university/programs/${programId}/courses/${courseId}/lessons/${nextLessonId}/modules/${nextModuleId}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800 pt-[64px]">
      {/* Mobile Toggle Sidebar Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="bg-[#AE9773] text-white p-3 rounded-full shadow-lg"
        >
          {showSidebar ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
        </button>
      </div>
      
      {/* Back to Course Button */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-[64px] z-40">
        <Link 
          to={`/university/programs/${programId}/courses/${courseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Course
        </Link>
      </div>
      
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Sidebar - Lessons and Modules */}
        <div 
          className={`
            fixed inset-0 md:relative w-64 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-30
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 md:h-[calc(100vh-120px)] md:max-h-[calc(100vh-120px)] overflow-y-auto md:flex-shrink-0
            top-[120px] md:top-[120px]
          `}
        >
          <div className="h-full overflow-y-auto py-4">
            {/* Course Title */}
            <div className="px-4 mb-4">
              <h2 className="text-lg font-bold text-gray-800">{courseData.title}</h2>
            </div>
            
            {/* Course Progress */}
            <div className="px-4 mb-6">
              <p className="text-sm font-medium text-gray-600 mb-1">30% Completed</p>
              <p className="text-xs text-gray-500 mb-2">Last activity on Feb 12, 2020</p>
            </div>
            
            {/* Lessons and their modules */}
            <div className="space-y-6">
              {courseData.lessons.map((lesson) => (
                <div key={lesson.id} className="px-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{lesson.title}</h3>
                  <ul className="space-y-2">
                    {lesson.modules.map((module) => (
                      <li 
                        key={module.id} 
                        className={`
                          flex items-center py-2 px-2 rounded-md text-sm
                          ${module.id === currentModule.id ? 'bg-gray-200' : 'hover:bg-gray-100'}
                        `}
                      >
                        <Link
                          to={`/university/programs/${programId}/courses/${courseId}/lessons/${lesson.id}/modules/${module.id}`}
                          className="flex items-center w-full"
                        >
                          <div className="mr-3 flex-shrink-0">
                            {module.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-gray-400"></div>
                            )}
                          </div>
                          <span className={`text-sm ${module.id === currentModule.id ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {module.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pt-2">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Course / Lesson Navigation - Just show lesson info without completion buttons */}
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">
                {courseData.title} &gt; {currentLesson.title}
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">LESSON {currentLessonIndex + 1} of {courseData.lessons.length}</span>
              </div>
            </div>
            
            {/* Module Title */}
            <h1 className="text-3xl font-bold mb-6 text-gray-800">{currentModule.title}</h1>
            
            {/* Author Info */}
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center overflow-hidden">
                <img src="/avatars/daneille.jpg" alt="Instructor" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium text-gray-700 mr-2">Danielle</span> • Feb 12, 2020
              </div>
            </div>
            
            {/* Module Content */}
            <div className="mb-8">
              {/* Simplified Video Player */}
              {currentModule.type === 'video' && !completed && (
                <>
                  <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 mb-4">
                    <div className="relative aspect-video">
                      <video
                        ref={videoRef}
                        className="w-full h-full bg-gray-100"
                        src={currentModule.content}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => {
                          console.log("Video ended, setting completed");
                          setCompleted(true);
                          setShowTestQuiz(true);
                        }}
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    </div>
                    <div className="p-3 bg-gray-50 text-sm text-gray-600 font-medium">
                      The video will automatically complete in 5 seconds. A quiz will appear below.
                    </div>
                  </div>

                  {/* Force test button */}
                  <button 
                    onClick={() => {
                      setCompleted(true);
                      setShowTestQuiz(true);
                    }}
                    className="mb-6 inline-flex items-center py-2 px-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded text-sm font-medium"
                  >
                    Show Quiz Now (For Testing)
                  </button>
                </>
              )}
              
              {/* PDF Viewer */}
              {currentModule.type === 'pdf' && !completed && (
                <div className="rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden mb-4">
                  <div className="p-4 bg-gray-50 flex items-center border-b border-gray-200">
                    <FileText className="h-5 w-5 text-[#AE9773] mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">PDF Document</h2>
                  </div>
                  
                  {/* PDF Embed or Display */}
                  <div className="p-4 flex flex-col items-center">
                    <div className="w-full h-[500px] bg-white rounded border border-gray-200">
                      <iframe 
                        src={currentModule.content}
                        className="w-full h-full rounded"
                        title={currentModule.title}
                      ></iframe>
                    </div>
                    
                    {/* Mark as Complete Button */}
                    <button
                      onClick={() => setCompleted(true)}
                      className="mt-4 inline-flex items-center py-2 px-4 bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors rounded text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </button>
                  </div>
                </div>
              )}
              
              {/* Image Viewer */}
              {currentModule.type === 'image' && !completed && (
                <div className="rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden mb-4">
                  <div className="p-4 bg-gray-50 flex items-center border-b border-gray-200">
                    <ImageIcon className="h-5 w-5 text-[#AE9773] mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">Image Content</h2>
                  </div>
                  
                  {/* Image Display */}
                  <div className="p-4 flex flex-col items-center">
                    <div className="w-full flex items-center justify-center mb-4">
                      <img 
                        src={currentModule.content} 
                        alt={currentModule.title}
                        className="max-w-full max-h-[500px] object-contain rounded border border-gray-200"
                      />
                    </div>
                    
                    {/* Mark as Complete Button */}
                    <button
                      onClick={() => setCompleted(true)}
                      className="inline-flex items-center py-2 px-4 bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors rounded text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show Quiz when video/content is completed or it's a dedicated quiz */}
              {((completed || currentModule.type === 'quiz' || showTestQuiz) && quizData) && (
                <div className="rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden mb-4">
                  <div className="p-4 bg-gray-50 flex items-center border-b border-gray-200">
                    <BookOpen className="h-5 w-5 text-[#AE9773] mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">Quiz Check</h2>
                  </div>
                  
                  {/* Quiz Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">{quizData.title}</h3>
                    <p className="text-gray-600 mb-6">Answer correctly to proceed to the next module.</p>
                    
                    {/* Quiz Pass/Fail Message */}
                    {quizSubmitted && (
                      <div className={`mb-6 p-4 rounded-md ${quizPassed ? 'bg-green-50 border border-green-500' : 'bg-red-50 border border-red-500'}`}>
                        <div className="flex items-center">
                          {quizPassed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <p className={`font-medium ${quizPassed ? 'text-green-700' : 'text-red-700'}`}>
                            {quizPassed 
                              ? `Correct! You can now proceed to the next module.` 
                              : `Incorrect. You need to review the content and try again.`}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Display only one question at a time for quizzes after videos */}
                    {currentModule.type !== 'quiz' ? (
                      // For post-video quizzes, show just one question
                      <div className="p-4 rounded-lg border border-gray-100">
                        {quizData.questions.length > 0 && (
                          <>
                            <p className="font-medium text-gray-800 mb-3">
                              {quizData.questions[0].text}
                            </p>
                            <div className="space-y-3">
                              {quizData.questions[0].options.map((option) => (
                                <div key={option.id} className="flex items-start">
                                  <div className="flex items-center h-5">
                                    <input
                                      id={`question-1-option-${option.id}`}
                                      type="radio"
                                      name="question-1"
                                      value={option.id}
                                      checked={selectedAnswers[quizData.questions[0].id] === option.id}
                                      onChange={() => !quizSubmitted && handleSelectAnswer(quizData.questions[0].id, option.id)}
                                      disabled={quizSubmitted && quizPassed}
                                      className="h-4 w-4 text-[#AE9773] border-gray-300 focus:ring-[#AE9773]"
                                    />
                                  </div>
                                  <label
                                    htmlFor={`question-1-option-${option.id}`}
                                    className={`ml-3 text-gray-700 ${
                                      quizSubmitted && showFeedback && option.id === quizData.questions[0].correctOptionId 
                                        ? 'font-medium text-green-700' 
                                        : quizSubmitted && showFeedback && selectedAnswers[quizData.questions[0].id] === option.id && option.id !== quizData.questions[0].correctOptionId 
                                        ? 'text-red-700' 
                                        : ''
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <span>{option.text}</span>
                                      {quizSubmitted && showFeedback && option.id === quizData.questions[0].correctOptionId && (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                                      )}
                                      {quizSubmitted && showFeedback && selectedAnswers[quizData.questions[0].id] === option.id && option.id !== quizData.questions[0].correctOptionId && (
                                        <XCircle className="h-4 w-4 text-red-500 ml-2" />
                                      )}
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>

                            {/* Question feedback */}
                            {quizSubmitted && showFeedback && selectedAnswers[quizData.questions[0].id] !== quizData.questions[0].correctOptionId && (
                              <div className="mt-2 text-sm text-red-600">
                                <p>Incorrect. Please review the module content and try again.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      // For dedicated quiz modules, show all questions
                      <div className="space-y-8 mb-6">
                        {quizData.questions.map((question) => (
                          <div key={question.id} className={`p-4 rounded-lg ${quizSubmitted ? 'bg-gray-50' : ''}`}>
                            <p className="font-medium text-gray-800 mb-3">
                              {question.id}. {question.text}
                            </p>
                            <div className="space-y-3">
                              {question.options.map((option) => (
                                <div key={option.id} className="flex items-start">
                                  <div className="flex items-center h-5">
                                    <input
                                      id={`question-${question.id}-option-${option.id}`}
                                      type="radio"
                                      name={`question-${question.id}`}
                                      value={option.id}
                                      checked={selectedAnswers[question.id] === option.id}
                                      onChange={() => !quizSubmitted && handleSelectAnswer(question.id, option.id)}
                                      disabled={quizSubmitted && quizPassed}
                                      className="h-4 w-4 text-[#AE9773] border-gray-300 focus:ring-[#AE9773]"
                                    />
                                  </div>
                                  <label
                                    htmlFor={`question-${question.id}-option-${option.id}`}
                                    className={`ml-3 text-gray-700 ${
                                      quizSubmitted && showFeedback && option.id === question.correctOptionId 
                                        ? 'font-medium text-green-700' 
                                        : quizSubmitted && showFeedback && selectedAnswers[question.id] === option.id && option.id !== question.correctOptionId 
                                        ? 'text-red-700' 
                                        : ''
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <span>{option.text}</span>
                                      {quizSubmitted && showFeedback && option.id === question.correctOptionId && (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                                      )}
                                      {quizSubmitted && showFeedback && selectedAnswers[question.id] === option.id && option.id !== question.correctOptionId && (
                                        <XCircle className="h-4 w-4 text-red-500 ml-2" />
                                      )}
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            {/* Question feedback */}
                            {quizSubmitted && showFeedback && selectedAnswers[question.id] !== question.correctOptionId && (
                              <div className="mt-2 text-sm text-red-600">
                                <p>Incorrect. Please review the course material on this topic.</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4">
                      {/* Submit/Retry Quiz Button */}
                      {!quizSubmitted ? (
                        <button
                          onClick={handleQuizSubmit}
                          className={`inline-flex items-center py-2 px-4 bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors rounded text-sm font-medium ${
                            Object.keys(selectedAnswers).length < (currentModule.type === 'quiz' ? quizData.questions.length : 1) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={Object.keys(selectedAnswers).length < (currentModule.type === 'quiz' ? quizData.questions.length : 1)}
                        >
                          Submit Answer
                        </button>
                      ) : !quizPassed ? (
                        <button
                          onClick={handleRetryQuiz}
                          className="inline-flex items-center py-2 px-4 bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors rounded text-sm font-medium"
                        >
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Try Again
                        </button>
                      ) : (
                        <div className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Answer is correct!
                        </div>
                      )}
                      
                      {/* Only show the next button if the question is answered correctly */}
                      {quizPassed && !isLastModule && (
                        <button
                          onClick={() => navigateToModule('next')}
                          className="inline-flex items-center py-2 px-4 bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors rounded text-sm font-medium"
                        >
                          Next Module
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Module Description */}
              {currentModule.description && (
                <div className="text-gray-700 prose max-w-full">
                  <p>{currentModule.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 