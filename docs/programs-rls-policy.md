# Programs Table Row-Level Security (RLS) Policies

This document explains the Row-Level Security (RLS) policies implemented for the `programs` table in the 11Central application.

## Overview

The `programs` table has RLS policies that control who can perform different operations (SELECT, INSERT, UPDATE, DELETE) on program records. These policies ensure that only authorized users can perform specific actions.

## Policy Details

### 1. View Permission (`SELECT`)

The "Programs are viewable by everyone" policy allows users to view programs if:
- The program has a status of 'published', OR
- The user is the creator of the program, OR
- The user has one of these roles: superadmin, admin, training_manager, content_manager, department_manager, OR
- The user has the `is_admin` flag set to true

### 2. Create Permission (`INSERT`)

The "Authorized roles can insert programs" policy allows users to create programs if they:
- Have one of these roles: superadmin, admin, training_manager, content_manager, OR
- Have the `is_admin` flag set to true

Note: For the superadmin role, we use `LOWER(role) = 'superadmin'` to make the check case-insensitive.

### 3. Update Permission (`UPDATE`)

The "Authorized users can update programs" policy allows users to update programs if they:
- Are the creator of the program, OR
- Have one of these roles: superadmin, admin, training_manager, content_manager, OR
- Have the `is_admin` flag set to true

### 4. Delete Permission (`DELETE`)

The "Authorized users can delete programs" policy allows users to delete programs if they:
- Are the creator of the program, OR
- Have one of these roles: superadmin, admin, OR
- Have the `is_admin` flag set to true

## Superadmin Permissions

Users with the 'superadmin' role have full access to all operations on the `programs` table:
- They can view all programs (both published and unpublished)
- They can create new programs
- They can update any program (regardless of who created it)
- They can delete any program (regardless of who created it)

The RLS policies specifically look for 'superadmin' in a case-insensitive manner to accommodate any potential case variations in the role value.

## Permission Logging

A logging system has been implemented to track RLS policy issues. When a user encounters an RLS permission error, details about the attempted operation are logged to the `rls_permission_logs` table, which can help with debugging permission issues.

## Important Implementation Notes

1. For all role checks, we use an EXISTS subquery that checks the user's record in the `users` table.
2. We include both role-based checks and the `is_admin` flag check to ensure backward compatibility.
3. The superadmin role check uses `LOWER(role) = 'superadmin'` to make it case-insensitive.
4. The policies are carefully ordered to ensure proper precedence in evaluation.

## Application Integration

In the application code, when interacting with the programs table:
1. The authenticated user's ID should automatically be used by Supabase in the RLS policies
2. When creating a program, ensure the `created_by` field is set to the current user's ID
3. The application logic should align with these RLS policies, checking for similar roles before allowing operations in the UI 