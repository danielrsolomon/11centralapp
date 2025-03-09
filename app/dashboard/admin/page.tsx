'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Building, 
  FileText, 
  AlertTriangle, 
  Settings as SettingsIcon,
  BarChart,
  Calendar,
  ShieldAlert
} from 'lucide-react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      setLoading(true)
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        // In development, always treat as admin
        // In production, this would check against the database
        console.log('Admin check - setting isAdmin to true for testing purposes')

        setIsAdmin(true)
      } catch (error) {
        console.error('Error checking admin status:', error)
        // Still set as admin in dev mode even if there's an error
        setIsAdmin(true)
      } finally {
        setLoading(false)
      }
    }
    
    checkAdminStatus()
  }, [router, supabase])

  const tabs = [
    {
      id: 'users',
      label: 'User Management',
      icon: <Users className="w-5 h-5 mr-2" />,
      description: 'Manage users, roles, and permissions. Add or edit departments and assign them to venues.'
    },
    {
      id: 'venues',
      label: 'Venue Management',
      icon: <Building className="w-5 h-5 mr-2" />,
      description: 'Configure venues, locations, floor plans, and venue-specific settings.'
    },
    {
      id: 'system',
      label: 'System Settings',
      icon: <SettingsIcon className="w-5 h-5 mr-2" />,
      description: 'Global application settings, branding, and integration configurations.'
    },
    {
      id: 'security',
      label: 'Security & Compliance',
      icon: <ShieldAlert className="w-5 h-5 mr-2" />,
      description: 'Security settings, audit logs, and compliance tools.'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Router will handle redirect
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Settings</h1>
        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>Administrator Mode</span>
        </div>
      </div>
      
      {/* Tabs - Horizontal layout for all screen sizes */}
      <div className="overflow-x-auto mb-4 border-b border-gray-200">
        <div className="flex whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 transition-colors border-b-2 ${
                activeTab === tab.id 
                ? 'border-[#AE9773] text-[#AE9773] font-medium' 
                : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h2>
          <p className="text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
        
        {/* Placeholder for actual admin functionality */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <p className="text-gray-700 mb-2">This section is under development</p>
          <p className="text-gray-500 text-sm">The {tabs.find(tab => tab.id === activeTab)?.label.toLowerCase()} functionality will be implemented soon.</p>
        </div>
      </div>
    </div>
  )
} 