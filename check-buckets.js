// Script to check for existing storage buckets in Supabase
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

async function listBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    console.log('Available buckets:');
    data.forEach(bucket => {
      console.log(`- ${bucket.name}`);
    });
    
    // Check for specific buckets
    console.log('\nChecking for specific buckets:');
    console.log('program_thumbnails exists:', data.some(b => b.name === 'program_thumbnails'));
    console.log('course_thumbnails exists:', data.some(b => b.name === 'course_thumbnails'));
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listBuckets(); 