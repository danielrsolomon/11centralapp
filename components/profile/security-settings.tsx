'use client'

import { useState } from 'react'
import { Eye, EyeOff, Shield, Key, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  
  const supabase = createClient()
  
  const validatePasswords = () => {
    if (!currentPassword) {
      setFormError('Current password is required')
      return false
    }
    
    if (!newPassword) {
      setFormError('New password is required')
      return false
    }
    
    if (newPassword !== confirmPassword) {
      setFormError('New passwords do not match')
      return false
    }
    
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters long')
      return false
    }
    
    // Password strength check (at least one uppercase, one lowercase, one number)
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setFormError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      return false
    }
    
    return true
  }
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    
    if (!validatePasswords()) return
    
    setIsLoading(true)
    
    try {
      // In a real implementation, you would first verify the current password
      // with a custom server endpoint before allowing the password change
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      setFormSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setFormError(error.message || 'Failed to change password')
      console.error('Error changing password:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleMfa = async () => {
    // This is a placeholder for MFA toggle functionality
    // In a real implementation, this would initiate MFA setup or removal
    setShowMfaSetup(!showMfaSetup)
  }
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Security Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your password and account security options</p>
      </div>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}
      
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
          {formSuccess}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <Key className="h-5 w-5 text-[#AE9773] mr-2" />
          <h3 className="text-lg font-medium text-gray-800">Change Password</h3>
        </div>
        
        <form onSubmit={handleChangePassword}>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long and include uppercase, lowercase, and numbers
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-[#AE9773] mr-2" />
          <h3 className="text-lg font-medium text-gray-800">Two-Factor Authentication</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Adding two-factor authentication is a great way to secure your account.
            When enabled, you'll need both your password and an authentication code to sign in.
          </p>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <p className="font-medium text-gray-700">Two-Factor Authentication</p>
            <p className="text-sm text-gray-500">
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMfa}
            className={`px-4 py-2 rounded-md transition-colors ${
              mfaEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
        
        {showMfaSetup && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">Setup Two-Factor Authentication</h4>
            <p className="text-sm text-gray-600 mb-4">
              This is a placeholder for the MFA setup flow. In a real implementation, this would include:
            </p>
            <ol className="list-decimal ml-5 text-sm text-gray-600 space-y-1">
              <li>QR code to scan with an authenticator app</li>
              <li>Backup codes for account recovery</li>
              <li>Verification of the setup with a test code</li>
            </ol>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setMfaEnabled(!mfaEnabled);
                  setShowMfaSetup(false);
                }}
                className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors"
              >
                {mfaEnabled ? 'Disable 2FA' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <h4 className="font-medium text-gray-800 mb-2">Recent Security Activity</h4>
          <div className="text-sm text-gray-600">
            <p className="py-2 border-b border-gray-100">
              Last login: Today at 10:30 AM from Miami, FL
            </p>
            <p className="py-2 border-b border-gray-100">
              Password changed: 30 days ago
            </p>
            <p className="py-2">
              Email verified: Yes
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 