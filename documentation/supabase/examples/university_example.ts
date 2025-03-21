/**
 * University Module - API-First Integration Example
 * 
 * This file demonstrates the correct pattern for interacting with the University
 * module using the API-first approach.
 */

// CORRECT USAGE: Use the universityService which makes API calls
import { universityService } from '../../../src/services/universityService';
import { useState, useEffect } from 'react';

// ----- Example React component using the API-first approach -----
export const ProgramListComponent = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load programs on component mount
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      // Use the universityService to fetch programs through the API
      const response = await universityService.getPublishedPrograms();
      
      if (response.success) {
        setPrograms(response.data);
        setError(null);
      } else {
        console.error('Failed to load programs:', response.error);
        setError(response.error.message || 'Failed to load programs');
      }
    } catch (err) {
      console.error('Error loading programs:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSelection = async (programId) => {
    try {
      // Fetch courses for the selected program using the API
      const response = await universityService.getCoursesByProgram(programId);
      
      if (response.success) {
        // Process courses...
        console.log('Courses for program:', response.data);
      } else {
        console.error('Failed to load courses:', response.error);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  // Example of tracking a user interaction
  const trackProgramView = async (programId) => {
    try {
      const userId = 'current-user-id'; // Get from auth context in real implementation
      await universityService.trackContentInteraction(
        userId,
        programId,
        'program',
        'view'
      );
    } catch (err) {
      // Non-critical error, just log
      console.warn('Could not track program view:', err);
    }
  };

  return (
    <div className="programs-container">
      <h1>Available Programs</h1>
      
      {loading && <div className="loading-spinner">Loading programs...</div>}
      
      {error && <div className="error-message">Error: {error}</div>}
      
      {!loading && !error && programs.length === 0 && (
        <div className="no-programs">No programs available</div>
      )}
      
      <div className="program-list">
        {programs.map(program => (
          <div 
            key={program.id} 
            className="program-card"
            onClick={() => {
              handleProgramSelection(program.id);
              trackProgramView(program.id);
            }}
          >
            <h2>{program.title}</h2>
            <p>{program.description}</p>
            {program.thumbnail_url && (
              <img src={program.thumbnail_url} alt={program.title} />
            )}
          </div>
        ))}
      </div>
      
      <button onClick={loadPrograms} disabled={loading}>
        Refresh Programs
      </button>
    </div>
  );
};

/**
 * ANTI-PATTERN: This is the INCORRECT way to access Supabase directly
 * DO NOT USE this approach in the E11EVEN Central application
 */
/* 
// ❌ INCORRECT: Direct Supabase client usage
import { supabase } from '../../../src/services/supabase';

// ❌ INCORRECT: This function makes direct Supabase calls from the client
export const incorrectGetPrograms = async () => {
  // Direct database call without going through the API
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('status', 'published')
    .order('order', { ascending: true });
    
  if (error) {
    console.error('Error fetching programs:', error);
    return { error: error.message, programs: [] };
  }
  
  return { programs: data || [] };
};
*/ 