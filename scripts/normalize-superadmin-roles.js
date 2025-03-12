/**
 * Normalize Superadmin Roles
 * 
 * This script identifies and normalizes non-standard variations of the 'superadmin' role
 * in the users table to ensure consistent permission checking.
 * 
 * It fixes case variations like 'SuperAdmin', 'SUPERADMIN', etc. by converting them
 * to the standard lowercase 'superadmin' value.
 * 
 * Usage:
 *   node scripts/normalize-superadmin-roles.js [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run  Show what would be changed without actually making changes
 *   --force    Skip confirmation prompts
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Get command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const force = args.includes('--force');

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

// Main function to normalize superadmin roles
async function normalizeSuperadminRoles() {
  try {
    log(isDryRun ? 'DRY RUN MODE - No changes will be made' : 'LIVE MODE - Changes will be applied', 
      isDryRun ? colors.yellow : colors.cyan);
    
    const supabase = createAdminClient();
    
    // Find users with a role that case-insensitively matches 'superadmin' but isn't exactly 'superadmin'
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, is_admin')
      .not('role', 'eq', 'superadmin')  // Skip if already normalized
      .filter('role', 'ilike', 'superadmin');  // Case-insensitive match
    
    if (error) {
      log(`Error fetching users: ${error.message}`, colors.red);
      process.exit(1);
    }
    
    if (!users || users.length === 0) {
      log('No non-normalized superadmin users found. All superadmin roles are already using consistent lowercase format.', colors.green);
      process.exit(0);
    }
    
    log(`Found ${users.length} user${users.length === 1 ? '' : 's'} with non-normalized 'superadmin' roles:`, colors.bright);
    
    // List users with non-normalized roles
    users.forEach((user, index) => {
      log(`${index + 1}. Email: ${user.email}`, colors.cyan);
      log(`   Current Role: "${user.role}"`, colors.yellow);
      log(`   Is Admin Flag: ${user.is_admin ? 'true' : 'false'}`, user.is_admin ? colors.green : colors.dim);
      log('-'.repeat(50), colors.dim);
    });
    
    if (!isDryRun && !force) {
      const proceed = await askYesNo(`\nDo you want to normalize ${users.length} user role${users.length === 1 ? '' : 's'} to 'superadmin'?`);
      
      if (!proceed) {
        log('Operation cancelled by user.', colors.yellow);
        process.exit(0);
      }
    }
    
    // In dry run mode, we just display what would change
    if (isDryRun) {
      log('\nThe following changes would be made:', colors.bright);
      users.forEach((user) => {
        log(`- "${user.email}" role would change from "${user.role}" to "superadmin"`, colors.cyan);
        if (!user.is_admin) {
          log(`  is_admin flag would change from false to true`, colors.cyan);
        }
      });
      log('\nNo changes were made (dry run mode).', colors.yellow);
      process.exit(0);
    }
    
    // Update all users with non-normalized roles
    const updatePromises = users.map(user => {
      const updates = { role: 'superadmin' };
      
      // If is_admin is false, also set it to true
      if (!user.is_admin) {
        updates.is_admin = true;
      }
      
      return supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            log(`❌ Error updating ${user.email}: ${error.message}`, colors.red);
            return false;
          }
          
          const isAdminUpdate = !user.is_admin ? ' and is_admin flag set to true' : '';
          log(`✅ ${user.email} - role updated from "${user.role}" to "superadmin"${isAdminUpdate}`, colors.green);
          return true;
        });
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(Boolean).length;
    
    log(`\nOperation complete: ${successCount} of ${users.length} user${users.length === 1 ? '' : 's'} were updated.`, 
      successCount === users.length ? colors.green : colors.yellow);
    
    if (successCount < users.length) {
      log('Some updates failed. Check the logs above for details.', colors.yellow);
    }
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Run the main function
normalizeSuperadminRoles(); 