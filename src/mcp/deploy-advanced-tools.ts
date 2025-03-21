import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables with priority for .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// First try to load .env.local, then fall back to .env
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Loaded environment variables from .env.local');
} else {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or service key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlFile(filename: string) {
  console.log(`Executing SQL file: ${filename}`);
  try {
    const filePath = join(__dirname, filename);
    const sql = readFileSync(filePath, 'utf8');
    
    const { data, error } = await supabase.rpc('execute_sql', { sql_string: sql });
    
    if (error) {
      console.error(`Error executing ${filename}:`, error);
    } else {
      console.log(`Successfully executed ${filename}`);
      return data;
    }
  } catch (err) {
    console.error(`Error reading/executing ${filename}:`, err);
  }
}

async function deploy() {
  console.log('Deploying advanced database tools...');
  
  // Execute SQL files in sequence
  await executeSqlFile('fix-information-schema-access.sql');
  console.log('✅ Deployed constraint detection functions');
  
  await executeSqlFile('add-rls-policies.sql');
  console.log('✅ Deployed RLS policies');
  
  await executeSqlFile('create-sample-data.sql');
  console.log('✅ Created sample data');
  
  console.log('\nRefreshing schema cache...');
  await supabase.rpc('refresh_schema_cache');
  console.log('✅ Schema cache refreshed');
  
  console.log('\nDeployment complete! 🎉');
}

deploy().catch(console.error); 