import { Clock } from 'lucide-react';

export default function TimeOff() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Time Off Requests</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center justify-center">
        <Clock className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Time Off Page</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This page will display all time off requests and balances. The implementation will include request submission, approval workflows, and time off history.
        </p>
      </div>
    </div>
  );
} 