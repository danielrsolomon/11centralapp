'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { 
  Menu, 
  LogOut, 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Shield, 
  ChevronDown, 
  UserCircle, 
  Settings,
  ChevronRight,
  Grid,
  GraduationCap,
  Trophy,
  FileText,
  Repeat,
  Clock,
  Map,
  MessageSquare
} from 'lucide-react'

// Import the logo directly to ensure it's statically analyzed
import goldLogo from '../../public/gold-logo.png'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('User')
  const [userLastName, setUserLastName] = useState('')
  const [selectedVenue, setSelectedVenue] = useState('E11EVEN Miami')
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['university', 'schedule'])
  const router = useRouter()
  const supabase = createClient()
  const pathname = usePathname()
  
  // Sample venues - in a real app, these would come from the API/database
  const venues = [
    'E11EVEN Miami',
    'E11EVEN Dayclub',
    'E11EVEN Lobby Bar Miami',
    'E11EVEN Speakeasy Miami',
    'E11EVEN Sportsbook',
    'Gold Rush Miami'
  ]
  
  // Fetch user data when component mounts
  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.first_name) {
        setUserName(user.user_metadata.first_name)
      }
      if (user?.user_metadata?.last_name) {
        setUserLastName(user.user_metadata.last_name)
      }
      
      // Check if user has admin role
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user?.id)
          .single()
          
        console.log('Admin check query result:', { data, error, userId: user?.id })
        
        if (data && data.role === 'admin') {
          setIsAdmin(true)
          console.log('User is an admin')
        } else {
          console.log('User is not an admin:', data?.role)
          // Force admin role for testing (remove in production)
          setIsAdmin(true)
          console.log('Admin role forced for testing')
        }
        
        // Automatically expand sections that have content management for admins
        setExpandedSections(['university', 'schedule'])
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
    
    getUserData()
  }, [supabase.auth])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isVenueDropdownOpen) {
        setIsVenueDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVenueDropdownOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  // Get user initials for the avatar
  const getInitials = () => {
    if (userName === 'User') return 'UN';
    
    const firstInitial = userName.charAt(0);
    const lastInitial = userLastName ? userLastName.charAt(0) : '';
    
    return `${firstInitial}${lastInitial}`;
  }

  const handleVenueSelect = (venue: string) => {
    setSelectedVenue(venue)
    setIsVenueDropdownOpen(false)
    // In a real app, you would update the context or fetch data for the selected venue
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    )
  }

  const isExpanded = (section: string) => expandedSections.includes(section)

  const isActive = (path: string) => pathname === path
  
  const isChildActive = (childPaths: string[]) => {
    return childPaths.some(path => pathname?.startsWith(path))
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Gold line at the top of the page - even thinner */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#AE9773] z-50"></div>
      
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'
        } fixed lg:static inset-y-0 left-0 z-40 bg-black transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-64 border-r border-[#AE9773]`}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b border-[#AE9773]">
          <Link href="/dashboard" className="flex items-center justify-center">
            <Image
              src={goldLogo}
              alt="E11EVEN Central"
              width={195}
              height={52}
              className="max-h-14 w-auto"
              priority
            />
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute right-4 lg:hidden text-white hover:text-gray-300"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            <NavItem href="/dashboard" icon={<LayoutDashboard className="mr-3 h-5 w-5" />}>
              Dashboard
            </NavItem>
            
            <NavItem href="/dashboard/connect" icon={<MessageSquare className="mr-3 h-5 w-5" />}>
              11Central Connect
            </NavItem>
            
            {/* E11EVEN University with dropdown */}
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('university')}
                className={`w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md 
                  ${isActive('/dashboard/university') || isChildActive(['/dashboard/university/']) 
                    ? 'bg-gray-900 text-[#AE9773]' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'}`}
              >
                <div className="flex items-center">
                  <BookOpen className="mr-3 h-5 w-5" />
                  <span>E11EVEN University</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded('university') ? 'rotate-90' : ''}`} />
              </button>
              
              {isExpanded('university') && (
                <div className="ml-6 space-y-1">
                  <NavItem href="/dashboard/university" icon={<Grid className="h-4 w-4 mr-3" />} isSubmenu>
                    Dashboard
                  </NavItem>
                  <NavItem href="/dashboard/university/training" icon={<GraduationCap className="h-4 w-4 mr-3" />} isSubmenu>
                    Training Portal
                  </NavItem>
                  <NavItem href="/dashboard/university/achievements" icon={<Trophy className="h-4 w-4 mr-3" />} isSubmenu>
                    Achievements
                  </NavItem>
                  {isAdmin && (
                    <NavItem href="/dashboard/university/content" icon={<FileText className="h-4 w-4 mr-3" />} isSubmenu>
                      Content Management
                    </NavItem>
                  )}
                </div>
              )}
            </div>

            {/* Scheduling Hub with dropdown */}
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('schedule')}
                className={`w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md 
                  ${isActive('/dashboard/schedule') || isChildActive(['/dashboard/schedule/']) 
                    ? 'bg-gray-900 text-[#AE9773]' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'}`}
              >
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5" />
                  <span>Scheduling Hub</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded('schedule') ? 'rotate-90' : ''}`} />
              </button>
              
              {isExpanded('schedule') && (
                <div className="ml-6 space-y-1">
                  <NavItem href="/dashboard/schedule" icon={<Calendar className="h-4 w-4 mr-3" />} isSubmenu>
                    Schedules
                  </NavItem>
                  <NavItem href="/dashboard/schedule/swaps" icon={<Repeat className="h-4 w-4 mr-3" />} isSubmenu>
                    Schedule Swaps
                  </NavItem>
                  <NavItem href="/dashboard/schedule/time-off" icon={<Clock className="h-4 w-4 mr-3" />} isSubmenu>
                    Time Off Requests
                  </NavItem>
                  <NavItem href="/dashboard/schedule/floorplans" icon={<Map className="h-4 w-4 mr-3" />} isSubmenu>
                    Floor Plans
                  </NavItem>
                  {isAdmin && (
                    <NavItem href="/dashboard/schedule/content" icon={<FileText className="h-4 w-4 mr-3" />} isSubmenu>
                      Content Management
                    </NavItem>
                  )}
                </div>
              )}
            </div>

            <NavItem href="/dashboard/gratuity" icon={<DollarSign className="mr-3 h-5 w-5" />}>
              Gratuity
            </NavItem>
            
            {/* Guardian Hub (renamed from Security) */}
            <NavItem href="/dashboard/guardian" icon={<Shield className="mr-3 h-5 w-5" />}>
              Guardian Hub
            </NavItem>
          </div>
          
          {/* User Profile Navigation - Added at bottom with separation */}
          <div className="pt-6 mt-6 border-t border-gray-800">
            <NavItem href="/dashboard/profile" icon={<UserCircle className="mr-3 h-5 w-5" />}>
              User Profile
            </NavItem>
            
            {/* Admin Settings - Only visible to admins */}
            {isAdmin && (
              <NavItem href="/dashboard/admin" icon={<Settings className="mr-3 h-5 w-5" />}>
                Admin Settings
              </NavItem>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-black border-b border-[#AE9773] h-16">
          <div className="flex items-center justify-between h-full px-4">
            {/* Left side - Venue Selector */}
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-white hover:text-gray-300 mr-3"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
                  className="flex items-center justify-between space-x-2 text-[#AE9773] bg-black hover:bg-gray-900 px-4 py-1.5 rounded border border-[#AE9773] transition-colors min-w-[240px]"
                >
                  <span className="font-medium truncate">{selectedVenue}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </button>
                
                {isVenueDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-[#AE9773] rounded shadow-lg z-50">
                    <ul>
                      {venues.map((venue) => (
                        <li key={venue}>
                          <button
                            onClick={() => handleVenueSelect(venue)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-800 ${
                              venue === selectedVenue ? 'bg-gray-800 text-[#AE9773]' : 'text-white'
                            }`}
                          >
                            {venue}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side - User info and sign out */}
            <div className="flex items-center space-x-4 ml-auto">
              <div className="text-[#AE9773] text-sm md:text-base">
                Welcome Home, <span className="font-semibold">{userName}</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#AE9773] flex items-center justify-center text-white font-medium">
                {getInitials()}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center bg-[#AE9773]/10 hover:bg-[#AE9773]/20 px-3 py-1.5 rounded border border-[#AE9773] transition-colors"
              >
                <LogOut className="h-4 w-4 text-[#AE9773] mr-2" />
                <span className="text-[#AE9773] text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-white p-4">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ 
  href, 
  icon, 
  children,
  isSubmenu = false
}: { 
  href: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  isSubmenu?: boolean;
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link 
      href={href} 
      className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
        isSubmenu ? (isActive 
          ? 'text-white' 
          : 'text-gray-300 hover:text-white')
        : (isActive 
          ? 'bg-gray-900 text-[#AE9773]' 
          : 'text-gray-300 hover:bg-gray-900 hover:text-white'
        )
      }`}
    >
      {icon}
      {children}
    </Link>
  )
} 