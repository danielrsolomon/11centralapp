import { Building2 } from 'lucide-react';

export default function Floorplans() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Floorplan Management</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center justify-center">
        <Building2 className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Floorplans Page</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This page will display and manage venue floorplans. The implementation will include interactive floorplan editing, station assignments, and AI-powered staff allocation.
        </p>
      </div>
    </div>
  );
} 