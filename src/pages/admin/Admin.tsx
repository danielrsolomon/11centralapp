import { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  Users, 
  GraduationCap, 
  CalendarDays, 
  DollarSign, 
  MessageSquare,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Building2,
  UserPlus,
  FileText
} from 'lucide-react';

// Mock data for admin dashboard
const mockStats = {
  totalEmployees: 124,
  activeTrainings: 8,
  scheduledShifts: 215,
  tipPoolTotal: 24680.50,
  messagesSent: 1245,
  
  trainingCompletion: 78,
  trainingCompletionChange: 12,
  
  shiftCoverage: 92,
  shiftCoverageChange: -3,
  
  tipDistribution: 24680.50,
  tipDistributionChange: 8,
  
  messageEngagement: 85,
  messageEngagementChange: 15,
  
  departments: [
    { name: 'Bar Staff', employees: 32, color: 'bg-blue-500' },
    { name: 'VIP Hosts', employees: 18, color: 'bg-purple-500' },
    { name: 'Cocktail Staff', employees: 24, color: 'bg-green-500' },
    { name: 'Server Assistants', employees: 28, color: 'bg-yellow-500' },
    { name: 'Guest Services', employees: 22, color: 'bg-red-500' },
  ],
  
  recentActivities: [
    { id: 1, type: 'user', message: 'Sarah Johnson completed "Mixology Basics" training', time: '10 minutes ago' },
    { id: 2, type: 'schedule', message: 'Schedule for April 1-15 has been published', time: '1 hour ago' },
    { id: 3, type: 'tip', message: 'March 10 tip pool has been distributed', time: '3 hours ago' },
    { id: 4, type: 'training', message: 'New training module "Customer Service Excellence" added', time: '5 hours ago' },
    { id: 5, type: 'user', message: 'Michael Chen joined as VIP Host', time: '1 day ago' },
  ]
};

export default function Admin() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export Reports
          </button>
        </div>
      </div>
      
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Total Employees</span>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{mockStats.totalEmployees}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Active Trainings</span>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{mockStats.activeTrainings}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Scheduled Shifts</span>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{mockStats.scheduledShifts}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Tip Pool (Month)</span>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(mockStats.tipPoolTotal)}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Messages Sent</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{mockStats.messagesSent}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Training Completion</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{mockStats.trainingCompletion}%</span>
                <span className={`flex items-center text-xs ${
                  mockStats.trainingCompletionChange > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {mockStats.trainingCompletionChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(mockStats.trainingCompletionChange)}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-2 rounded-full bg-primary" 
              style={{ width: `${mockStats.trainingCompletion}%` }}
            ></div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Shift Coverage</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{mockStats.shiftCoverage}%</span>
                <span className={`flex items-center text-xs ${
                  mockStats.shiftCoverageChange > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {mockStats.shiftCoverageChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(mockStats.shiftCoverageChange)}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-2 rounded-full bg-primary" 
              style={{ width: `${mockStats.shiftCoverage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Tip Distribution</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formatCurrency(mockStats.tipDistribution)}</span>
                <span className={`flex items-center text-xs ${
                  mockStats.tipDistributionChange > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {mockStats.tipDistributionChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(mockStats.tipDistributionChange)}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-2 rounded-full bg-primary" 
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Message Engagement</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{mockStats.messageEngagement}%</span>
                <span className={`flex items-center text-xs ${
                  mockStats.messageEngagementChange > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {mockStats.messageEngagementChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(mockStats.messageEngagementChange)}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted">
            <div 
              className="h-2 rounded-full bg-primary" 
              style={{ width: `${mockStats.messageEngagement}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Department Distribution & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Department Distribution */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium">Department Distribution</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockStats.departments.map((dept, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dept.name}</span>
                  <span className="text-sm text-muted-foreground">{dept.employees} employees</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div 
                    className={`h-2 rounded-full ${dept.color}`} 
                    style={{ width: `${(dept.employees / mockStats.totalEmployees) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium">Recent Activity</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockStats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {activity.type === 'user' && <Users className="h-4 w-4 text-primary" />}
                  {activity.type === 'schedule' && <CalendarDays className="h-4 w-4 text-primary" />}
                  {activity.type === 'tip' && <DollarSign className="h-4 w-4 text-primary" />}
                  {activity.type === 'training' && <GraduationCap className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <button className="rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium">Add New Employee</h3>
            <p className="text-sm text-muted-foreground">Create a new employee profile</p>
          </div>
        </button>
        
        <button className="rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium">Manage Schedules</h3>
            <p className="text-sm text-muted-foreground">View and edit employee schedules</p>
          </div>
        </button>
        
        <button className="rounded-lg border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium">Generate Reports</h3>
            <p className="text-sm text-muted-foreground">Create custom analytics reports</p>
          </div>
        </button>
      </div>
    </div>
  );
} 