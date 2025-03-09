import Image from 'next/image'
import Link from 'next/link'
import { UserCircle2 } from 'lucide-react'

type ProgramCardProps = {
  id: string
  title: string
  description: string
  courseCount: number
  imageUrl: string
  progress: number
  lastActivity?: string
  instructors?: {
    name: string
    avatar?: string
  }[]
}

export default function ProgramCard({
  id,
  title,
  description,
  courseCount,
  imageUrl,
  progress,
  lastActivity,
  instructors
}: ProgramCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-md">
      <Link href={`/dashboard/university/program/${id}`}>
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{courseCount} Courses</span>
            <span className="text-sm font-medium text-gray-900">{progress}% Complete</span>
          </div>
          
          <h3 className="mb-2 truncate text-xl font-bold text-gray-900">{title}</h3>
          <p className="mb-4 line-clamp-2 text-sm text-gray-600">{description}</p>
          
          {/* Progress bar with improved contrast */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div 
              className={`h-full rounded-full ${
                progress === 100 ? 'bg-green-600' : 
                progress > 0 ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Instructors and Last Activity */}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {instructors && instructors.length > 0 ? (
                instructors.slice(0, 3).map((instructor, i) => (
                  <div key={i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white">
                    {instructor.avatar ? (
                      <Image 
                        src={instructor.avatar} 
                        alt={instructor.name} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <UserCircle2 className="h-full w-full text-gray-400" />
                    )}
                  </div>
                ))
              ) : (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-gray-200">
                  <UserCircle2 className="h-full w-full text-gray-400" />
                </div>
              )}
            </div>
            {lastActivity && (
              <span className="text-xs font-medium text-gray-700">
                Last activity on {new Date(lastActivity).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
} 