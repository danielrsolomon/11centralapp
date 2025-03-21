import { programService } from '../../services/programService';
import { storageService } from '../../services/storageService';
import { supabase } from '../../services/supabase';

// Mock dependencies
jest.mock('../../services/storageService');
jest.mock('../../services/supabase');

describe('ProgramService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createProgramWithThumbnail', () => {
    const mockFile = new File(['dummy content'], 'thumbnail.jpg', { type: 'image/jpeg' });
    const mockProgramData = {
      title: 'Test Program',
      description: 'Test description',
      published: true,
      department_ids: ['dep-123']
    };
    const mockThumbnailUrl = 'https://example.com/thumbnail.jpg';
    const mockProgramId = 'program-123';

    it('should successfully create a program with thumbnail', async () => {
      // Mock storageService.uploadFile to return success with a public URL
      (storageService.uploadFile as jest.Mock).mockResolvedValue({
        success: true,
        data: { publicUrl: mockThumbnailUrl },
        error: null
      });

      // Mock supabase create to return success
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: mockProgramId, ...mockProgramData, thumbnail_url: mockThumbnailUrl }],
            error: null
          })
        })
      });

      // Mock upsert for department association
      const upsertMock = jest.fn().mockResolvedValue({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: mockProgramId, ...mockProgramData, thumbnail_url: mockThumbnailUrl }],
            error: null
          })
        })
      }).mockReturnValueOnce({
        upsert: upsertMock
      });

      // Call the method
      const result = await programService.createProgramWithThumbnail(
        mockProgramData,
        mockFile
      );

      // Assertions
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: mockProgramId,
        title: mockProgramData.title,
        thumbnail_url: mockThumbnailUrl
      }));
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        mockFile,
        expect.any(String),
        expect.any(Array)
      );
      expect(supabase.from).toHaveBeenCalledWith('programs');
      expect(supabase.from).toHaveBeenCalledWith('program_departments');
    });

    it('should handle thumbnail upload failure', async () => {
      // Mock storageService.uploadFile to return an error
      (storageService.uploadFile as jest.Mock).mockResolvedValue({
        success: false,
        data: null,
        error: { message: 'Upload failed', code: 'UPLOAD_ERROR' }
      });

      // Call the method
      const result = await programService.createProgramWithThumbnail(
        mockProgramData,
        mockFile
      );

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Upload failed')
      }));
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalledWith('programs');
    });

    it('should create program without thumbnail if no file is provided', async () => {
      // Mock supabase create to return success
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: mockProgramId, ...mockProgramData }],
            error: null
          })
        })
      });
      
      // Mock upsert for department association
      const upsertMock = jest.fn().mockResolvedValue({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: mockProgramId, ...mockProgramData }],
            error: null
          })
        })
      }).mockReturnValueOnce({
        upsert: upsertMock
      });

      // Call the method without a file
      const result = await programService.createProgramWithThumbnail(
        mockProgramData
      );

      // Assertions
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: mockProgramId,
        title: mockProgramData.title
      }));
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });

    it('should handle program creation failure', async () => {
      // Mock storageService.uploadFile to return success
      (storageService.uploadFile as jest.Mock).mockResolvedValue({
        success: true,
        data: { publicUrl: mockThumbnailUrl },
        error: null
      });

      // Mock supabase create to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Creation failed', code: 'DB_ERROR' }
          })
        })
      });

      // Call the method
      const result = await programService.createProgramWithThumbnail(
        mockProgramData,
        mockFile
      );

      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Creation failed')
      }));
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });
  });

  describe('getAllPrograms', () => {
    it('should return all programs successfully', async () => {
      const mockPrograms = [
        { id: 'program-1', title: 'Program 1' },
        { id: 'program-2', title: 'Program 2' }
      ];

      // Mock supabase select to return programs
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockPrograms,
            error: null
          })
        })
      });

      // Call the method
      const result = await programService.getAllPrograms();

      // Assertions
      expect(result.data).toEqual(mockPrograms);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });

    it('should handle database error when fetching programs', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase select to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: mockError
          })
        })
      });

      // Call the method
      const result = await programService.getAllPrograms();

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });
  });

  describe('getProgramById', () => {
    const mockProgramId = 'program-123';
    const mockProgram = { id: mockProgramId, title: 'Test Program' };

    it('should return a program by ID successfully', async () => {
      // Mock supabase select to return a program
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null
            })
          })
        })
      });

      // Call the method
      const result = await programService.getProgramById(mockProgramId);

      // Assertions
      expect(result.data).toEqual(mockProgram);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });

    it('should return null with no error when program not found', async () => {
      // Mock supabase select to return null data without an error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' }
            })
          })
        })
      });

      // Call the method
      const result = await programService.getProgramById(mockProgramId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe('PGRST116');
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });

    it('should handle database error when fetching a program', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      // Mock supabase select to return an error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      });

      // Call the method
      const result = await programService.getProgramById(mockProgramId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(supabase.from).toHaveBeenCalledWith('programs');
    });
  });
}); 