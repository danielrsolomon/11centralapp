import { Trophy, Medal, Award, Star, Search, Users } from 'lucide-react';

// Mock achievements data
const achievements = [
  {
    id: 1,
    title: 'Customer Service Pro',
    description: 'Completed the customer service excellence training program',
    date: 'May 15, 2023',
    icon: <Medal className="h-5 w-5 text-[#AE9773]" />,
    category: 'Training',
    points: 50
  },
  {
    id: 2,
    title: 'Team Player',
    description: 'Covered 5 shifts for team members in one month',
    date: 'June 3, 2023',
    icon: <Users className="h-5 w-5 text-[#AE9773]" />,
    category: 'Collaboration',
    points: 25
  },
  {
    id: 3,
    title: 'Perfect Attendance',
    description: 'No absences for 3 consecutive months',
    date: 'July 1, 2023',
    icon: <Award className="h-5 w-5 text-[#AE9773]" />,
    category: 'Reliability',
    points: 30
  },
  {
    id: 4,
    title: 'VIP Specialist',
    description: 'Successfully completed VIP guest relations training',
    date: 'August 12, 2023',
    icon: <Star className="h-5 w-5 text-[#AE9773]" />,
    category: 'Training',
    points: 40
  }
];

export default function Achievements() {
  return (
    <div className="space-y-6 p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">Achievements</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search achievements..." 
            className="rounded-md bg-white border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 w-[200px] focus:outline-none focus:ring-1 focus:ring-[#AE9773]"
          />
        </div>
      </div>
      
      {/* Achievement Summary */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10">
              <Trophy className="h-6 w-6 text-[#AE9773]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Achievements</p>
              <p className="text-2xl font-semibold text-gray-800">7</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10">
              <Star className="h-6 w-6 text-[#AE9773]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Achievement Points</p>
              <p className="text-2xl font-semibold text-gray-800">235</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#AE9773]/10">
              <Award className="h-6 w-6 text-[#AE9773]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Achievement</p>
              <p className="text-lg font-semibold text-gray-800">Course Creator</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* My Achievements */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Achievements</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#AE9773]/10">
                {achievement.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-800">{achievement.title}</h3>
                  <span className="text-xs text-[#AE9773] px-2 py-1 rounded-full bg-[#AE9773]/10">+{achievement.points} pts</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{achievement.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Earned: {achievement.date}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{achievement.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Available Achievements */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Achievements</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                <Trophy className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">+60 pts</span>
            </div>
            <h3 className="font-semibold text-gray-800">Master Bartender</h3>
            <p className="text-sm text-gray-500 mt-1">Complete all bartending training modules</p>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Progress: 3/5 modules</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-[#AE9773] h-full rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                <Star className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">+50 pts</span>
            </div>
            <h3 className="font-semibold text-gray-800">Gratuity Expert</h3>
            <p className="text-sm text-gray-500 mt-1">Process 100 gratuity transactions</p>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Progress: 78/100 transactions</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-[#AE9773] h-full rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                <Medal className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">+75 pts</span>
            </div>
            <h3 className="font-semibold text-gray-800">Course Creator</h3>
            <p className="text-sm text-gray-500 mt-1">Create and publish a training course</p>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Progress: 1/3 steps</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-[#AE9773] h-full rounded-full" style={{ width: '33%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 