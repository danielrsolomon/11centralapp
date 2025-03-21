import { useState } from 'react';
import { Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../providers/theme-provider';
import { Link } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
}

// Mock user data for demonstration - this would come from authentication context in a real app
const mockUser = {
  firstName: 'Daniel',
  lastName: 'Solomon',
  initials: 'DS'
};

// Updated venue options
const venues = [
  "E11EVEN Miami",
  "11Hotel Lobby Bar",
  "11Hotel Dayclub",
  "11Hotel Sportsbook",
  "11Hotel Speakeasy",
  "Gold Rush Miami"
];

export default function Header({ toggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [selectedVenue, setSelectedVenue] = useState(venues[0]);
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-black relative">
      {/* Gold light accent at the top of the header */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gold-light opacity-80"></div>
      
      {/* Gold light accent on the left side of the header */}
      <div className="absolute top-0 left-0 w-0.5 h-full bg-gold-light opacity-80"></div>
      
      {/* Remove border-b from header and replace with gold line accent at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold-light opacity-80 z-10"></div>
      
      <div className="flex h-16 items-center">
        {/* Logo positioned to align with sidebar */}
        <div className="flex items-center" style={{ width: '200px', paddingLeft: '60px' }}>
          <img 
            src="/logo.png" 
            alt="E11EVEN Logo" 
            style={{ height: '3.45rem' }} /* h-9 is 2.25rem or 36px, increased by 40% to 3.15rem or 50px */
            className="w-auto"
          />
        </div>
        
        {/* Venue selector - moved more to the left */}
        <div className="relative ml-16">
          <button
            onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
            className="flex items-center gap-1 rounded-md bg-black px-4 py-1.5 text-sm text-gold-light hover:bg-gray-800 min-w-[210px] justify-between"
            style={{ 
              border: '1px solid #AE9773', 
              boxShadow: '0 0 0 1px #AE9773' 
            }}
          >
            <span>{selectedVenue}</span>
            <ChevronDown className="h-4 w-4 text-gold-light" />
          </button>
          
          {isVenueDropdownOpen && (
            <div 
              className="absolute mt-1 w-full rounded-md bg-black py-1 z-50"
              style={{ 
                border: '1px solid #AE9773', 
                boxShadow: '0 0 0 1px #AE9773' 
              }}
            >
              {venues.map((venue) => (
                <button
                  key={venue}
                  className={`block w-full px-4 py-2 text-left text-sm ${
                    venue === selectedVenue ? 'text-gold-light' : 'text-white hover:bg-gray-800 hover:text-gold-light'
                  }`}
                  onClick={() => {
                    setSelectedVenue(venue);
                    setIsVenueDropdownOpen(false);
                  }}
                >
                  {venue}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {/* Welcome message with user's first name */}
          <span className="hidden md:inline-block text-white text-sm">
            Welcome Home, <Link to="/users" className="text-gold-light hover:underline">{mockUser.firstName}</Link>
          </span>
          
          {/* User initials circle */}
          <Link 
            to="/users"
            className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-[#AE9773] hover:bg-[#8A7859] transition-colors"
          >
            <span className="text-sm font-semibold text-white">
              {mockUser.initials}
            </span>
          </Link>
          
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-800 text-white h-9 w-9 p-0"
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-gold-light" />
            ) : (
              <Sun className="h-5 w-5 text-gold-light" />
            )}
          </button>
          
          {/* Sign out button */}
          <Link 
            to="/auth/logout"
            className="inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-gray-800 text-white py-2 px-3"
          >
            <LogOut className="h-4 w-4 text-gold-light" />
            <span className="hidden sm:inline-block">Sign Out</span>
          </Link>
        </div>
      </div>
    </header>
  );
} 