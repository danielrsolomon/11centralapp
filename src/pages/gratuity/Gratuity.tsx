import { useState } from 'react';
import { DollarSign, Calendar, ArrowUpDown, Download, BarChart3, PieChart } from 'lucide-react';

// Mock data for gratuity earnings
const currentMonth = new Date().toLocaleString('default', { month: 'long' });
const currentYear = new Date().getFullYear();

const mockEarnings = {
  totalMonth: 2845.75,
  totalYear: 12450.32,
  averagePerShift: 237.15,
  taxWithheld: 426.86,
  recentPayments: [
    { id: 1, date: '2025-03-10', amount: 342.50, shifts: 2, position: 'Bartender', location: 'Main Bar' },
    { id: 2, date: '2025-03-03', amount: 287.25, shifts: 1, position: 'Bartender', location: 'VIP Lounge' },
    { id: 3, date: '2025-02-24', amount: 412.80, shifts: 2, position: 'Bartender', location: 'Main Bar' },
    { id: 4, date: '2025-02-17', amount: 198.45, shifts: 1, position: 'Bartender', location: 'Main Bar' },
    { id: 5, date: '2025-02-10', amount: 325.60, shifts: 2, position: 'Bartender', location: 'VIP Lounge' },
  ],
  monthlyBreakdown: [
    { month: 'January', amount: 2150.25 },
    { month: 'February', amount: 2354.80 },
    { month: 'March', amount: 2845.75 },
  ]
};

export default function Gratuity() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Earnings</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>
      
      {/* Earnings Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Total ({currentMonth})</span>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(mockEarnings.totalMonth)}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Total ({currentYear})</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(mockEarnings.totalYear)}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Average Per Shift</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(mockEarnings.averagePerShift)}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Tax Withheld (Month)</span>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatCurrency(mockEarnings.taxWithheld)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Earnings Chart */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Earnings Trend</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateRange('week')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                dateRange === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                dateRange === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                dateRange === 'year' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Year
            </button>
          </div>
        </div>
        
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-12 w-12" />
            <span>Chart visualization would appear here</span>
            <span className="text-xs">Showing {dateRange} data</span>
          </div>
        </div>
      </div>
      
      {/* Recent Payments */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Recent Payments</h2>
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Shifts</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Position</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Location</th>
                </tr>
              </thead>
              <tbody>
                {mockEarnings.recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{formatDate(payment.date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-sm">{payment.shifts}</td>
                    <td className="px-4 py-3 text-sm">{payment.position}</td>
                    <td className="px-4 py-3 text-sm">{payment.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Distribution Breakdown */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Tip Distribution Breakdown</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your tips are distributed according to the company's tip pooling policy, which allocates earnings based on position, hours worked, and performance metrics.
            </p>
            <p className="text-sm text-muted-foreground">
              For the current month, your distribution is based on:
            </p>
            <ul className="text-sm space-y-1 mt-2">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                <span>Position Factor: 1.2x (Bartender)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                <span>Hours Worked: 64 hours</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                <span>Performance Rating: 4.8/5.0</span>
              </li>
            </ul>
          </div>
          
          <div className="h-48 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <PieChart className="h-12 w-12" />
              <span>Distribution chart would appear here</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 