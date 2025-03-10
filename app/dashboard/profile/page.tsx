'use client'

import { useState } from 'react'
import { User, UserIcon, Bell, Monitor, Lock, Settings } from 'lucide-react'
import PersonalInfo from '../../../components/profile/personal-info'
import NotificationPreferences from '../../../components/profile/notification-preferences'
import DisplaySettings from '../../../components/profile/display-settings'
import SecuritySettings from '../../../components/profile/security-settings'
import AccountSettings from '../../../components/profile/account-settings'
import AuthGuard from '@/components/auth/AuthGuard'
import ErrorBoundary from '@/components/ErrorBoundary'
import optimizedSupabase from '@/lib/supabase-optimized'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal-info')
  
  // Performance monitoring
  const perf = usePerformanceMonitoring('ProfilePage')

  const tabs = [
    {
      id: 'personal-info',
      label: 'Personal Information',
      icon: <User className="w-5 h-5 mr-2" />,
      component: <PersonalInfo />
    },
    {
      id: 'notification-preferences',
      label: 'Notification Preferences',
      icon: <Bell className="w-5 h-5 mr-2" />,
      component: <NotificationPreferences />
    },
    {
      id: 'display-settings',
      label: 'Display Settings',
      icon: <Monitor className="w-5 h-5 mr-2" />,
      component: <DisplaySettings />
    },
    {
      id: 'security-settings',
      label: 'Security',
      icon: <Lock className="w-5 h-5 mr-2" />,
      component: <SecuritySettings />
    },
    {
      id: 'account-settings',
      label: 'Account',
      icon: <Settings className="w-5 h-5 mr-2" />,
      component: <AccountSettings />
    }
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0]

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">User Profile</h1>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-white rounded-lg shadow border border-gray-200">
              <nav className="p-2">
                <ul>
                  {tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center w-full text-left px-4 py-3 rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-[#AE9773]/10 text-[#AE9773]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 p-6">
              {/* Current Tab Content */}
              {activeTabData.component}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
} 