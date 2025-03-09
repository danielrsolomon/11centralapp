'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function PersonalInfo() {
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    title: '',
    hire_date: '',
    employee_id: ''
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchUserData() {
      setIsLoading(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Fetch user data from the users table
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
            
          if (error) throw error
          
          if (data) {
            // Set the user data with values from database, fallback to empty strings
            setUserData({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              email: user.email || '',
              phone: data.phone || '',
              department: data.department || '',
              title: data.title || '',
              hire_date: data.hire_date || '',
              employee_id: data.employee_id || '',
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [supabase])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSave = async () => {
    setIsSaving(true)
    setFormError(null)
    setFormSuccess(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No authenticated user found')
      
      // Update user data in the users table
      const { error } = await supabase
        .from('users')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          department: userData.department,
          title: userData.title,
          hire_date: userData.hire_date,
          employee_id: userData.employee_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        
      if (error) throw error
      
      // Update user metadata in auth
      await supabase.auth.updateUser({
        data: { 
          full_name: `${userData.first_name} ${userData.last_name}`,
        }
      })
      
      setFormSuccess('Profile information updated successfully')
      setIsEditing(false)
    } catch (error: any) {
      setFormError(error.message || 'Failed to update profile information')
      console.error('Error updating profile information:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
    </div>
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
        
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-3 py-1.5 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              
              <button 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </button>
          )}
        </div>
      </div>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}
      
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{formSuccess}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          {isEditing ? (
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={userData.first_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.first_name || '-'}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          {isEditing ? (
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={userData.last_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.last_name || '-'}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-500">{userData.email || '-'}</p>
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              id="phone"
              name="phone"
              value={userData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
              placeholder="e.g. +1 (305) 555-1234"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.phone || '-'}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          {isEditing ? (
            <input
              type="text"
              id="department"
              name="department"
              value={userData.department}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.department || '-'}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title
          </label>
          {isEditing ? (
            <input
              type="text"
              id="title"
              name="title"
              value={userData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.title || '-'}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          {isEditing ? (
            <input
              type="date"
              id="hire_date"
              name="hire_date"
              value={userData.hire_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">
              {userData.hire_date 
                ? new Date(userData.hire_date).toLocaleDateString() 
                : '-'}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID
          </label>
          {isEditing ? (
            <input
              type="text"
              id="employee_id"
              name="employee_id"
              value={userData.employee_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black"
            />
          ) : (
            <p className="py-2 px-3 bg-gray-50 rounded-md text-gray-700 font-medium">{userData.employee_id || '-'}</p>
          )}
        </div>
      </div>
    </div>
  )
} 