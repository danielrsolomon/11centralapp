import { GraduationCap, BookOpen, Clock, CheckCircle, CalendarDays, BellRing, Trophy, FileText, Video, Users, Calendar, Bell, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for in-progress courses
const inProgressCourses = [
  {
    id: 1,
    title: 'Customer Service Excellence',
    description: 'Learn the fundamentals of exceptional customer service',
    progress: 75,
    totalModules: 4,
    completedModules: 3,
    image: '/course-customer-service.jpg',
    dueDate: '2023-12-15',
    remainingTime: '1 hour'
  },
  {
    id: 2,
    title: 'Bartending Basics',
    description: 'Master the essential skills of bartending',
    progress: 40,
    totalModules: 5,
    completedModules: 2,
    image: '/course-bartending.jpg',
    dueDate: '2023-12-10',
    remainingTime: '3 hours'
  }
];

// Mock data for upcoming deadlines
const upcomingDeadlines = [
  {
    id: 1,
    title: 'Responsible Service Training',
    dueDate: 'Dec 5, 2023',
    priority: 'High'
  },
  {
    id: 2,
    title: 'Health & Safety Assessment',
    dueDate: 'Dec 12, 2023',
    priority: 'Medium'
  },
  {
    id: 3,
    title: 'Internal Compliance Quiz',
    dueDate: 'Dec 20, 2023',
    priority: 'Low'
  }
];

// Mock data for recent notifications
const recentNotifications = [
  {
    id: 1,
    message: 'Your "Bartending Basics" course is due soon.',
    time: '2 hours ago',
    read: false
  },
  {
    id: 2,
    message: 'New required training has been assigned to you.',
    time: '1 day ago',
    read: false
  },
  {
    id: 3,
    message: 'You earned the "Quick Learner" badge!',
    time: '3 days ago',
    read: true
  }
];

// Mock data for achievements
const recentAchievements = [
  {
    id: 1,
    title: 'Customer Service Expert',
    date: 'Nov 28, 2023',
    icon: '🏆'
  },
  {
    id: 2,
    title: 'Perfect Attendance',
    date: 'Nov 15, 2023',
    icon: '⭐'
  }
];

export default function University() {
  return (
    <div className="space-y-6 p-6 bg-white">
      <h1 className="text-2xl font-bold tracking-tight text-gray-800">University Dashboard</h1>
      
      {/* Training Progress Overview */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <h3 className="text-sm font-medium text-gray-500">Overall Progress</h3>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-gray-800">68%</span>
              <span className="text-xs text-green-600 px-2 py-1 rounded-full bg-green-100">+12%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#AE9773]" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <h3 className="text-sm font-medium text-gray-500">Completed Courses</h3>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-gray-800">5/12</span>
              <span className="text-xs text-green-600 px-2 py-1 rounded-full bg-green-100">+1</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#AE9773]" style={{ width: '41.6%' }}></div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <h3 className="text-sm font-medium text-gray-500">Learning Time</h3>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-gray-800">12.5h</span>
              <span className="text-xs text-green-600 px-2 py-1 rounded-full bg-green-100">+3.5h</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">This month</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <h3 className="text-sm font-medium text-gray-500">Achievements</h3>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-gray-800">7</span>
              <span className="text-xs text-green-600 px-2 py-1 rounded-full bg-green-100">+2</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">Next: Course Creator</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/university/programs" className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10 mb-3">
              <BookOpen className="h-6 w-6 text-[#AE9773]" />
            </div>
            <h3 className="font-medium text-gray-800">Training Programs</h3>
            <p className="text-sm text-gray-500 mt-1">Browse all available training</p>
          </a>
          
          <a href="/university/achievements" className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10 mb-3">
              <Trophy className="h-6 w-6 text-[#AE9773]" />
            </div>
            <h3 className="font-medium text-gray-800">Achievements</h3>
            <p className="text-sm text-gray-500 mt-1">View your earned badges</p>
          </a>
          
          <a href="/university/resources" className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10 mb-3">
              <BookOpen className="h-6 w-6 text-[#AE9773]" />
            </div>
            <h3 className="font-medium text-gray-800">Resources</h3>
            <p className="text-sm text-gray-500 mt-1">Access training materials</p>
          </a>
          
          <a href="/help" className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10 mb-3">
              <Users className="h-6 w-6 text-[#AE9773]" />
            </div>
            <h3 className="font-medium text-gray-800">Help & Support</h3>
            <p className="text-sm text-gray-500 mt-1">Get assistance with training</p>
          </a>
        </div>
      </div>
      
      {/* Main Content Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Priority Training */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Priority Training</h2>
            <div className="space-y-4">
              {inProgressCourses.map(course => (
                <div key={course.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-gray-800">{course.title}</h3>
                    <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">
                      {course.remainingTime} left
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Progress: {course.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-[#AE9773]" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="text-sm text-[#AE9773] hover:underline">Continue</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Deadlines</h2>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <ul className="divide-y divide-gray-200">
                {upcomingDeadlines.map((deadline, index) => (
                  <li key={deadline.id} className={`py-3 first:pt-0 last:pb-0 ${index !== upcomingDeadlines.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CalendarDays className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-800">{deadline.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">{deadline.dueDate}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Right Column (Notifications & Recent Achievements) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Notifications</h2>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <ul className="divide-y divide-gray-200">
                {recentNotifications.map((notification, index) => (
                  <li key={notification.id} className={`py-3 first:pt-0 last:pb-0 ${notification.read ? 'opacity-70' : ''}`}>
                    {!notification.read && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[#AE9773]"></div>
                    )}
                    <div className={notification.read ? '' : 'pl-3'}>
                      <div className="flex items-start gap-3">
                        <BellRing className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-800">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-center">
                <a href="#" className="text-sm text-[#AE9773] hover:underline">View all notifications</a>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Achievements</h2>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <ul className="divide-y divide-gray-200">
                {recentAchievements.map((achievement, index) => (
                  <li key={achievement.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{achievement.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{achievement.title}</p>
                        <p className="text-xs text-gray-500">Earned on {achievement.date}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-center">
                <a href="/university/achievements" className="text-sm text-[#AE9773] hover:underline">View all achievements</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Training Resources */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Training Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="#" className="rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors">
            <h3 className="font-semibold text-gray-800 mb-2">Employee Handbook</h3>
            <p className="text-sm text-gray-500">Access the complete guide to policies and procedures</p>
          </a>
          
          <a href="#" className="rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors">
            <h3 className="font-semibold text-gray-800 mb-2">Operations Manual</h3>
            <p className="text-sm text-gray-500">Learn about day-to-day operational procedures</p>
          </a>
          
          <a href="#" className="rounded-lg border border-gray-200 bg-white p-4 shadow hover:border-[#AE9773] transition-colors">
            <h3 className="font-semibold text-gray-800 mb-2">Training Videos</h3>
            <p className="text-sm text-gray-500">Watch instructional videos on key processes</p>
          </a>
        </div>
      </div>
    </div>
  );
} 