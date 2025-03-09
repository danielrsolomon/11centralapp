'use client'

import { useState } from 'react'
import { User, UserIcon, Bell, Monitor, Lock, Settings } from 'lucide-react'
import PersonalInfo from '../../../components/profile/personal-info'
import NotificationPreferences from '../../../components/profile/notification-preferences'
import DisplaySettings from '../../../components/profile/display-settings'
import SecuritySettings from '../../../components/profile/security-settings'
import AccountSettings from '../../../components/profile/account-settings'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal-info')

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
      label: 'Account Settings',
      icon: <Settings className="w-5 h-5 mr-2" />,
      component: <AccountSettings />
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
      
      {/* Mobile Tabs - Horizontal Scrolling (visible on mobile only) */}
      <div className="md:hidden overflow-x-auto mb-4">
        <div className="flex whitespace-nowrap border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 transition-colors border-b-2 ${
                activeTab === tab.id 
                ? 'border-[#AE9773] text-[#AE9773] font-medium' 
                : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation - Hidden on Mobile */}
        <aside className="hidden md:block w-64 bg-white rounded-lg shadow-sm border border-gray-200">
          <nav className="p-4">
            <ul className="space-y-1">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-2 rounded-md text-left transition-colors ${
                      activeTab === tab.id 
                      ? 'bg-[#AE9773]/10 text-[#AE9773] font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  )
} 