import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  CalendarDays, 
  DollarSign, 
  LayoutDashboard,
  FileText,
  GraduationCap,
  Trophy,
  Building2,
  ListChecks,
  Clock,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  UserCog,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// Mock user role for demonstration
const userRole = 'Admin';

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['university', 'connect', 'schedule', 'gratuity']);
  const [collapsed, setCollapsed] = useState(false);

  const isExpanded = (section: string) => expandedSections.includes(section);

  const toggleSection = (section: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedSections([...expandedSections, section]);
      return;
    }

    if (isExpanded(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  // Handle sidebar toggle
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, setIsOpen]);
  
  // Handle sidebar state changes
  useEffect(() => {
    if (!isOpen) {
      setCollapsed(true);
    }
  }, [isOpen]);

  // Check if user role has content management access
  const hasContentManagementAccess = () => {
    return ['SuperAdmin', 'Admin', 'Director', 'SeniorManager', 'TrainingManager'].includes(userRole);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "fixed top-16 bottom-0 z-20 border-r border-gray-800 bg-black transition-all duration-300 md:translate-x-0 md:static md:z-0 relative",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Gold light accent on the left side of sidebar */}
        <div className="absolute top-0 left-0 h-full w-0.5 bg-gold-light opacity-80"></div>
        
        {/* Collapse/Expand Button */}
        <button 
          onClick={toggleCollapse} 
          className="absolute -right-3 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-gray-800 bg-black text-gold-light"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>

        <div className="flex h-full flex-col gap-2 overflow-y-auto p-4 pt-2 mt-4">
          <nav className="grid gap-1">
            {/* Dashboard - First Item */}
            <NavLink 
              to="/dashboard" 
              className={({isActive}) => cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                isActive ? "bg-[#AE9773] text-white" : "text-white",
                collapsed ? "justify-center" : ""
              )}
              end
            >
              {({isActive}) => (
                <>
                  <LayoutDashboard className={cn("h-5 w-5", !isActive && "text-gold-light")} />
                  {!collapsed && <span>Dashboard</span>}
                </>
              )}
            </NavLink>

            {/* Connect Section - Second Item */}
            <div>
              <button 
                onClick={() => toggleSection('connect')} 
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light text-white",
                  collapsed ? "justify-center w-full" : "justify-between w-full"
                )}
              >
                <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                  <MessageSquare className="h-5 w-5 text-gold-light" />
                  {!collapsed && <span>11Central Connect</span>}
                </div>
                {!collapsed && (
                  isExpanded('connect') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </button>
              
              {(isExpanded('connect') && !collapsed) && (
                <div className="pl-4 pt-1">
                  <NavLink 
                    to="/connect" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                    end
                  >
                    {({isActive}) => (
                      <>
                        <MessageSquare className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Channels</span>
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/connect/direct" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                  >
                    {({isActive}) => (
                      <>
                        <Users className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Direct Messages</span>
                      </>
                    )}
                  </NavLink>
                </div>
              )}
            </div>

            {/* University Section - Third Item */}
            <div>
              <button 
                onClick={() => toggleSection('university')} 
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light text-white",
                  collapsed ? "justify-center w-full" : "justify-between w-full"
                )}
              >
                <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                  <BookOpen className="h-5 w-5 text-gold-light" />
                  {!collapsed && <span>E11EVEN University</span>}
                </div>
                {!collapsed && (
                  isExpanded('university') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </button>
              
              {(isExpanded('university') && !collapsed) && (
                <div className="pl-4 pt-1">
                  <NavLink 
                    to="/university" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                    end
                  >
                    {({isActive}) => (
                      <>
                        <LayoutDashboard className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Dashboard</span>
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/university/programs" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                  >
                    {({isActive}) => (
                      <>
                        <GraduationCap className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Training Portal</span>
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/university/achievements" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                  >
                    {({isActive}) => (
                      <>
                        <Trophy className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Achievements</span>
                      </>
                    )}
                  </NavLink>
                  
                  {/* Content management only visible to specific roles */}
                  {hasContentManagementAccess() && (
                    <NavLink 
                      to="/university/content" 
                      className={({isActive}) => cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                        isActive ? "bg-[#AE9773] text-white" : "text-white"
                      )}
                    >
                      {({isActive}) => (
                        <>
                          <FileText className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                          <span>Content Management</span>
                        </>
                      )}
                    </NavLink>
                  )}
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            <div>
              <button 
                onClick={() => toggleSection('schedule')} 
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light text-white",
                  collapsed ? "justify-center w-full" : "justify-between w-full"
                )}
              >
                <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                  <CalendarDays className="h-5 w-5 text-gold-light" />
                  {!collapsed && <span>Scheduling Hub</span>}
                </div>
                {!collapsed && (
                  isExpanded('schedule') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </button>
              
              {(isExpanded('schedule') && !collapsed) && (
                <div className="pl-4 pt-1">
                  <NavLink 
                    to="/schedule" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                    end
                  >
                    {({isActive}) => (
                      <>
                        <CalendarDays className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>My Schedule</span>
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/schedule/swaps" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                  >
                    {({isActive}) => (
                      <>
                        <ListChecks className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Shift Swaps</span>
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/schedule/time-off" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                  >
                    {({isActive}) => (
                      <>
                        <Clock className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>Time Off</span>
                      </>
                    )}
                  </NavLink>
                  
                  {/* Admin-only sections */}
                  {(userRole === 'Admin' || userRole === 'Manager') && (
                    <NavLink 
                      to="/schedule/floorplans" 
                      className={({isActive}) => cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                        isActive ? "bg-[#AE9773] text-white" : "text-white"
                      )}
                    >
                      {({isActive}) => (
                        <>
                          <Building2 className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                          <span>Floorplans</span>
                        </>
                      )}
                    </NavLink>
                  )}
                </div>
              )}
            </div>

            {/* Gratuity Section */}
            <div>
              <button 
                onClick={() => toggleSection('gratuity')} 
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light text-white",
                  collapsed ? "justify-center w-full" : "justify-between w-full"
                )}
              >
                <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                  <DollarSign className="h-5 w-5 text-gold-light" />
                  {!collapsed && <span>Gratuity</span>}
                </div>
                {!collapsed && (
                  isExpanded('gratuity') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                )}
              </button>
              
              {(isExpanded('gratuity') && !collapsed) && (
                <div className="pl-4 pt-1">
                  <NavLink 
                    to="/gratuity" 
                    className={({isActive}) => cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                      isActive ? "bg-[#AE9773] text-white" : "text-white"
                    )}
                    end
                  >
                    {({isActive}) => (
                      <>
                        <DollarSign className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                        <span>My Earnings</span>
                      </>
                    )}
                  </NavLink>
                  
                  {/* Admin-only sections */}
                  {(userRole === 'Admin' || userRole === 'Manager') && (
                    <NavLink 
                      to="/gratuity/reports" 
                      className={({isActive}) => cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                        isActive ? "bg-[#AE9773] text-white" : "text-white"
                      )}
                    >
                      {({isActive}) => (
                        <>
                          <FileText className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                          <span>Reports</span>
                        </>
                      )}
                    </NavLink>
                  )}
                </div>
              )}
            </div>

            {/* Gold separator line between Gratuity and User Settings */}
            <div className="my-2 mx-1 h-[1px] bg-gold-light opacity-80"></div>

            {/* User Settings */}
            <NavLink 
              to="/users" 
              className={({isActive}) => cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                isActive ? "bg-[#AE9773] text-white" : "text-white",
                collapsed ? "justify-center" : ""
              )}
            >
              {({isActive}) => (
                <>
                  <UserCog className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                  {!collapsed && <span>User Settings</span>}
                </>
              )}
            </NavLink>

            {/* Admin Dashboard (only visible to admin roles) */}
            {(userRole === 'Admin') && (
              <>
                <NavLink 
                  to="/admin" 
                  className={({isActive}) => cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                    isActive ? "bg-[#AE9773] text-white" : "text-white",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  {({isActive}) => (
                    <>
                      <Settings className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                      {!collapsed && <span>Admin Dashboard</span>}
                    </>
                  )}
                </NavLink>

                {/* Help & Support moved under Admin Dashboard */}
                <NavLink 
                  to="/help" 
                  className={({isActive}) => cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-800 hover:text-gold-light no-underline",
                    isActive ? "bg-[#AE9773] text-white" : "text-white",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  {({isActive}) => (
                    <>
                      <HelpCircle className={cn("h-4 w-4", !isActive && "text-gold-light")} />
                      {!collapsed && <span>Help & Support</span>}
                    </>
                  )}
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
} 