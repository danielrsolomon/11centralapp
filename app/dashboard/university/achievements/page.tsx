'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { Award, Medal, Trophy, Star } from 'lucide-react'

type Achievement = {
  id: string
  title: string
  description: string
  icon: 'award' | 'medal' | 'trophy' | 'star'
  unlockedAt?: string
  isUnlocked: boolean
}

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchAchievements() {
      setLoading(true)
      
      try {
        // In a real implementation, we'd fetch from the database
        // For now, we'll use dummy data
        const dummyAchievements: Achievement[] = [
          {
            id: '1',
            title: 'First Steps',
            description: 'Complete your first training module',
            icon: 'award',
            unlockedAt: '2023-10-15T14:30:00Z',
            isUnlocked: true
          },
          {
            id: '2',
            title: 'Quick Learner',
            description: 'Complete 5 training modules',
            icon: 'medal',
            unlockedAt: '2023-11-01T10:15:00Z',
            isUnlocked: true
          },
          {
            id: '3',
            title: 'Knowledge Master',
            description: 'Complete all bartending training modules',
            icon: 'trophy',
            unlockedAt: '2023-11-10T16:45:00Z',
            isUnlocked: true
          },
          {
            id: '4',
            title: 'Perfect Score',
            description: 'Score 100% on any assessment',
            icon: 'star',
            isUnlocked: false
          },
          {
            id: '5',
            title: 'Dedicated Learner',
            description: 'Log in to the training portal for 7 consecutive days',
            icon: 'medal',
            isUnlocked: false
          },
          {
            id: '6',
            title: 'Training Champion',
            description: 'Complete all available training modules',
            icon: 'trophy',
            isUnlocked: false
          }
        ]
        
        setAchievements(dummyAchievements)
      } catch (error) {
        console.error('Error fetching achievements:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAchievements()
  }, [supabase])
  
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'award':
        return <Award className="h-8 w-8" />
      case 'medal':
        return <Medal className="h-8 w-8" />
      case 'trophy':
        return <Trophy className="h-8 w-8" />
      case 'star':
        return <Star className="h-8 w-8" />
      default:
        return <Award className="h-8 w-8" />
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    )
  }
  
  const unlockedAchievements = achievements.filter(a => a.isUnlocked)
  const lockedAchievements = achievements.filter(a => !a.isUnlocked)
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Achievements</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center">
          <div className="h-16 w-16 bg-[#AE9773]/10 rounded-full flex items-center justify-center mr-4">
            <Trophy className="h-8 w-8 text-[#AE9773]" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-800">Your Progress</h2>
            <p className="text-gray-600">You've unlocked {unlockedAchievements.length} out of {achievements.length} achievements</p>
          </div>
          <div className="ml-auto">
            <div className="text-3xl font-bold text-[#AE9773]">{Math.round((unlockedAchievements.length / achievements.length) * 100)}%</div>
          </div>
        </div>
      </div>
      
      {/* Unlocked Achievements */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Unlocked Achievements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {unlockedAchievements.length === 0 ? (
          <div className="col-span-3 bg-white p-8 rounded-lg text-center">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800">No achievements yet</h3>
            <p className="text-gray-500">Complete trainings to earn your first achievement.</p>
          </div>
        ) : (
          unlockedAchievements.map(achievement => (
            <div key={achievement.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-[#AE9773]/10 rounded-full flex items-center justify-center mr-3">
                  <div className="text-[#AE9773]">{getIcon(achievement.icon)}</div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{achievement.title}</h3>
                  <p className="text-xs text-gray-500">
                    Unlocked on {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{achievement.description}</p>
            </div>
          ))
        )}
      </div>
      
      {/* Locked Achievements */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Locked Achievements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lockedAchievements.length === 0 ? (
          <div className="col-span-3 bg-white p-8 rounded-lg text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800">All achievements unlocked!</h3>
            <p className="text-gray-500">Congratulations! You've unlocked all available achievements.</p>
          </div>
        ) : (
          lockedAchievements.map(achievement => (
            <div key={achievement.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 opacity-60">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <div className="text-gray-400">{getIcon(achievement.icon)}</div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{achievement.title}</h3>
                  <p className="text-xs text-gray-500">Locked</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{achievement.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 