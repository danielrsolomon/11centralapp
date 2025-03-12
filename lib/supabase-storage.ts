import { v4 as uuidv4 } from 'uuid';
import supabase from './supabase-client';
import logger from './logger';

// Use the 'avatars' bucket which should exist by default in Supabase projects
const STORAGE_BUCKET = 'avatars';

/**
 * Creates a data URL from a file as a fallback when storage upload fails
 * 
 * @param file - The file to convert to a data URL
 * @returns A Promise that resolves to the data URL
 */
async function createDataUrlFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl);
    };
    reader.onerror = (event) => {
      reject(new Error('Failed to create data URL fallback'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to Supabase storage
 * 
 * @param file - The file to upload
 * @param prefix - Optional prefix for the file name (e.g., "program-")
 * @returns The public URL of the uploaded image or a data URL as fallback
 * @throws Error if upload fails and fallback also fails
 */
export async function uploadImage(file: File, prefix = 'program-'): Promise<string> {
  try {
    // Generate a unique filename with original extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}${uuidv4()}.${fileExt}`;
    const filePath = fileName;

    logger.debug('Uploading image to Supabase storage', { fileName, contentType: file.type, bucket: STORAGE_BUCKET });

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      logger.warn('Error uploading image to storage, falling back to data URL', error);
      // Convert to data URL as fallback
      return await createDataUrlFallback(file);
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    logger.debug('Image uploaded successfully', { 
      path: data.path, 
      publicUrl: publicUrlData.publicUrl 
    });

    return publicUrlData.publicUrl;
  } catch (error) {
    logger.error('Unexpected error uploading image', error as Error);
    
    // Try data URL as last resort fallback
    try {
      return await createDataUrlFallback(file);
    } catch (fallbackError) {
      logger.error('Failed to create data URL fallback', fallbackError as Error);
      throw new Error('Failed to upload image and fallback also failed');
    }
  }
}

/**
 * Checks if a URL is a placeholder image URL
 * 
 * @param url - The URL to check
 * @returns true if the URL is a placeholder image
 */
export function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return url.includes('via.placeholder.com') || url.includes('placeholder.com');
}

/**
 * Deletes an image from Supabase storage
 * 
 * @param url - The public URL of the image to delete
 * @returns true if deletion was successful
 */
export async function deleteImage(url: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const urlObj = new URL(url);
    const pathnameParts = urlObj.pathname.split('/');
    const bucketIndex = pathnameParts.findIndex(part => part === STORAGE_BUCKET);
    
    if (bucketIndex === -1) {
      logger.warn('Failed to extract file path from URL', { url });
      return false;
    }
    
    const filePath = pathnameParts.slice(bucketIndex + 1).join('/');
    
    logger.debug('Deleting image from Supabase storage', { filePath });
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);
    
    if (error) {
      logger.error('Error deleting image from storage', error);
      return false;
    }
    
    logger.debug('Image deleted successfully', { filePath });
    return true;
  } catch (err) {
    // Ensure error is properly typed for logger.error
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Unexpected error deleting image', error);
    return false;
  }
} 