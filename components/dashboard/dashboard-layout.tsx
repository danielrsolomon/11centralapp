'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { 
  Menu, 
  X, 
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
  MessageSquare,
  Cog,
  BookOpen as BookOpenIcon,
  GraduationCap as GraduationCapIcon,
  Trophy as TrophyIcon,
  ListChecks,
  CalendarDays,
  Clock as ClockIcon,
  Building2,
  Users,
  ShieldCheck,
  CalendarRange
} from 'lucide-react'
import Script from 'next/script'

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
  const [showDebugAdmin, setShowDebugAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const pathname = usePathname()
  
  // Safe check for client-side only code
  useEffect(() => {
    // Check for debug_showAdmin only on client-side
    if (typeof window !== 'undefined') {
      try {
        const debugValue = localStorage.getItem('debug_showAdmin') === 'true';
        setShowDebugAdmin(debugValue);
      } catch (e) {
        console.error('Error accessing localStorage:', e);
      }
    }
  }, []);
  
  // Sample venues - in a real app, these would come from the API/database
  const venues = [
    'E11EVEN Miami',
    'E11EVEN Dayclub',
    'E11EVEN Lobby Bar Miami',
    'E11EVEN Speakeasy Miami',
    'E11EVEN Sportsbook',
    'Gold Rush Miami'
  ]
  
  // Enhanced user data fetch
  async function getUserData() {
    try {
      // Log for debugging
      console.log('Fetching user data');
      
      // Now fetch from server
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found in API call');
        return;
      }

      // Special case for Daniel's email - force admin status
      if (user.email === 'danielrsolomon@gmail.com') {
        console.log('Setting admin status for Daniel (from API)');
        setIsAdmin(true);
      }

      // Set user name immediately with fallback to email username
      if (user.email) {
        const emailUsername = user.email.split('@')[0];
        // Try to extract a first name from the username
        const firstName = extractFirstName(emailUsername);
        setUserName(firstName);
        console.log('Set username from email:', firstName);
      }
      
      // Try to get the profile data
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, is_admin')
        .eq('id', user.id)
        .single();
      
      console.log('Profile data:', profile, 'Error:', error);
      
      // If we got profile data, update with better name
      if (!error && profile) {
        setUserName(profile.first_name || extractFirstName(user.email?.split('@')[0] || '') || 'User');
        if (profile.is_admin === true) {
          console.log('User is admin (from profile)');
          setIsAdmin(true);
        }
        console.log('Set username from profile data:', profile.first_name);
      }
    } catch (error) {
      console.error('Error in getUserData:', error);
    }
  }
  
  // Fetch user data when component mounts
  useEffect(() => {
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

  // Main navigation items
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: '11Central Connect',
      href: '/dashboard/connect',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      name: 'E11EVEN University',
      href: '/dashboard/university',
      icon: <GraduationCap className="h-5 w-5" />,
      submenu: true,
      section: 'university'
    },
    {
      name: 'Scheduling Hub',
      href: '/dashboard/schedule',
      icon: <CalendarRange className="h-5 w-5" />,
      submenu: true,
      section: 'schedule'
    },
    {
      name: 'Gratuity',
      href: '/dashboard/gratuity',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      name: 'Guardian Hub',
      href: '/dashboard/guardian',
      icon: <ShieldCheck className="h-5 w-5" />
    }
  ]
  
  // Bottom navigation items
  const bottomNavItems = [
    {
      name: 'User Profile',
      href: '/dashboard/profile',
      icon: <UserCircle className="h-5 w-5" />
    },
    {
      name: 'Admin Settings',
      href: '/dashboard/admin',
      icon: <Settings className="h-5 w-5" />,
      adminOnly: true
    }
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Debug script */}
      <Script src="/dashboard-debug.js" strategy="afterInteractive" />
      
      {/* Gold line at the top of the page - even thinner */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#AE9773] z-50"></div>
      
      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-4 z-40 rounded-md bg-[#AE9773] p-2 text-white md:hidden"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto bg-[#1e1e1e] transition duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Main sidebar content */}
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 flex items-center justify-center">
            <Image 
              src={goldLogo}
              alt="E11EVEN Miami Logo"
              width={120}
              height={48}
              priority
            />
          </div>
          
          {/* Main Navigation */}
          <nav className="flex-1 px-2 py-4">
            {navigationItems.map((item) => (
              <div key={item.name} className="mb-2">
                {item.submenu ? (
                  <button
                    onClick={() => toggleSection(item.section!)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md
                      ${isExpanded(item.section!) ? 'bg-gray-900 text-[#AE9773]' : 'text-gray-300 hover:bg-gray-900 hover:text-white'}
                    `}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded(item.section!) ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : (
                  <NavItem href={item.href} icon={item.icon}>
                    {item.name}
                  </NavItem>
                )}
                
                {/* Render submenu if expanded */}
                {item.section === 'university' && isExpanded('university') && (
                  <div className="ml-2 mt-1 space-y-1">
                    <NavItem href="/dashboard/university" icon={<Grid className="h-5 w-5" />} isSubmenu>
                      Dashboard
                    </NavItem>
                    
                    <NavItem href="/dashboard/university/programs" icon={<GraduationCap className="h-5 w-5" />} isSubmenu>
                      Programs
                    </NavItem>
                    
                    <NavItem href="/dashboard/university/achievements" icon={<Trophy className="h-5 w-5" />} isSubmenu>
                      Achievements
                    </NavItem>
                    
                    {/* Show admin-only Content Management section */}
                    {(isAdmin || showDebugAdmin) && (
                      <NavItem href="/dashboard/university/content" icon={<FileText className="h-5 w-5" />} isSubmenu>
                        Content Management
                      </NavItem>
                    )}
                  </div>
                )}
                
                {item.section === 'schedule' && isExpanded('schedule') && (
                  <div className="ml-2 mt-1 space-y-1">
                    <NavItem href="/dashboard/schedule" icon={<CalendarDays className="h-5 w-5" />} isSubmenu>
                      Schedules
                    </NavItem>
                    
                    <NavItem href="/dashboard/schedule/swaps" icon={<ListChecks className="h-5 w-5" />} isSubmenu>
                      Schedule Swaps
                    </NavItem>
                    
                    <NavItem href="/dashboard/schedule/time-off" icon={<ClockIcon className="h-5 w-5" />} isSubmenu>
                      Time Off Requests
                    </NavItem>
                    
                    <NavItem href="/dashboard/schedule/floorplans" icon={<Building2 className="h-5 w-5" />} isSubmenu>
                      Floor Plans
                    </NavItem>
                    
                    {isAdmin && (
                      <NavItem href="/dashboard/schedule/content" icon={<FileText className="h-5 w-5" />} isSubmenu>
                        Content Management
                      </NavItem>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
          
          {/* Bottom Navigation */}
          <div className="border-t border-gray-800 pt-4 pb-6 px-2">
            {bottomNavItems.map((item) => (
              (!item.adminOnly || isAdmin) && (
                <NavItem key={item.name} href={item.href} icon={item.icon}>
                  {item.name}
                </NavItem>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[#1E1E1E] text-white shadow-md border-b border-[#2A2A2A] h-16 flex items-center px-4 justify-between">
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
                className="flex items-center space-x-2 text-white px-4 py-2 rounded-md focus:outline-none border border-[#333] bg-[#1E1E1E]"
              >
                <span>{selectedVenue}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isVenueDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isVenueDropdownOpen && (
                <div className="absolute mt-2 z-10 bg-[#1E1E1E] border border-[#333] shadow-lg rounded-md py-1 w-full">
                  {venues.map((venue) => (
                    <button
                      key={venue}
                      onClick={() => handleVenueSelect(venue)}
                      className={`block w-full text-left px-4 py-2 hover:bg-[#2A2A2A] ${
                        venue === selectedVenue ? 'text-[#AE9773]' : 'text-white'
                      }`}
                    >
                      {venue}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="text-right mr-4">
              <div className="text-sm font-medium">Welcome Home, {userName}</div>
            </div>
            
            <div className="w-8 h-8 bg-[#AE9773] text-white rounded-full flex items-center justify-center">
              {getInitials()}
            </div>
            
            <button
              onClick={handleSignOut}
              className="ml-4 p-2 rounded hover:bg-[#2A2A2A] text-white"
            >
              <div className="flex items-center">
                <LogOut className="h-5 w-5" />
                <span className="ml-1">Sign Out</span>
              </div>
            </button>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 bg-gray-100">
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
  const router = useRouter()
  const pathname = usePathname()
  const isActive = pathname === href
  
  return (
    <Link 
      href={href}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md
        ${isActive 
          ? 'bg-gray-900 text-[#AE9773]' 
          : 'text-gray-300 hover:bg-gray-900 hover:text-white'
        }
        ${isSubmenu ? 'pl-6 text-sm' : ''}
      `}
    >
      <span className="mr-3">{icon}</span>
      {children}
    </Link>
  )
}

// Helper function to extract a first name from usernames like 'danielrsolomon'
const extractFirstName = (username: string): string => {
  if (!username) return 'User';
  
  // Try different common patterns
  // 1. Check for camelCase (e.g., danielRSolomon)
  if (/[a-z][A-Z]/.test(username)) {
    return username.split(/(?=[A-Z])/)[0];
  }
  
  // 2. Check for snake_case (e.g., daniel_r_solomon)
  if (username.includes('_')) {
    return username.split('_')[0];
  }
  
  // 3. Check for hyphenated names (e.g., daniel-r-solomon)
  if (username.includes('-')) {
    return username.split('-')[0];
  }
  
  // 4. Try to guess a reasonable split point if none of the above worked
  // For usernames like 'danielrsolomon', try to find common name endings
  const commonNameEndings = ['solomon', 'smith', 'jones', 'williams', 'johnson'];
  for (const ending of commonNameEndings) {
    if (username.toLowerCase().endsWith(ending) && username.length > ending.length) {
      return username.substring(0, username.length - ending.length);
    }
  }
  
  // If username is long enough, assume the first 6 chars might be a first name
  if (username.length > 7) {
    return username.substring(0, 6);
  }
  
  // If all else fails, just capitalize the first letter
  return username.charAt(0).toUpperCase() + username.slice(1);
}; 