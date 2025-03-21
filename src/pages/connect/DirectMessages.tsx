import { Users } from 'lucide-react';

export default function DirectMessages() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Direct Messages</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center justify-center">
        <Users className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Direct Messages Page</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This page will display all direct message conversations. The implementation will include user listings, conversation history, and real-time messaging.
        </p>
      </div>
    </div>
  );
} 