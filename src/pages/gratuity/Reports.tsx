import { FileText } from 'lucide-react';

export default function GratuityReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gratuity Reports</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Gratuity Reports Page</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This page will display detailed gratuity reports and analytics. The implementation will include financial reporting, tax compliance documentation, and exportable reports.
        </p>
      </div>
    </div>
  );
} 