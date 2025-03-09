'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, LogOut, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AccountSettings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Redirect to login page
      router.push('/login')
    } catch (error: any) {
      setError(error.message || 'Error signing out')
      setIsLoggingOut(false)
    }
  }
  
  const exportAccountData = async () => {
    setIsExporting(true)
    setError(null)
    
    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("No authenticated user found")
      
      // Get user-specific data (customize this query based on your data structure)
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userDataError) throw userDataError
      
      // Add additional data fetching for other tables if needed
      
      // Combine all user data
      const exportData = {
        profile: userData,
        auth: {
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        },
        // Add other data categories as needed
      }
      
      // Convert to JSON and create download
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `e11even-account-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error: any) {
      setError(error.message || 'Failed to export account data')
      console.error('Error exporting account data:', error)
    } finally {
      setIsExporting(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion')
      return
    }
    
    setIsDeleting(true)
    setError(null)
    
    try {
      // In a real implementation, you would need server-side code to:
      // 1. Delete the user's data from all related tables
      // 2. Delete the user's auth record
      
      // For this example, we'll just sign the user out
      // This is a placeholder - real deletion would require server functions
      await supabase.auth.signOut()
      
      router.push('/login?deleted=true')
    } catch (error: any) {
      setError(error.message || 'Failed to delete account')
      console.error('Error deleting account:', error)
      setIsDeleting(false)
    }
  }
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Account Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your account preferences and data</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Download className="h-5 w-5 text-[#AE9773] mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Export Your Data</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Download a copy of your personal data. This file will include your profile information and account preferences.
          </p>
          
          <button
            onClick={exportAccountData}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Preparing Download...' : 'Export Account Data'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <LogOut className="h-5 w-5 text-[#AE9773] mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Sign Out</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Sign out from all devices. You will need to sign in again to access your account.
          </p>
          
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-600">Delete Account</h3>
          </div>
          
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-700 flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> Deleting your account is permanent. All your data will be permanently removed and cannot be recovered.
              </span>
            </p>
          </div>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                To confirm, please type <strong>DELETE</strong> in the field below:
              </p>
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-black"
                placeholder="Type DELETE to confirm"
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:hover:bg-red-600 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 