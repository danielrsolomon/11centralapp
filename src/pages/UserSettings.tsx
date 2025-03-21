import { Settings } from 'lucide-react';

export default function UserSettings() {
  return (
    <div className="container max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Settings className="h-10 w-10 text-gold-light" />
        <h1 className="text-3xl font-bold">User Settings</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <p className="text-lg text-gray-600 mb-6">
          Manage your personal settings, preferences, notification settings, and account security.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">Profile Information</h3>
            <p className="text-gray-600 mb-4">Update your personal information and contact details</p>
            <button className="px-4 py-2 rounded-md bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors">
              Edit Profile
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">Notification Preferences</h3>
            <p className="text-gray-600 mb-4">Manage how and when you receive alerts and notifications</p>
            <button className="px-4 py-2 rounded-md bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors">
              Configure
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">Security</h3>
            <p className="text-gray-600 mb-4">Change your password and manage multi-factor authentication</p>
            <button className="px-4 py-2 rounded-md bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors">
              Security Settings
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">App Preferences</h3>
            <p className="text-gray-600 mb-4">Customize your app experience and default settings</p>
            <button className="px-4 py-2 rounded-md bg-[#AE9773] text-white hover:bg-[#8A7859] transition-colors">
              Customize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 