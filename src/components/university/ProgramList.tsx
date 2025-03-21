import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { programService } from '../../services/programService';
import { Program } from '../../types/database.types';

interface ProgramCardProps {
  program: Program;
}

const ProgramCard = ({ program }: ProgramCardProps) => {
  return (
    <Link 
      to={`/university/programs/${program.id}`} 
      className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col h-full">
        {program.thumbnail_url && (
          <div className="relative h-48 mb-4 rounded-md overflow-hidden">
            <img 
              src={program.thumbnail_url} 
              alt={program.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-grow">
          <h3 className="text-xl font-semibold mb-2">{program.title}</h3>
          <p className="text-gray-600 line-clamp-2 mb-4">{program.description}</p>
        </div>
        <div className="flex justify-between items-center mt-auto">
          <span className="text-sm text-gray-500">
            Published {new Date(program.published_at || program.created_at).toLocaleDateString()}
          </span>
          <span 
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              program.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {program.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default function ProgramList() {
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  // Using the useSupabaseQuery hook to fetch either all published programs or programs by department
  const { data: programs, isLoading, error } = useSupabaseQuery<Program[]>(
    async () => {
      if (departmentFilter) {
        return await programService.getProgramsByDepartment(departmentFilter);
      } else {
        return await programService.getPublishedPrograms();
      }
    },
    [departmentFilter]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
        <h3 className="text-lg font-semibold mb-2">Error loading programs</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">No Programs Found</h3>
        <p className="text-gray-600">
          {departmentFilter 
            ? "There are no published programs for this department." 
            : "There are no published programs available."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-4">
        <button
          onClick={() => setDepartmentFilter(null)}
          className={`px-4 py-2 rounded-md ${
            departmentFilter === null 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Programs
        </button>
        {/* Mock department filters - in a real app, these would come from API */}
        <button
          onClick={() => setDepartmentFilter('vip-hosts')}
          className={`px-4 py-2 rounded-md ${
            departmentFilter === 'vip-hosts' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          VIP Hosts
        </button>
        <button
          onClick={() => setDepartmentFilter('bar-staff')}
          className={`px-4 py-2 rounded-md ${
            departmentFilter === 'bar-staff' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Bar Staff
        </button>
        <button
          onClick={() => setDepartmentFilter('management')}
          className={`px-4 py-2 rounded-md ${
            departmentFilter === 'management' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Management
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>
    </div>
  );
} 