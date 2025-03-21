import { progressService } from '../../services/progressService';
import { supabase } from '../../services/supabase';

// Mock dependencies
jest.mock('../../services/supabase');

describe('ProgressService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getProgressById', () => {
    const mockProgressId = 'progress-123';
    const mockUserId = 'user-456';
    const mockProgress = {
      id: mockProgressId,
      user_id: mockUserId,
      module_id: 'module-789',
      status: 'in_progress',
      completion_percentage: 50,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z'
    };

    it('should return progress by ID successfully', async () => {
      // Mock supabase select to return progress
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProgress,
              error: null
            })
          })
        })
      });

      // Call the method
      const result = await progressService.getProgressById(mockProgressId, mockUserId);

      // Assertions
      expect(result.data).toEqual(mockProgress);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
      expect((supabase.from as jest.Mock).mock.results[0].value.select).toHaveBeenCalled();
      expect((supabase.from as jest.Mock).mock.results[0].value.select().eq).toHaveBeenCalledWith('id', mockProgressId);
    });

    it('should handle database error when fetching progress', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase select to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      });

      // Call the method
      const result = await progressService.getProgressById(mockProgressId, mockUserId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });

    it('should handle unexpected errors during database query', async () => {
      // Mock supabase to throw an error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockRejectedValue(new Error('Unexpected error'))
          })
        })
      });

      // Call the method
      const result = await progressService.getProgressById(mockProgressId, mockUserId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Failed to get progress by ID',
        details: 'Unexpected error'
      }));
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });
  });

  describe('createProgress', () => {
    const mockUserId = 'user-456';
    const mockModuleId = 'module-789';
    const mockProgressData = {
      user_id: mockUserId,
      module_id: mockModuleId,
      program_id: 'program-123',
      status: 'not_started',
      last_accessed_at: new Date().toISOString()
    };
    const mockCreatedProgress = {
      id: 'progress-123',
      ...mockProgressData,
      completion_percentage: 0,
      attempts: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    it('should create progress successfully', async () => {
      // Mock supabase insert to return created progress
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreatedProgress,
              error: null
            })
          })
        })
      });

      // Call the method
      const result = await progressService.createProgress(mockProgressData);

      // Assertions
      expect(result.data).toEqual(mockCreatedProgress);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
      expect((supabase.from as jest.Mock).mock.results[0].value.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          module_id: mockModuleId,
          attempts: 1,
          completion_percentage: 0
        })
      );
    });

    it('should handle database error when creating progress', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase insert to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      });

      // Call the method
      const result = await progressService.createProgress(mockProgressData);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });

    it('should handle unexpected errors during database insert', async () => {
      // Mock supabase to throw an error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Unexpected error'))
          })
        })
      });

      // Call the method
      const result = await progressService.createProgress(mockProgressData);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Failed to create progress entry',
        details: 'Unexpected error'
      }));
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });
  });

  describe('deleteProgress', () => {
    const mockProgressId = 'progress-123';
    const mockDeletedProgress = {
      id: mockProgressId,
      user_id: 'user-456',
      module_id: 'module-789',
      status: 'completed',
      completion_percentage: 100
    };

    it('should delete progress successfully', async () => {
      // Mock supabase delete to return deleted progress
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDeletedProgress,
                error: null
              })
            })
          })
        })
      });

      // Call the method
      const result = await progressService.deleteProgress(mockProgressId);

      // Assertions
      expect(result.data).toEqual(mockDeletedProgress);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
      expect((supabase.from as jest.Mock).mock.results[0].value.delete).toHaveBeenCalled();
      expect((supabase.from as jest.Mock).mock.results[0].value.delete().eq).toHaveBeenCalledWith('id', mockProgressId);
    });

    it('should handle database error when deleting progress', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase delete to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError
              })
            })
          })
        })
      });

      // Call the method
      const result = await progressService.deleteProgress(mockProgressId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });

    it('should handle unexpected errors during database delete', async () => {
      // Mock supabase to throw an error
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Unexpected error'))
            })
          })
        })
      });

      // Call the method
      const result = await progressService.deleteProgress(mockProgressId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Failed to delete progress entry',
        details: 'Unexpected error'
      }));
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });
  });

  describe('completeModule', () => {
    const mockProgressId = 'progress-123';
    const mockProgressData = {
      status: 'completed',
      score: 95,
      last_accessed_at: new Date().toISOString()
    };
    const mockCompletedProgress = {
      id: mockProgressId,
      user_id: 'user-456',
      module_id: 'module-789',
      status: 'completed',
      completion_percentage: 100,
      score: 95,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    };

    it('should complete module successfully', async () => {
      // Mock supabase update to return completed progress
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCompletedProgress,
                error: null
              })
            })
          })
        })
      });

      // Call the method
      const result = await progressService.completeModule(mockProgressId, mockProgressData);

      // Assertions
      expect(result.data).toEqual(mockCompletedProgress);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
      expect((supabase.from as jest.Mock).mock.results[0].value.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completion_percentage: 100,
          score: 95
        })
      );
      expect((supabase.from as jest.Mock).mock.results[0].value.update().eq).toHaveBeenCalledWith('id', mockProgressId);
    });

    it('should handle database error when completing module', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase update to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError
              })
            })
          })
        })
      });

      // Call the method
      const result = await progressService.completeModule(mockProgressId, mockProgressData);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });

    it('should use provided completed_at or default to current time', async () => {
      const customCompletedAt = '2023-05-15T12:00:00Z';
      const mockProgressWithCustomDate = {
        ...mockProgressData,
        completed_at: customCompletedAt
      };
      
      // Mock supabase update to return completed progress
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockCompletedProgress, completed_at: customCompletedAt },
                error: null
              })
            })
          })
        })
      });

      // Call the method with custom completed_at
      const result = await progressService.completeModule(mockProgressId, mockProgressWithCustomDate);

      // Assertions
      expect(result.data.completed_at).toEqual(customCompletedAt);
      expect((supabase.from as jest.Mock).mock.results[0].value.update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed_at: customCompletedAt
        })
      );
    });

    it('should handle unexpected errors during database update', async () => {
      // Mock supabase to throw an error
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Unexpected error'))
            })
          })
        })
      });

      // Call the method
      const result = await progressService.completeModule(mockProgressId, mockProgressData);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Failed to complete module',
        details: 'Unexpected error'
      }));
      expect(supabase.from).toHaveBeenCalledWith('user_progress');
    });
  });
}); 