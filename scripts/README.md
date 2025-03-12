# 11Central Admin Scripts

This directory contains utility scripts for managing users, permissions, and other administrative tasks in the 11Central application.

## Superadmin Management Scripts

The following scripts help manage superadmin roles and permissions in the system:

### add-superadmin-role.js

Promotes a user to superadmin status by setting their role to 'superadmin' and the is_admin flag to true.

```bash
node scripts/add-superadmin-role.js <user_id|email>
```

Example:
```bash
node scripts/add-superadmin-role.js admin@example.com
```

This script:
- Locates the user in the database by email or ID
- Displays their current role and admin status
- Sets their role to 'superadmin'
- Sets their is_admin flag to true
- Confirms the changes have been applied

### normalize-superadmin-roles.js

Identifies and normalizes non-standard variations of the 'superadmin' role (like 'SuperAdmin', 'SUPERADMIN') to the standard lowercase 'superadmin'.

```bash
node scripts/normalize-superadmin-roles.js [--dry-run] [--force]
```

Options:
- `--dry-run`: Show what would be changed without actually making changes
- `--force`: Skip confirmation prompts

This script helps ensure consistent permission checking by standardizing the case of the 'superadmin' role in the database.

### verify-user-role.js

Verifies a user's role and permission settings in the database.

```bash
node scripts/verify-user-role.js <user_id|email> [expected_role]
```

Examples:
```bash
# Display all role information for a user
node scripts/verify-user-role.js admin@example.com

# Check if a user has the superadmin role
node scripts/verify-user-role.js admin@example.com superadmin
```

This script:
- Displays user information including role and is_admin status
- Shows permission check results based on the user's role and preferences
- Verifies if the user has the expected role (if specified)
- Provides guidance for fixing role issues

## Best Practices for Role Management

1. **Always use these scripts** to manage superadmin roles rather than making direct database changes.
2. **Normalize role values** to ensure case consistency using the normalize-superadmin-roles.js script.
3. **Verify role changes** after making them using the verify-user-role.js script.
4. **Keep superadmin roles limited** to only those users who truly need full system access.

## Troubleshooting

If a user with 'superadmin' role is experiencing permission issues:

1. Use `verify-user-role.js` to check their current role and permissions
2. Check for case sensitivity issues with the role value
3. Ensure the is_admin flag is set to true
4. Use `add-superadmin-role.js` to correct any issues with the role or is_admin flag 