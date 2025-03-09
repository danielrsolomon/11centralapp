'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function NotificationPreferences() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  
  const [preferences, setPreferences] = useState({
    // Email notifications
    emailWeeklyNewsletter: false,
    emailAccountNotifications: true,
    emailMarketingNotifications: false,
    
    // Text notifications
    textAccountNotifications: false,
    textBookingConfirmations: true,
    textMarketingNotifications: false,
    
    // App notifications
    appNewMessages: true,
    appEventReminders: true,
    appReservationUpdates: true,
    appPromotionalAlerts: false
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchNotificationPreferences() {
      setIsLoading(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Get user preferences from Supabase
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            throw error
          }
          
          if (data) {
            setPreferences({
              emailWeeklyNewsletter: data.email_weekly_newsletter || false,
              emailAccountNotifications: data.email_account_notifications ?? true,
              emailMarketingNotifications: data.email_marketing_notifications || false,
              
              textAccountNotifications: data.text_account_notifications || false,
              textBookingConfirmations: data.text_booking_confirmations ?? true,
              textMarketingNotifications: data.text_marketing_notifications || false,
              
              appNewMessages: data.app_new_messages ?? true,
              appEventReminders: data.app_event_reminders ?? true,
              appReservationUpdates: data.app_reservation_updates ?? true,
              appPromotionalAlerts: data.app_promotional_alerts || false
            })
          }
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchNotificationPreferences()
  }, [supabase])
  
  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setPreferences(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)
    setFormSuccess(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No authenticated user found')
      
      // Convert camelCase to snake_case for database columns
      const dbData = {
        user_id: user.id,
        email_weekly_newsletter: preferences.emailWeeklyNewsletter,
        email_account_notifications: preferences.emailAccountNotifications,
        email_marketing_notifications: preferences.emailMarketingNotifications,
        text_account_notifications: preferences.textAccountNotifications,
        text_booking_confirmations: preferences.textBookingConfirmations,
        text_marketing_notifications: preferences.textMarketingNotifications,
        app_new_messages: preferences.appNewMessages,
        app_event_reminders: preferences.appEventReminders,
        app_reservation_updates: preferences.appReservationUpdates,
        app_promotional_alerts: preferences.appPromotionalAlerts,
        updated_at: new Date().toISOString()
      }
      
      // Check if preferences record exists
      const { data, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      let error
      
      if (data) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update(dbData)
          .eq('user_id', user.id)
        
        error = updateError
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert([dbData])
        
        error = insertError
      }
      
      if (error) throw error
      
      setFormSuccess('Notification preferences updated successfully')
    } catch (error: any) {
      setFormError(error.message || 'Failed to update notification preferences')
      console.error('Error updating notification preferences:', error)
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
        <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-[#AE9773] text-white rounded-md hover:bg-[#9e866a] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
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
      
      <form onSubmit={handleSave}>
        <div className="space-y-8">
          {/* Email Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailWeeklyNewsletter"
                    name="emailWeeklyNewsletter"
                    type="checkbox"
                    checked={preferences.emailWeeklyNewsletter}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailWeeklyNewsletter" className="font-medium text-gray-700">Weekly Newsletter</label>
                  <p className="text-gray-500">Get updates about upcoming events and promotions</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailAccountNotifications"
                    name="emailAccountNotifications"
                    type="checkbox"
                    checked={preferences.emailAccountNotifications}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailAccountNotifications" className="font-medium text-gray-700">Account Notifications</label>
                  <p className="text-gray-500">Important information about your account, reservations, and purchases</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailMarketingNotifications"
                    name="emailMarketingNotifications"
                    type="checkbox"
                    checked={preferences.emailMarketingNotifications}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailMarketingNotifications" className="font-medium text-gray-700">Marketing Emails</label>
                  <p className="text-gray-500">Special offers, promotions, and marketing updates</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Text Message Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Text Message Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="textAccountNotifications"
                    name="textAccountNotifications"
                    type="checkbox"
                    checked={preferences.textAccountNotifications}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="textAccountNotifications" className="font-medium text-gray-700">Account Alerts</label>
                  <p className="text-gray-500">Security alerts and important account notifications</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="textBookingConfirmations"
                    name="textBookingConfirmations"
                    type="checkbox"
                    checked={preferences.textBookingConfirmations}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="textBookingConfirmations" className="font-medium text-gray-700">Booking Confirmations</label>
                  <p className="text-gray-500">Receive text confirmations for your reservations and bookings</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="textMarketingNotifications"
                    name="textMarketingNotifications"
                    type="checkbox"
                    checked={preferences.textMarketingNotifications}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="textMarketingNotifications" className="font-medium text-gray-700">Marketing Messages</label>
                  <p className="text-gray-500">Special deals and promotional messages via SMS</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* App Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">App Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="appNewMessages"
                    name="appNewMessages"
                    type="checkbox"
                    checked={preferences.appNewMessages}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="appNewMessages" className="font-medium text-gray-700">New Messages</label>
                  <p className="text-gray-500">Be notified when you receive new messages</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="appEventReminders"
                    name="appEventReminders"
                    type="checkbox"
                    checked={preferences.appEventReminders}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="appEventReminders" className="font-medium text-gray-700">Event Reminders</label>
                  <p className="text-gray-500">Reminders about upcoming events and reservations</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="appReservationUpdates"
                    name="appReservationUpdates"
                    type="checkbox"
                    checked={preferences.appReservationUpdates}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="appReservationUpdates" className="font-medium text-gray-700">Reservation Updates</label>
                  <p className="text-gray-500">Notifications about changes to your reservations</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="appPromotionalAlerts"
                    name="appPromotionalAlerts"
                    type="checkbox"
                    checked={preferences.appPromotionalAlerts}
                    onChange={handleToggleChange}
                    className="focus:ring-[#AE9773] h-4 w-4 text-[#AE9773] border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="appPromotionalAlerts" className="font-medium text-gray-700">Promotional Alerts</label>
                  <p className="text-gray-500">Special offers and promotional content</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
} 