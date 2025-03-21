import { ListChecks } from 'lucide-react';

export default function ShiftSwaps() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center justify-center">
        <ListChecks className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Shift Swaps Page</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This page will display all shift swap requests and opportunities. The implementation will include request management, approval workflows, and swap history.
        </p>
      </div>
    </div>
  );
} 