import { moduleService } from '../../services/moduleService';
import api from '../../services/apiService';

// Mock dependencies
jest.mock('../../services/apiService');

describe('ModuleService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getModulesByLesson', () => {
    const mockLessonId = 'lesson-123';
    const mockModules = [
      { id: 'module-1', title: 'Module 1', lesson_id: mockLessonId },
      { id: 'module-2', title: 'Module 2', lesson_id: mockLessonId }
    ];

    it('should return modules for a specific lesson successfully', async () => {
      // Mock API get to return modules
      (api.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockModules,
        error: null
      });

      // Call the method
      const result = await moduleService.getModulesByLesson(mockLessonId);

      // Assertions
      expect(result.data).toEqual(mockModules);
      expect(result.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith(`/university/modules?lessonId=${mockLessonId}`);
    });

    it('should handle API error when fetching modules by lesson', async () => {
      const mockError = {
        message: 'Failed to fetch modules by lesson',
        code: 'API_ERROR'
      };

      // Mock API get to return an error
      (api.get as jest.Mock).mockResolvedValue({
        success: false,
        data: null,
        error: mockError
      });

      // Call the method
      const result = await moduleService.getModulesByLesson(mockLessonId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Failed to fetch modules by lesson')
      }));
      expect(api.get).toHaveBeenCalledWith(`/university/modules?lessonId=${mockLessonId}`);
    });

    it('should handle unexpected errors during API request', async () => {
      // Mock API get to throw an error
      (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Call the method
      const result = await moduleService.getModulesByLesson(mockLessonId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Network error',
        code: 'UNKNOWN_ERROR'
      }));
      expect(api.get).toHaveBeenCalledWith(`/university/modules?lessonId=${mockLessonId}`);
    });
  });

  describe('getAllModules', () => {
    const mockModules = [
      { id: 'module-1', title: 'Module 1' },
      { id: 'module-2', title: 'Module 2' },
      { id: 'module-3', title: 'Module 3' }
    ];

    it('should return all modules successfully', async () => {
      // Mock API get to return modules
      (api.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockModules,
        error: null
      });

      // Call the method
      const result = await moduleService.getAllModules();

      // Assertions
      expect(result.data).toEqual(mockModules);
      expect(result.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith('/university/modules');
    });

    it('should handle API error when fetching all modules', async () => {
      const mockError = {
        message: 'Failed to fetch all modules',
        code: 'API_ERROR'
      };

      // Mock API get to return an error
      (api.get as jest.Mock).mockResolvedValue({
        success: false,
        data: null,
        error: mockError
      });

      // Call the method
      const result = await moduleService.getAllModules();

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Failed to fetch all modules')
      }));
      expect(api.get).toHaveBeenCalledWith('/university/modules');
    });

    it('should handle unexpected errors during API request', async () => {
      // Mock API get to throw an error
      (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Call the method
      const result = await moduleService.getAllModules();

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: 'Network error',
        code: 'UNKNOWN_ERROR'
      }));
      expect(api.get).toHaveBeenCalledWith('/university/modules');
    });

    it('should return empty data array when API returns empty results', async () => {
      // Mock API get to return empty array
      (api.get as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        error: null
      });

      // Call the method
      const result = await moduleService.getAllModules();

      // Assertions
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith('/university/modules');
    });
  });

  describe('getModuleById', () => {
    const mockModuleId = 'module-123';
    const mockModule = { id: mockModuleId, title: 'Test Module' };

    it('should return a module by ID successfully', async () => {
      // Mock API get to return a module
      (api.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockModule,
        error: null
      });

      // Call the method
      const result = await moduleService.getModuleById(mockModuleId);

      // Assertions
      expect(result.data).toEqual(mockModule);
      expect(result.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith(`/university/modules/${mockModuleId}`);
    });

    it('should handle API error when fetching a module by ID', async () => {
      const mockError = {
        message: 'Failed to fetch module',
        code: 'API_ERROR'
      };

      // Mock API get to return an error
      (api.get as jest.Mock).mockResolvedValue({
        success: false,
        data: null,
        error: mockError
      });

      // Call the method
      const result = await moduleService.getModuleById(mockModuleId);

      // Assertions
      expect(result.data).toBeNull();
      expect(result.error).toEqual(expect.objectContaining({
        message: expect.stringContaining('Failed to fetch module')
      }));
      expect(api.get).toHaveBeenCalledWith(`/university/modules/${mockModuleId}`);
    });
  });
}); 