'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrograms, type Program } from '@/lib/hooks/usePrograms';
import Link from 'next/link';
import Image from 'next/image';
import logger from '@/lib/logger';
import { useUserPermissions } from '@/lib/hooks/useUserPermissions';
import ErrorBoundary from '@/components/ErrorBoundary';
import { BookOpen, Search, Filter, ArrowLeft, CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { isPlaceholderImage } from '@/lib/supabase-storage';

export default function ProgramsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Fetch programs with proper filters
  const { 
    programs, 
    isLoading, 
    error,
    refreshPrograms
  } = usePrograms({
    adminView: isAdmin,
    includeArchived: false,
    searchQuery: searchTerm
  });

  // Fetch departments
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch('/api/departments');
        if (!response.ok) {
          throw new Error('Failed to fetch departments');
        }
        const data = await response.json();
        setDepartments(data.departments || []);
      } catch (err) {
        logger.error('Error fetching departments', err as Error);
        setDepartments([]);
      }
    }
    
    fetchDepartments();
  }, []);

  // Log any errors
  useEffect(() => {
    if (error) {
      logger.error('Error loading programs', error);
    }
  }, [error]);

  // Filter programs by department if needed
  const filteredPrograms = programs?.filter(program => {
    if (!departmentFilter) return true;
    return program.department_name === departmentFilter;
  }) || [];

  // Show loading state
  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#AE9773]"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/dashboard/university" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Training Programs</h1>
          </div>
          
          {isAdmin && (
            <Link
              href="/dashboard/university/content"
              className="px-4 py-2 bg-[#AE9773] hover:bg-[#9d8768] text-white rounded-md transition-colors text-sm font-medium flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manage Programs
            </Link>
          )}
        </div>
        
        {/* Admin note (visible only to admins) */}
        {isAdmin && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Admin Note:</p>
                <p className="mt-1">You can create, edit, and archive programs in the Content Management section. All changes use the <code className="bg-blue-100 px-1 py-0.5 rounded">/api/learning/programs</code> API endpoint.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Search and filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search programs..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-[#AE9773] focus:border-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md appearance-none bg-white focus:ring-2 focus:ring-[#AE9773] focus:border-transparent outline-none"
              value={departmentFilter || ''}
              onChange={(e) => setDepartmentFilter(e.target.value || null)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error loading programs</h3>
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
            <button
              onClick={() => refreshPrograms()}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Programs Grid */}
        {!error && (
          <>
            {filteredPrograms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map(program => (
                  <Link 
                    key={program.id} 
                    href={`/dashboard/university/program/${program.id}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200"
                  >
                    <div className="relative h-48 bg-gray-100">
                      {program.thumbnail_url && !isPlaceholderImage(program.thumbnail_url) ? (
                        <Image
                          src={program.thumbnail_url} 
                          alt={program.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                          <BookOpen className="h-20 w-20 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Draft badge */}
                      {program.status === 'draft' && (
                        <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-75">
                          Draft
                        </div>
                      )}
                      
                      {/* Admin badge for placeholder images */}
                      {isAdmin && isPlaceholderImage(program.thumbnail_url) && (
                        <div className="absolute top-2 left-2 bg-amber-100 border border-amber-200 text-amber-800 text-xs px-2 py-1 rounded-md">
                          Missing Image
                        </div>
                      )}
                      
                      {/* Completion badge - if the data is available */}
                      {program.completion_percentage !== undefined && program.completion_percentage > 0 && (
                        <div className="absolute bottom-3 right-3 bg-white rounded-full px-2 py-1 text-xs font-medium flex items-center shadow-sm">
                          {program.completion_percentage === 100 ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                              <span className="text-green-600">Completed</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[#AE9773]">{program.completion_percentage}% complete</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-gray-800 mb-1">{program.title}</h3>
                      
                      {program.department_name && (
                        <p className="text-sm text-[#AE9773] mb-2">{program.department_name}</p>
                      )}
                      
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{program.description}</p>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <BookOpen className="h-4 w-4 mr-1" />
                        <span>{program.courses_count || 0} Courses</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-800 mb-1">No Programs Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || departmentFilter 
                    ? "Try adjusting your search or filter criteria" 
                    : "There are no training programs available at this time"}
                </p>
                
                {(searchTerm || departmentFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDepartmentFilter(null);
                    }}
                    className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
} 