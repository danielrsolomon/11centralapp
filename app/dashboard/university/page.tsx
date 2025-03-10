'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Book, BookOpen, Award, Clock, BarChart3, GraduationCap, CheckCircle } from 'lucide-react'
import supabase from '@/lib/supabase-optimized'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function UniversityDashboard() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [courseProgress, setCourseProgress] = useState({
    completed: 0,
    inProgress: 0,
    total: 0
  })
  
  // Performance monitoring
  const perf = usePerformanceMonitoring('UniversityDashboard')
  
  useEffect(() => {
    async function fetchUserData() {
      setLoading(true)
      
      // Start timing data fetch
      perf.startTiming('userData')
      
      try {
        logger.debug('Fetching user data for University Dashboard')
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Set user name
          if (user.user_metadata?.first_name) {
            setUserName(user.user_metadata.first_name)
            logger.debug('User name found in metadata', { 
              component: 'UniversityDashboard',
              context: { firstName: user.user_metadata.first_name }
            })
          }
          
          // For demo purposes - in a real implementation we'd fetch actual course data
          // In production, use the optimized client like:
          // const { data } = await supabase.from('user_program_progress').select('*').eq('user_id', user.id).execute()
          setCourseProgress({
            completed: 4,
            inProgress: 2,
            total: 12
          })
        }
      } catch (error) {
        logger.error('Error fetching user data for University Dashboard', error as Error)
      } finally {
        setLoading(false)
        // End timing data fetch
        perf.endTiming('userData')
      }
    }
    
    fetchUserData()
  }, [perf])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Training Portal Button */}
      <div className="mb-8 flex justify-end">
        <Link 
          href="/dashboard/university/training" 
          className="inline-flex items-center px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors"
        >
          <Book className="mr-2 h-4 w-4" />
          Go to Training Portal
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-800 mb-6">E11EVEN University</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Your Training</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">{courseProgress.completed}/{courseProgress.total}</p>
              <p className="text-sm text-gray-600">Modules Completed</p>
            </div>
            <div className="h-16 w-16 bg-[#AE9773]/10 rounded-full flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-[#AE9773]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#AE9773] h-2.5 rounded-full" 
                style={{ width: `${(courseProgress.completed / courseProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Recent Activity</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">{courseProgress.inProgress}</p>
              <p className="text-sm text-gray-600">Courses In Progress</p>
            </div>
            <div className="h-16 w-16 bg-[#AE9773]/10 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-[#AE9773]" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/university/training" className="text-[#AE9773] hover:underline text-sm font-medium flex items-center">
              Continue Learning
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
        
        {/* Achievements Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Achievements</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">3</p>
              <p className="text-sm text-gray-600">Badges Earned</p>
            </div>
            <div className="h-16 w-16 bg-[#AE9773]/10 rounded-full flex items-center justify-center">
              <Award className="h-8 w-8 text-[#AE9773]" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/university/achievements" className="text-[#AE9773] hover:underline text-sm font-medium flex items-center">
              View All Achievements
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick Access Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/dashboard/university/training" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <GraduationCap className="h-8 w-8 text-[#AE9773] mb-3" />
            <h3 className="font-medium text-gray-800">Training Portal</h3>
            <p className="text-sm text-gray-500 mt-1">Access all training modules</p>
          </Link>
          
          <Link 
            href="/dashboard/university/achievements" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <Award className="h-8 w-8 text-[#AE9773] mb-3" />
            <h3 className="font-medium text-gray-800">Achievements</h3>
            <p className="text-sm text-gray-500 mt-1">View your earned badges</p>
          </Link>
          
          <Link 
            href="/dashboard/university/content" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <BookOpen className="h-8 w-8 text-[#AE9773] mb-3" />
            <h3 className="font-medium text-gray-800">Content Management</h3>
            <p className="text-sm text-gray-500 mt-1">For admins and trainers</p>
          </Link>
          
          <Link 
            href="/dashboard/university/content" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <BarChart3 className="h-8 w-8 text-[#AE9773] mb-3" />
            <h3 className="font-medium text-gray-800">Reports</h3>
            <p className="text-sm text-gray-500 mt-1">View training analytics</p>
          </Link>
        </div>
      </div>
      
      {/* Recent Completions */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recently Completed</h2>
        
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="font-medium text-gray-800">Bartending Basics 101</p>
              <p className="text-xs text-gray-500">Completed 2 days ago</p>
            </div>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">100%</span>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="font-medium text-gray-800">Customer Service Excellence</p>
              <p className="text-xs text-gray-500">Completed 1 week ago</p>
            </div>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">100%</span>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="font-medium text-gray-800">VIP Guest Handling</p>
              <p className="text-xs text-gray-500">Completed 2 weeks ago</p>
            </div>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 