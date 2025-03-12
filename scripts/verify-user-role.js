/**
 * Verify User Role Script
 * 
 * This script allows you to verify a user's role and permission settings in the database.
 * It's useful for debugging permission issues or confirming that a user has the expected role.
 * 
 * Usage:
 *   node scripts/verify-user-role.js <user_id|email> [expected_role]
 * 
 * Examples:
 *   node scripts/verify-user-role.js admin@example.com
 *   node scripts/verify-user-role.js admin@example.com superadmin
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

// Check if a user has admin role (copied from permission-utils.ts logic)
function hasAdminRole(user) {
  if (!user) return false;
  if (user.is_admin === true) return true;
  
  const adminRoles = ['admin', 'superadmin'];
  const userRole = String(user.role || '').toLowerCase();
  return adminRoles.some(role => role.toLowerCase() === userRole);
}

// Check if a user has manager role (copied from permission-utils.ts logic)
function hasManagerRole(user) {
  if (!user) return false;
  
  const managerRoles = [
    'manager',
    'training_manager',
    'content_manager',
    'department_manager',
    'supervisor',
  ];
  
  const userRole = String(user.role || '').toLowerCase();
  return managerRoles.some(role => role.toLowerCase() === userRole);
}

// Check if a user can create content (copied from permission-utils.ts logic)
function canCreateContent(user) {
  if (!user) return false;
  if (hasAdminRole(user) || hasManagerRole(user)) return true;
  
  try {
    // Check user_preferences if available
    if (user.user_preferences) {
      if (user.user_preferences.content_creation === true) return true;
      if (user.user_preferences.permissions?.createContent === true) return true;
    }
    
    // Check preferences property if available (legacy/compatibility)
    if (user.preferences) {
      if (user.preferences.content_creation === true) return true;
      if (user.preferences.permissions?.createContent === true) return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking content creation permissions:', error);
    return false;
  }
}

// Main function to verify user role
async function verifyUserRole() {
  try {
    // Get user identifier and expected role from command line arguments
    const userIdentifier = process.argv[2];
    const expectedRole = process.argv[3]?.toLowerCase();
    
    if (!userIdentifier) {
      log('Usage: node scripts/verify-user-role.js <user_id|email> [expected_role]', colors.yellow);
      process.exit(1);
    }
    
    const supabase = createAdminClient();
    
    // Determine if the input is an email or UUID
    const isEmail = userIdentifier.includes('@');
    const query = supabase
      .from('users')
      .select('id, email, role, is_admin')
      .order('created_at', { ascending: false });
    
    // Search by email or ID
    if (isEmail) {
      query.eq('email', userIdentifier);
    } else {
      query.eq('id', userIdentifier);
    }
    
    // Get the user
    const { data: users, error } = await query;
    
    if (error) {
      log(`Error fetching user: ${error.message}`, colors.red);
      process.exit(1);
    }
    
    if (!users || users.length === 0) {
      log(`User not found: ${userIdentifier}`, colors.red);
      process.exit(1);
    }
    
    // Use the most recent user if there are multiple with the same email
    const user = users[0];
    
    // Display user information
    log('\nUser Information:', colors.bright);
    log(`ID: ${user.id}`, colors.cyan);
    log(`Email: ${user.email}`, colors.cyan);
    log(`Role: ${user.role || 'Not set'}`, colors.cyan);
    log(`Is Admin Flag: ${user.is_admin ? 'Yes' : 'No'}`, user.is_admin ? colors.green : colors.red);
    
    // Try to get user preferences
    const { data: userPreferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      log(`Error fetching user preferences: ${prefsError.message}`, colors.yellow);
    }
    
    // Create a unified user object for permission checking
    const unifiedUser = {
      ...user,
      user_preferences: userPreferences || undefined
    };
    
    // Display permissions
    log('\nPermission Checks:', colors.bright);
    log(`Has Admin Role: ${hasAdminRole(unifiedUser) ? 'Yes' : 'No'}`, hasAdminRole(unifiedUser) ? colors.green : colors.red);
    log(`Has Manager Role: ${hasManagerRole(unifiedUser) ? 'Yes' : 'No'}`, hasManagerRole(unifiedUser) ? colors.green : colors.red);
    log(`Can Create Content: ${canCreateContent(unifiedUser) ? 'Yes' : 'No'}`, canCreateContent(unifiedUser) ? colors.green : colors.red);
    
    // Display preferences if they exist
    if (userPreferences) {
      log('\nUser Preferences:', colors.bright);
      
      // Display notification preferences
      if (userPreferences.email_weekly_newsletter !== undefined) {
        log('Notification Preferences:', colors.cyan);
        log(`- Email Weekly Newsletter: ${userPreferences.email_weekly_newsletter ? 'Enabled' : 'Disabled'}`, 
          userPreferences.email_weekly_newsletter ? colors.green : colors.dim);
        log(`- Email Account Notifications: ${userPreferences.email_account_notifications ? 'Enabled' : 'Disabled'}`, 
          userPreferences.email_account_notifications ? colors.green : colors.dim);
        log(`- App New Messages: ${userPreferences.app_new_messages ? 'Enabled' : 'Disabled'}`, 
          userPreferences.app_new_messages ? colors.green : colors.dim);
      }
    } else {
      log('\nUser Preferences: Not set', colors.dim);
    }
    
    // Verify expected role if provided
    if (expectedRole) {
      const userRole = String(user.role || '').toLowerCase();
      const isMatch = userRole === expectedRole;
      
      log('\nRole Verification:', colors.bright);
      if (isMatch) {
        log(`✅ User has the expected role "${expectedRole}"`, colors.green);
      } else {
        log(`❌ User does not have the expected role. Found "${user.role}" but expected "${expectedRole}"`, colors.red);
        
        // Provide guidance for fixing the role
        log('\nTo set the correct role, run:', colors.yellow);
        log(`node scripts/add-superadmin-role.js ${user.email}`, colors.cyan);
      }
    }
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Run the main function
verifyUserRole(); 