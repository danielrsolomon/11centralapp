// Script to create necessary storage buckets in Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const matches = line.match(/^([^=]+)=(.*)$/);
      if (matches) {
        const key = matches[1].trim();
        const value = matches[2].trim().replace(/^['"](.*)['"]$/, '$1');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (err) {
    console.error('Error reading .env.local file:', err.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBuckets() {
  try {
    // Get list of existing buckets first
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const existingBucketNames = existingBuckets.map(bucket => bucket.name);
    console.log('Existing buckets:', existingBucketNames);
    
    // Create program_thumbnails bucket if it doesn't exist
    if (!existingBucketNames.includes('program_thumbnails')) {
      console.log('Creating program_thumbnails bucket...');
      const { data, error } = await supabase.storage.createBucket('program_thumbnails', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating program_thumbnails bucket:', error);
      } else {
        console.log('program_thumbnails bucket created successfully');
      }
    } else {
      console.log('program_thumbnails bucket already exists');
    }
    
    // Create course_thumbnails bucket if it doesn't exist
    if (!existingBucketNames.includes('course_thumbnails')) {
      console.log('Creating course_thumbnails bucket...');
      const { data, error } = await supabase.storage.createBucket('course_thumbnails', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating course_thumbnails bucket:', error);
      } else {
        console.log('course_thumbnails bucket created successfully');
      }
    } else {
      console.log('course_thumbnails bucket already exists');
    }
    
    // List buckets again to confirm
    const { data: updatedBuckets, error: updateListError } = await supabase.storage.listBuckets();
    
    if (updateListError) {
      console.error('Error listing updated buckets:', updateListError);
      return;
    }
    
    console.log('\nUpdated list of buckets:');
    updatedBuckets.forEach(bucket => {
      console.log(`- ${bucket.name}`);
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createBuckets(); 