import api, { apiRequest } from './apiService';

// Storage bucket names
export const BUCKETS = {
  PROGRAM_THUMBNAILS: 'program-thumbnails',
  MODULE_RESOURCES: 'module-resources',
  USER_AVATARS: 'user-avatars',
  GENERAL_ATTACHMENTS: 'general-attachments'
};

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'text/csv'
];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

/**
 * Service for managing file storage through API routes
 */
class StorageService {
  /**
   * Initialize buckets if they don't exist
   */
  async initializeBuckets() {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.post('/storage/initialize-buckets', {
        buckets: Object.values(BUCKETS)
      });
      
      if (!response.success) {
        console.error('Error initializing storage buckets:', response.error);
        return { success: false, error: response.error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error initializing storage buckets:', err);
      return { 
        success: false, 
        error: {
          message: 'Failed to initialize storage buckets',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * Upload a file to storage
   */
  async uploadFile(
    bucket: string, 
    file: File, 
    path: string = '', 
    allowedTypes: string[] = []
  ) {
    try {
      const startTime = performance.now();
      console.log(`StorageService: Starting file upload to ${bucket}/${path}`);
      
      // Validate file type if allowedTypes is provided
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: {
            message: 'Invalid file type',
            details: `Allowed types: ${allowedTypes.join(', ')}`
          }
        };
      }
      
      // Check file size - limit to 10MB for images to prevent large uploads
      if (file.size > 10 * 1024 * 1024 && allowedTypes.some(type => type.startsWith('image/'))) {
        console.warn(`StorageService: File size too large (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
        return {
          success: false,
          error: {
            message: 'File size too large',
            details: 'Image files should be less than 10MB'
          }
        };
      }
      
      // Compress images before upload if they're larger than 2MB
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
        try {
          console.log(`StorageService: Compressing image before upload (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
          fileToUpload = await this.compressImage(file);
          console.log(`StorageService: Compressed to ${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB`);
        } catch (compressError) {
          console.warn('StorageService: Image compression failed, using original file:', compressError);
          // Continue with original file if compression fails
        }
      }
      
      // Use a timeout to prevent hanging requests
      const UPLOAD_TIMEOUT = 30000; // 30 seconds
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`File upload timed out after ${UPLOAD_TIMEOUT / 1000}s`));
        }, UPLOAD_TIMEOUT);
      });
      
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('bucket', bucket);
      formData.append('path', path);
      
      // Race the upload against the timeout
      const uploadPromise = apiRequest('/storage/upload', {
        method: 'POST',
        headers: {
          // Don't set Content-Type here, let the browser set it with the boundary
          'Accept': 'application/json'
        },
        body: formData
      });
      
      // REFACTORED: Use Promise.race to add timeout protection
      const response = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      if (!response.success) {
        return {
          success: false,
          error: {
            message: response.error?.message || 'Failed to upload file',
            details: response.error?.details || ''
          }
        };
      }
      
      const endTime = performance.now();
      console.log(`StorageService: Upload completed in ${(endTime - startTime).toFixed(0)}ms`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Error uploading file:', err);
      return {
        success: false,
        error: {
          message: 'Failed to upload file',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * Compress an image file to reduce its size
   * @private
   */
  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      img.onload = () => {
        // Calculate new dimensions (max 1200px width/height while keeping aspect ratio)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        
        if (width > height && width > maxDimension) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with reduced quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            
            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Convert to JPEG for better compression
              lastModified: file.lastModified
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8 // Quality setting (80%)
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      // Load the image from the file
      img.src = URL.createObjectURL(file);
    });
  }
  
  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string) {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const response = await api.delete(`/storage/files`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          bucket,
          path
        }
      });
      
      if (!response.success) {
        return {
          success: false,
          error: {
            message: response.error?.message || 'Failed to delete file',
            details: response.error?.details || ''
          }
        };
      }
      
      return {
        success: true,
        data: null
      };
    } catch (err) {
      console.error('Error deleting file:', err);
      return {
        success: false,
        error: {
          message: 'Failed to delete file',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * List files in a storage bucket
   */
  async listFiles(bucket: string, path: string = '') {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const queryParams = new URLSearchParams({
        bucket,
        path
      });
      
      const response = await api.get(`/storage/list?${queryParams.toString()}`);
      
      if (!response.success) {
        return {
          success: false,
          error: {
            message: response.error?.message || 'Failed to list files',
            details: response.error?.details || ''
          }
        };
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Error listing files:', err);
      return {
        success: false,
        error: {
          message: 'Failed to list files',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * Get a public URL for a file
   */
  getPublicUrl(bucket: string, path: string) {
    // REFACTORED: Use API URL instead of direct Supabase URL
    return `/api/storage/public/${bucket}/${encodeURIComponent(path)}`;
  }
  
  /**
   * Get a temporary URL for a file
   */
  async getTemporaryUrl(bucket: string, path: string, expiresIn: number = 3600) {
    try {
      // REFACTORED: Replaced direct Supabase call with API request
      const queryParams = new URLSearchParams({
        bucket,
        path,
        expiresIn: expiresIn.toString()
      });
      
      const response = await api.get(`/storage/temp-url?${queryParams.toString()}`);
      
      if (!response.success) {
        return {
          success: false,
          error: {
            message: response.error?.message || 'Failed to get temporary URL',
            details: response.error?.details || ''
          }
        };
      }
      
      return {
        success: true,
        data: {
          signedUrl: response.data.signedUrl
        }
      };
    } catch (err) {
      console.error('Error getting temporary URL:', err);
      return {
        success: false,
        error: {
          message: 'Failed to get temporary URL',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * Update a file in storage
   */
  async updateFile(
    bucket: string, 
    oldPath: string | null, 
    file: File, 
    path: string = '', 
    allowedTypes: string[] = []
  ) {
    try {
      // First delete the old file if it exists
      if (oldPath) {
        await this.deleteFile(bucket, oldPath);
      }
      
      // Then upload the new file
      return await this.uploadFile(bucket, file, path, allowedTypes);
    } catch (err) {
      console.error('Error updating file:', err);
      return {
        success: false,
        error: {
          message: 'Failed to update file',
          details: err instanceof Error ? err.message : String(err)
        }
      };
    }
  }
  
  /**
   * Upload a program thumbnail
   */
  async uploadProgramThumbnail(programId: string, file: File) {
    console.log(`StorageService: Starting program thumbnail upload for program ${programId}`);
    const startTime = performance.now();
    
    // Generate a unique path with program ID and timestamp
    const path = `program-${programId}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    
    const result = await this.uploadFile(
      BUCKETS.PROGRAM_THUMBNAILS,
      file,
      path,
      ALLOWED_IMAGE_TYPES
    );
    
    const endTime = performance.now();
    console.log(`StorageService: Program thumbnail upload completed in ${(endTime - startTime).toFixed(0)}ms`);
    
    return result;
  }
  
  /**
   * Upload a module resource
   */
  async uploadModuleResource(moduleId: string, file: File) {
    const path = `module-${moduleId}-${file.name.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
    return await this.uploadFile(
      BUCKETS.MODULE_RESOURCES,
      file,
      path,
      [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
    );
  }
  
  /**
   * Upload a user avatar
   */
  async uploadUserAvatar(userId: string, file: File) {
    const path = `user-${userId}-${Date.now()}`;
    return await this.uploadFile(
      BUCKETS.USER_AVATARS,
      file,
      path,
      ALLOWED_IMAGE_TYPES
    );
  }
}

export const storageService = new StorageService(); 