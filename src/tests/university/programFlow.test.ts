import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { programService } from '../../services/programService';
import { storageService } from '../../services/storageService';
import api from '../../services/apiService';

// Mock the services
vi.mock('../../services/storageService', () => ({
  storageService: {
    uploadFile: vi.fn()
  }
}));

vi.mock('../../services/apiService', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../services/baseDataService', () => ({
  BaseDataService: class {
    private endpoint: string;
    
    constructor(endpoint: string) {
      this.endpoint = endpoint;
    }
    
    create = vi.fn();
  }
}));

describe('University Program Flow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Program Creation with Thumbnail', () => {
    it('should successfully create a program with thumbnail', async () => {
      // Mock file upload success
      const mockFile = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
      const mockUploadResponse = {
        success: true,
        data: {
          path: 'program_thumbnails/test-image.png',
          publicUrl: 'https://example.com/storage/program_thumbnails/test-image.png'
        },
        error: null
      };
      
      // Mock program creation success
      const mockProgram = {
        id: 'test-program-id',
        title: 'Test Program',
        description: 'Test Description',
        thumbnail_url: 'https://example.com/storage/program_thumbnails/test-image.png',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockCreateResponse = {
        data: mockProgram,
        error: null
      };
      
      // Mock department association success
      const mockDepartmentResponse = {
        success: true,
        data: [{ program_id: 'test-program-id', department_id: 'dept-1' }],
        error: null
      };
      
      // Setup mocks
      vi.mocked(storageService.uploadFile).mockResolvedValue(mockUploadResponse);
      vi.mocked(programService['create']).mockResolvedValue(mockCreateResponse);
      vi.mocked(api.post).mockResolvedValue(mockDepartmentResponse);
      
      // Call the service method
      const programData = {
        title: 'Test Program',
        description: 'Test Description',
        status: 'active',
      };
      
      const departmentIds = ['dept-1'];
      const result = await programService.createProgramWithThumbnail(
        programData,
        mockFile,
        departmentIds
      );
      
      // Assertions
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        'media',
        mockFile,
        'program_thumbnails',
        expect.any(Array)
      );
      
      expect(programService['create']).toHaveBeenCalledWith({
        ...programData,
        thumbnail_url: mockUploadResponse.data?.publicUrl,
      });
      
      expect(api.post).toHaveBeenCalledWith('/university/program-departments', [
        { program_id: mockProgram.id, department_id: 'dept-1' }
      ]);
      
      expect(result).toEqual({
        data: mockProgram,
        error: null
      });
    });

    it('should handle thumbnail upload error gracefully', async () => {
      // Mock file upload failure
      const mockFile = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
      const mockUploadResponse = {
        success: false,
        data: null,
        error: {
          message: 'Upload failed',
          code: 'STORAGE_ERROR'
        }
      };
      
      // Setup mocks
      vi.mocked(storageService.uploadFile).mockResolvedValue(mockUploadResponse);
      
      // Call the service method
      const programData = {
        title: 'Test Program',
        description: 'Test Description',
        status: 'active',
      };
      
      const result = await programService.createProgramWithThumbnail(
        programData,
        mockFile
      );
      
      // Assertions
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(programService['create']).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Failed to upload thumbnail');
    });
  });

  describe('Program Listing', () => {
    it('should fetch published programs successfully', async () => {
      // Mock successful program fetch
      const mockPrograms = [
        {
          id: 'program-1',
          title: 'Program 1',
          description: 'Description 1',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'program-2',
          title: 'Program 2',
          description: 'Description 2',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      const mockResponse = {
        success: true,
        data: mockPrograms,
        error: null
      };
      
      // Setup mock
      vi.mocked(api.get).mockResolvedValue(mockResponse);
      
      // Call the service method
      const result = await programService.getPublishedPrograms();
      
      // Assertions
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/university/programs/published'));
      expect(result.data).toEqual(mockPrograms);
      expect(result.error).toBeNull();
    });

    it('should handle errors when fetching programs', async () => {
      // Mock API error
      const mockError = {
        success: false,
        data: null,
        error: {
          message: 'Failed to fetch programs',
          code: 'API_ERROR'
        }
      };
      
      // Setup mock
      vi.mocked(api.get).mockResolvedValue(mockError);
      
      // Call the service method
      const result = await programService.getPublishedPrograms();
      
      // Assertions
      expect(api.get).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Integration between components', () => {
    it('should maintain data consistency throughout the flow', async () => {
      // Step 1: Create a program with thumbnail
      const mockFile = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
      const mockUploadResponse = {
        success: true,
        data: {
          path: 'program_thumbnails/test-image.png',
          publicUrl: 'https://example.com/storage/program_thumbnails/test-image.png'
        },
        error: null
      };
      
      const newProgram = {
        id: 'new-program-id',
        title: 'New Test Program',
        description: 'This is a new test program',
        thumbnail_url: 'https://example.com/storage/program_thumbnails/test-image.png',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockCreateResponse = {
        data: newProgram,
        error: null
      };
      
      // Mock association success
      const mockDepartmentResponse = {
        success: true,
        data: [{ program_id: 'new-program-id', department_id: 'dept-1' }],
        error: null
      };
      
      // Step 2: List programs including the new one
      const existingPrograms = [
        {
          id: 'existing-program-id',
          title: 'Existing Program',
          description: 'This is an existing program',
          status: 'published',
          created_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
          updated_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      const updatedProgramsList = [...existingPrograms, newProgram];
      
      const mockListResponse = {
        success: true,
        data: updatedProgramsList,
        error: null
      };
      
      // Setup mocks
      vi.mocked(storageService.uploadFile).mockResolvedValue(mockUploadResponse);
      vi.mocked(programService['create']).mockResolvedValue(mockCreateResponse);
      vi.mocked(api.post).mockResolvedValue(mockDepartmentResponse);
      
      // For the listing step
      vi.mocked(api.get).mockResolvedValue(mockListResponse);
      
      // Execute the flow
      
      // Step 1: Create program
      const programData = {
        title: 'New Test Program',
        description: 'This is a new test program',
        status: 'published',
      };
      
      const departmentIds = ['dept-1'];
      const createResult = await programService.createProgramWithThumbnail(
        programData,
        mockFile,
        departmentIds
      );
      
      // Step 2: List programs
      const listResult = await programService.getPublishedPrograms();
      
      // Assertions for the entire flow
      expect(createResult.data).toEqual(newProgram);
      expect(listResult.data).toContainEqual(newProgram);
      
      // Verify data consistency
      const createdProgram = createResult.data;
      const listedProgram = listResult.data?.find(p => p.id === 'new-program-id');
      
      expect(listedProgram).toBeDefined();
      expect(listedProgram?.title).toEqual(createdProgram?.title);
      expect(listedProgram?.description).toEqual(createdProgram?.description);
      expect(listedProgram?.thumbnail_url).toEqual(createdProgram?.thumbnail_url);
    });
  });
}); 