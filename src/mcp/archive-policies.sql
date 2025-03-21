-- Archive Policies for 11Central Application
-- This script defines business-appropriate archiving policies for various tables

-- First, ensure archive_policies table exists
SELECT manage_archive_policy('get', '{}'::jsonb);

-- Clear existing policies if needed
-- Uncomment the next section to clear all existing policies
-- DO $$
-- DECLARE
--   policy record;
-- BEGIN
--   FOR policy IN (
--     SELECT * FROM archive_policies
--   ) LOOP
--     PERFORM manage_archive_policy('delete', jsonb_build_object('id', policy.id));
--   END LOOP;
-- END $$;

-- Gratuities - Archive gratuity records older than 6 months
-- Rationale: Gratuity records are needed for tax purposes, but older records 
-- are rarely accessed and can be archived to improve application performance.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'gratuities',
  'condition', 'date < now() - interval ''6 months''',
  'reason', 'Gratuity record older than 6 months',
  'frequency', 'interval ''1 week''',
  'delete_after_archive', true,
  'is_active', true
));

-- Messages - Archive read messages older than 3 months
-- Rationale: Read messages are no longer actively needed but should be 
-- preserved for record-keeping. Unread messages are retained.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'messages',
  'condition', 'read = true AND created_at < now() - interval ''3 months''',
  'reason', 'Read message older than 3 months',
  'frequency', 'interval ''1 week''',
  'delete_after_archive', true,
  'is_active', true
));

-- Schedules - Archive schedules older than 1 year
-- Rationale: Historical schedule data is valuable for analysis but not 
-- needed for day-to-day operations.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'schedules',
  'condition', 'end_time < now() - interval ''1 year''',
  'reason', 'Schedule older than 1 year',
  'frequency', 'interval ''1 month''',
  'delete_after_archive', true,
  'is_active', true
));

-- Events - Archive events that ended more than 6 months ago
-- Rationale: Past events are no longer actively needed but should be 
-- preserved for historical records.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'events',
  'condition', 'end_date < now() - interval ''6 months''',
  'reason', 'Event ended more than 6 months ago',
  'frequency', 'interval ''1 month''',
  'delete_after_archive', true,
  'is_active', true
));

-- Course Enrollments - Archive completed enrollments older than 2 years
-- Rationale: Completed course records should be kept for a reasonable period
-- for certification and HR purposes but can be archived after 2 years.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'course_enrollments',
  'condition', 'completed = true AND enrollment_date < now() - interval ''2 years''',
  'reason', 'Completed enrollment older than 2 years',
  'frequency', 'interval ''3 months''',
  'delete_after_archive', true,
  'is_active', true
));

-- Notifications - Archive read notifications older than 1 month
-- Rationale: Read notifications are rarely viewed after 1 month
-- and can be safely archived to improve app performance.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'notifications',
  'condition', 'read = true AND created_at < now() - interval ''1 month''',
  'reason', 'Read notification older than 1 month',
  'frequency', 'interval ''1 week''',
  'delete_after_archive', true,
  'is_active', true
));

-- Audit Logs - Archive audit logs older than 1 year
-- Rationale: Audit logs are important for security reviews but older logs
-- are rarely accessed and can be archived to improve performance.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'audit_logs',
  'condition', 'created_at < now() - interval ''1 year''',
  'reason', 'Audit log older than 1 year',
  'frequency', 'interval ''1 month''',
  'delete_after_archive', true,
  'is_active', true
));

-- System Logs - Archive system logs older than 3 months
-- Rationale: System logs are primarily useful for troubleshooting recent issues.
-- Older logs can be archived.
SELECT manage_archive_policy('create', jsonb_build_object(
  'source_table', 'system_logs',
  'condition', 'created_at < now() - interval ''3 months''',
  'reason', 'System log older than 3 months',
  'frequency', 'interval ''1 week''',
  'delete_after_archive', true,
  'is_active', true
));

-- Get all defined policies
SELECT manage_archive_policy('get', '{}'::jsonb);

-- Run all active policies to start archiving eligible records
SELECT run_archive_policies();

-- Get archiving statistics to verify results
SELECT get_archive_statistics(); 