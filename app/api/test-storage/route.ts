import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase-client';
import logger from '@/lib/logger';
import { getCurrentUserWithRoles } from '@/lib/supabase-client';

export async function GET() {
  try {
    // Get current user to check authentication
    const user = await getCurrentUserWithRoles();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Bucket name
    const BUCKET_NAME = 'program-images';
    
    // Check upload permission with a simple test
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'permission-test.txt', { type: 'text/plain' });
    
    const testPath = `test-${Date.now()}.txt`;
    
    // Test upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(testPath, testFile, {
        contentType: 'text/plain',
        upsert: true
      });
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(testPath);
    
    let deleteResult = null;
    let deleteError: Error | null = null;
    
    // Clean up the test file if upload succeeded
    if (uploadData) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([testPath]);
        
      deleteResult = data;
      if (error) {
        deleteError = new Error(String(error));
      }
    }
    
    if (uploadError) {
      return NextResponse.json({ 
        error: 'Failed to upload test file', 
        details: String(uploadError),
        instructions: `
          Please make sure the 'program-images' bucket exists in Supabase Storage and has the following RLS policy:
          
          CREATE POLICY "Authenticated users can upload/delete images"
          ON storage.objects FOR ALL
          USING (auth.role() = 'authenticated')
          WITH CHECK (auth.role() = 'authenticated');
          
          Also, ensure the bucket is set to public.
        `,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
      upload: {
        success: !!uploadData,
        path: testPath,
        publicUrl: urlData?.publicUrl
      },
      delete: {
        success: !!deleteResult,
        error: deleteError ? deleteError.message : null
      },
      message: 'Supabase Storage permissions look good!'
    });
    
  } catch (error) {
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      logger.error('Error testing Supabase storage', error);
    } else {
      logger.error('Error testing Supabase storage', new Error(String(error)));
    }
    
    return NextResponse.json({ 
      error: 'Error testing Supabase storage', 
      details: errorMessage,
      instructions: `
        Please make sure the 'program-images' bucket exists in Supabase Storage and has the following RLS policy:
        
        CREATE POLICY "Authenticated users can upload/delete images"
        ON storage.objects FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
        
        Also, ensure the bucket is set to public.
      `
    }, { status: 500 });
  }
} 