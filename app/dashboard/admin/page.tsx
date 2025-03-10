'use client'

import { useState } from 'react'
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
import AuthGuard from '@/components/auth/AuthGuard'
import ErrorBoundary from '@/components/ErrorBoundary'
import optimizedSupabase from '@/lib/supabase-optimized'
import logger from '@/lib/logger'
import usePerformanceMonitoring from '@/lib/hooks/usePerformanceMonitoring'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')
  
  // Performance monitoring
  const perf = usePerformanceMonitoring('AdminPage')

  const tabs = [
    {
      id: 'users',
      label: 'User Management',
      icon: <Users className="w-5 h-5 mr-2" />,
      description: 'Manage users, roles, permissions, and departments'
    },
    {
      id: 'venues',
      label: 'Venue Management',
      icon: <Building className="w-5 h-5 mr-2" />,
      description: 'Configure venues, locations, floor plans, and venue-specific settings'
    },
    {
      id: 'system',
      label: 'System Settings',
      icon: <SettingsIcon className="w-5 h-5 mr-2" />,
      description: 'Configure application branding, notifications, and integrations'
    },
    {
      id: 'security',
      label: 'Security & Compliance',
      icon: <ShieldAlert className="w-5 h-5 mr-2" />,
      description: 'Access security settings, audit logs, and compliance tools'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart className="w-5 h-5 mr-2" />,
      description: 'View usage reports, metrics, and business analytics'
    },
    {
      id: 'schedules',
      label: 'Global Schedules',
      icon: <Calendar className="w-5 h-5 mr-2" />,
      description: 'Configure organization-wide schedules and calendar settings'
    },
    {
      id: 'documents',
      label: 'Document Library',
      icon: <FileText className="w-5 h-5 mr-2" />,
      description: 'Manage global document templates, policies, and procedures'
    }
  ]

  return (
    <AuthGuard requiredRoles={['admin']}>
      <ErrorBoundary>
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Settings</h1>
          
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md mb-6 flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Admin Area</p>
              <p className="text-sm">
                Changes made here will affect the entire application. Proceed with caution.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                  activeTab === tab.id ? 'ring-2 ring-[#AE9773] ring-opacity-50' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className={`p-2 rounded-full ${activeTab === tab.id ? 'bg-[#AE9773]/20 text-[#AE9773]' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.icon}
                  </div>
                  <h3 className="ml-3 font-medium text-gray-800">{tab.label}</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 text-sm">{tab.description}</p>
                  <div className="mt-4 flex justify-end">
                    <button 
                      className={`px-4 py-1.5 text-sm rounded ${
                        activeTab === tab.id 
                          ? 'bg-[#AE9773] text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {activeTab === tab.id ? 'Manage' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Future enhancement: Content for each tab */}
          <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-6">
            <p className="text-center text-gray-500">
              Select a module above to manage its settings. Additional admin functionality will be added in future updates.
            </p>
          </div>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
} 