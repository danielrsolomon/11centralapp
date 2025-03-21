import { Bell, BookOpen, Calendar, Clock, DollarSign, MessageSquare, TrendingUp, Users } from "lucide-react";
import { Todo } from "../components/Todo";
import { Notifications } from "../components/Notifications";

interface QuickLinkProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}

function QuickLink({ icon, title, description, href, color }: QuickLinkProps) {
  return (
    <a 
      href={href}
      className="flex items-start p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      <div className={`p-3 rounded-md ${color} mr-4 shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </a>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {trend && (
            <div className="flex items-center mt-1">
              <TrendingUp 
                className={`h-4 w-4 mr-1 ${trend.positive ? 'text-green-500' : 'text-red-500 transform rotate-180'}`} 
              />
              <span className={`text-xs ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.value} {trend.positive ? 'increase' : 'decrease'}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-md">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface UpcomingShiftProps {
  date: string;
  time: string;
  position: string;
  location: string;
}

function UpcomingShift({ date, time, position, location }: UpcomingShiftProps) {
  return (
    <div className="flex items-center p-4 border-b last:border-b-0">
      <div className="mr-4 p-2 bg-primary/10 rounded-md">
        <Calendar className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">{date}</p>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-3 w-3 mr-1" />
          <span>{time}</span>
        </div>
        <p className="text-sm">{position} - {location}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const quickLinks = [
    {
      icon: <BookOpen className="h-6 w-6 text-white" />,
      title: "Training Programs",
      description: "View and complete required training modules",
      href: "/university/programs",
      color: "bg-blue-500"
    },
    {
      icon: <Calendar className="h-6 w-6 text-white" />,
      title: "My Schedule",
      description: "View upcoming shifts and request time off",
      href: "/schedule",
      color: "bg-purple-500"
    },
    {
      icon: <DollarSign className="h-6 w-6 text-white" />,
      title: "Gratuity Reports",
      description: "View your recent gratuity distributions",
      href: "/gratuity/reports",
      color: "bg-green-500"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-white" />,
      title: "Messages",
      description: "Check your direct messages and announcements",
      href: "/connect/direct-messages",
      color: "bg-yellow-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, Alex</h1>
          <p className="text-gray-600">Here's what's happening today</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
            Clock In
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Hours This Week" 
          value="32.5" 
          icon={<Clock className="h-6 w-6 text-primary" />}
          trend={{ value: "4.5", positive: true }}
        />
        <StatCard 
          title="Gratuity This Week" 
          value="$1,245" 
          icon={<DollarSign className="h-6 w-6 text-primary" />}
          trend={{ value: "12%", positive: true }}
        />
        <StatCard 
          title="Training Completion" 
          value="85%" 
          icon={<BookOpen className="h-6 w-6 text-primary" />}
        />
        <StatCard 
          title="Team Performance" 
          value="92%" 
          icon={<Users className="h-6 w-6 text-primary" />}
          trend={{ value: "3%", positive: true }}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Links */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLinks.map((link, index) => (
                <QuickLink key={index} {...link} />
              ))}
            </div>
          </section>

          {/* Upcoming Shifts */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Upcoming Shifts</h2>
              <a href="/schedule" className="text-primary text-sm hover:underline">
                View All
              </a>
            </div>
            <div>
              <UpcomingShift 
                date="Today" 
                time="6:00 PM - 2:00 AM" 
                position="Senior Bartender" 
                location="Main Bar"
              />
              <UpcomingShift 
                date="Tomorrow" 
                time="8:00 PM - 4:00 AM" 
                position="Senior Bartender" 
                location="VIP Section"
              />
              <UpcomingShift 
                date="Friday, Jun 24" 
                time="9:00 PM - 5:00 AM" 
                position="Senior Bartender" 
                location="Rooftop"
              />
            </div>
          </section>

          {/* Todo List */}
          <section>
            <Todo />
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Notifications */}
          <section>
            <Notifications />
          </section>

          {/* Announcements */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex items-center p-6 border-b">
              <Bell className="h-5 w-5 text-primary mr-2" />
              <h2 className="text-xl font-semibold">Announcements</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium">New Cocktail Menu Launch</h3>
                <p className="text-sm text-gray-600 mt-1">
                  The summer cocktail menu will launch next week. Training sessions scheduled for Wednesday.
                </p>
                <p className="text-xs text-gray-500 mt-2">Posted 2 days ago</p>
              </div>
              <div>
                <h3 className="font-medium">Staff Meeting</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Monthly staff meeting scheduled for Monday, June 20th at 2:00 PM. Attendance is mandatory.
                </p>
                <p className="text-xs text-gray-500 mt-2">Posted 5 days ago</p>
              </div>
              <a href="/announcements" className="block text-primary text-sm hover:underline mt-4">
                View All Announcements
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 