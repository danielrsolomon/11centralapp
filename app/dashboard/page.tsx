export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Your Training</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">4/12</p>
              <p className="text-sm text-gray-600">Modules Completed</p>
            </div>
            <div className="h-12 w-12 bg-[#AE9773]/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#AE9773]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Upcoming Shifts</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">3</p>
              <p className="text-sm text-gray-600">This Week</p>
            </div>
            <div className="h-12 w-12 bg-[#AE9773]/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#AE9773]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-2">Recent Tips</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold text-[#AE9773]">$246</p>
              <p className="text-sm text-gray-600">Last 7 Days</p>
            </div>
            <div className="h-12 w-12 bg-[#AE9773]/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#AE9773]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Announcements</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-[#AE9773] pl-4">
              <h3 className="font-medium text-gray-800">New Training Modules Available</h3>
              <p className="text-sm text-gray-600">2 days ago</p>
              <p className="mt-1 text-gray-700">New bartending technique modules have been added to your training program.</p>
            </div>
            <div className="border-l-4 border-[#AE9773] pl-4">
              <h3 className="font-medium text-gray-800">Schedule Changes</h3>
              <p className="text-sm text-gray-600">5 days ago</p>
              <p className="mt-1 text-gray-700">The schedule for next week has been updated. Please check your shifts.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Your Schedule</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">Friday, July 7</p>
                <p className="text-sm text-gray-600">8:00 PM - 4:00 AM</p>
              </div>
              <span className="px-2 py-1 bg-[#AE9773]/20 text-[#AE9773] rounded text-xs font-medium">
                Bar Staff
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">Saturday, July 8</p>
                <p className="text-sm text-gray-600">9:00 PM - 5:00 AM</p>
              </div>
              <span className="px-2 py-1 bg-[#AE9773]/20 text-[#AE9773] rounded text-xs font-medium">
                Bar Staff
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">Sunday, July 9</p>
                <p className="text-sm text-gray-600">8:00 PM - 2:00 AM</p>
              </div>
              <span className="px-2 py-1 bg-[#AE9773]/20 text-[#AE9773] rounded text-xs font-medium">
                Bar Staff
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 