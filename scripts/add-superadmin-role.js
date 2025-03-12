/**
 * Add Superadmin Role Script
 * 
 * This script adds the 'superadmin' role to a user in the database.
 * It can be used to promote a user to superadmin status.
 * 
 * Usage:
 *   node scripts/add-superadmin-role.js <user_id|email>
 * 
 * Example:
 *   node scripts/add-superadmin-role.js admin@example.com
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ANSI color codes for nicer console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log with timestamp and optional color
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
  console.log(`[${timestamp}] ${color}${message}${colors.reset}`);
}

// Create a Supabase client with admin privileges
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    log('Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local', colors.red);
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a yes/no question
function askYesNo(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Main function to add superadmin role
async function addSuperadminRole() {
  try {
    // Get user identifier from command line arguments
    const userIdentifier = process.argv[2];
    
    if (!userIdentifier) {
      log('Usage: node scripts/add-superadmin-role.js <user_id|email>', colors.yellow);
      process.exit(1);
    }
    
    log(`Adding superadmin role to user: ${userIdentifier}`, colors.cyan);
    
    const supabase = createAdminClient();
    
    // Determine if the input is an email or UUID
    const isEmail = userIdentifier.includes('@');
    const query = supabase
      .from('users')
      .select('id, email, role, is_admin');
    
    // Search by email or ID
    if (isEmail) {
      query.eq('email', userIdentifier);
    } else {
      query.eq('id', userIdentifier);
    }
    
    // Get the user
    const { data: user, error } = await query.single();
    
    if (error) {
      log(`Error fetching user: ${error.message}`, colors.red);
      process.exit(1);
    }
    
    if (!user) {
      log(`User not found: ${userIdentifier}`, colors.red);
      process.exit(1);
    }
    
    log(`\nFound user:`, colors.bright);
    log(`ID: ${user.id}`, colors.cyan);
    log(`Email: ${user.email}`, colors.cyan);
    log(`Current Role: ${user.role || 'Not set'}`, colors.cyan);
    log(`Is Admin Flag: ${user.is_admin ? 'Yes' : 'No'}`, user.is_admin ? colors.green : colors.dim);
    
    // Check if user already has superadmin role
    if (user.role === 'superadmin') {
      log(`\nUser already has the 'superadmin' role.`, colors.green);
      
      // Check if is_admin flag is not set
      if (!user.is_admin) {
        const setAdminFlag = await askYesNo(`\nUser's is_admin flag is not set. Do you want to set it to true?`);
        
        if (setAdminFlag) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_admin: true })
            .eq('id', user.id);
          
          if (updateError) {
            log(`Error updating is_admin flag: ${updateError.message}`, colors.red);
          } else {
            log(`✅ Successfully set is_admin flag to true for ${user.email}`, colors.green);
          }
        }
      }
      
      process.exit(0);
    }
    
    // Confirm the update
    const proceed = await askYesNo(`\nDo you want to set this user's role to 'superadmin'?`);
    
    if (!proceed) {
      log('Operation cancelled by user.', colors.yellow);
      process.exit(0);
    }
    
    // Update the user role
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'superadmin',
        is_admin: true // Also set is_admin flag to true
      })
      .eq('id', user.id);
    
    if (updateError) {
      log(`Error updating user: ${updateError.message}`, colors.red);
      process.exit(1);
    }
    
    log(`\n✅ Successfully updated ${user.email}:`, colors.green);
    log(`- Role changed from "${user.role || 'Not set'}" to "superadmin"`, colors.green);
    log(`- is_admin flag set to true`, colors.green);
    
    log(`\nUser now has full permissions, including content creation capabilities.`, colors.bright);
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Run the main function
addSuperadminRole(); 