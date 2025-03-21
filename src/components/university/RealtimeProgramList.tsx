/**
 * @deprecated This component is no longer used in the application.
 * It has been replaced by the new service-based architecture.
 * This file is being archived to the old_backup directory.
 * Date: [Current Date]
 */

import React, { useState } from 'react';
import { useRealtimeCollection } from '../../hooks/useSupabaseRealtime';
import { programService } from '../../services/programService';
import { Program } from '../../types/database.types';
import { Spinner, Alert, Button, Card, Badge } from 'react-bootstrap';

/**
 * A component that displays a list of training programs with real-time updates
 */
const RealtimeProgramList: React.FC = () => {
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  
  // Use the real-time collection hook to get programs with live updates
  const { items: programs, isLoading, error } = useRealtimeCollection<Program>(
    'programs',
    () => programService.getProgramsByDepartment(departmentId || 'all'),
    {
      // Subscribe to all event types
      event: '*',
      // Optional filter if you only want to see programs for a specific department
      filter: departmentId ? `department_id=eq.${departmentId}` : undefined,
      // Update when departmentId changes
      dependencyList: [departmentId]
    }
  );

  // Handle department filter change
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setDepartmentId(value === 'all' ? null : value);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Error loading programs: {error.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <div className="realtime-program-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Programs (Real-time)</h2>
        <div className="d-flex align-items-center">
          <label htmlFor="department-filter" className="me-2">Filter by Department:</label>
          <select 
            id="department-filter"
            className="form-select"
            onChange={handleDepartmentChange}
            value={departmentId || 'all'}
          >
            <option value="all">All Departments</option>
            <option value="1">Sales</option>
            <option value="2">Operations</option>
            <option value="3">Management</option>
          </select>
        </div>
      </div>

      {programs.length === 0 ? (
        <Alert variant="info">
          No programs found. Create a new program to see it appear in real-time.
        </Alert>
      ) : (
        <div className="row g-4">
          {programs.map(program => (
            <div key={program.id} className="col-md-6 col-lg-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between mb-2">
                    <Badge bg={program.is_published ? 'success' : 'warning'}>
                      {program.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <small className="text-muted">
                      ID: {program.id.substring(0, 8)}...
                    </small>
                  </div>
                  <Card.Title>{program.title}</Card.Title>
                  <Card.Text className="text-truncate mb-3">
                    {program.description || 'No description provided'}
                  </Card.Text>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    <Button variant="outline-primary" size="sm">
                      View Details
                    </Button>
                    <small className="text-muted">
                      {new Date(program.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-light rounded">
        <h5>🔄 Real-time Updates</h5>
        <p className="mb-0">
          This component automatically updates when programs are added, modified, or deleted 
          in the database, without requiring a page refresh.
        </p>
      </div>
    </div>
  );
};

export default RealtimeProgramList; 