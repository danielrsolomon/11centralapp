'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function DisplaySettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  
  const [settings, setSettings] = useState({
    language: 'english',
    theme: 'system',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    colorBlindMode: 'none'
  })
  
  const supabase = createClient()
  
  // Fetch user display settings
  useEffect(() => {
    async function fetchDisplaySettings() {
      setIsLoading(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && user.user_metadata?.display_settings) {
          setSettings(user.user_metadata.display_settings)
        }
      } catch (error) {
        console.error('Error fetching display settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDisplaySettings()
  }, [supabase.auth])
  
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setSettings(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    setFormError(null)
    setFormSuccess(null)
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_settings: settings
        }
      })
      
      if (error) throw error
      
      setFormSuccess("Display settings updated successfully!")
      
      // Apply settings to the app (in a real app, this would update the theme, font size, etc.)
      // For now, we'll just log the updated settings
      console.log('Applied settings:', settings)
    } catch (error) {
      setFormError("Failed to update display settings. Please try again.")
      console.error('Error updating display settings:', error)
    } finally {
      setSaveLoading(false)
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
        <h2 className="text-xl font-semibold text-gray-800">Display Settings</h2>
        <button 
          onClick={handleSave}
          disabled={saveLoading}
          className="px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors disabled:opacity-50"
        >
          {saveLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {formError}
        </div>
      )}
      
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
          {formSuccess}
        </div>
      )}
      
      <form onSubmit={handleSave}>
        <div className="space-y-6">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              id="language"
              name="language"
              value={settings.language}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black font-medium"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="portuguese">Portuguese</option>
              <option value="arabic">Arabic</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Select your preferred language for the platform interface.</p>
          </div>
          
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
              Theme
            </label>
            <select
              id="theme"
              name="theme"
              value={settings.theme}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black font-medium"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Choose your preferred color theme for the application.</p>
          </div>
          
          <div>
            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select
              id="fontSize"
              name="fontSize"
              value={settings.fontSize}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black font-medium"
            >
              <option value="small">Small</option>
              <option value="medium">Medium (Default)</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Adjust the text size for better readability.</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Accessibility Options</h3>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="reducedMotion"
                    name="reducedMotion"
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={handleCheckboxChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="reducedMotion" className="text-sm font-medium text-gray-700">Reduced Motion</label>
                  <p className="text-xs text-gray-500">Minimize animations throughout the interface</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="highContrast"
                    name="highContrast"
                    type="checkbox"
                    checked={settings.highContrast}
                    onChange={handleCheckboxChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="highContrast" className="text-sm font-medium text-gray-700">High Contrast</label>
                  <p className="text-xs text-gray-500">Increase contrast for better visibility</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="colorBlindMode" className="block text-sm font-medium text-gray-700 mb-1">
              Color Blind Mode
            </label>
            <select
              id="colorBlindMode"
              name="colorBlindMode"
              value={settings.colorBlindMode}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#AE9773] focus:border-transparent text-black font-medium"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
              <option value="achromatopsia">Achromatopsia</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Adjust colors to accommodate different types of color vision deficiencies.</p>
          </div>
        </div>
      </form>
      
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Display Settings Preview</h3>
        <p className="text-xs text-gray-500">
          Theme: <span className="font-medium">{settings.theme === 'system' ? 'System Default' : settings.theme === 'light' ? 'Light' : 'Dark'}</span><br />
          Font Size: <span className="font-medium">{settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}</span><br />
          Language: <span className="font-medium">{settings.language.charAt(0).toUpperCase() + settings.language.slice(1)}</span><br />
          Accessibility: <span className="font-medium">
            {settings.reducedMotion ? 'Reduced Motion, ' : ''}
            {settings.highContrast ? 'High Contrast, ' : ''}
            {settings.colorBlindMode !== 'none' ? `Color Blind Mode (${settings.colorBlindMode})` : 'Standard Colors'}
          </span>
        </p>
      </div>
    </div>
  )
} 