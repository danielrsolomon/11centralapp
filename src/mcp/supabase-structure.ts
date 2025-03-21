/**
 * This file contains information about the expected E11even database structure
 * based on the project documentation and previous observations.
 */

export interface TableDefinition {
  name: string;
  description: string;
  columns: ColumnDefinition[];
  expectedRLS: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  description: string;
}

export const expectedTables: TableDefinition[] = [
  {
    name: 'users',
    description: 'User accounts for the E11even Central App',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'email', type: 'text', description: 'User email address' },
      { name: 'first_name', type: 'text', description: 'User first name' },
      { name: 'last_name', type: 'text', description: 'User last name' },
      { name: 'role_id', type: 'uuid', description: 'Foreign key to roles table' },
      { name: 'department_id', type: 'uuid', description: 'Foreign key to departments table' },
      { name: 'created_at', type: 'timestamp', description: 'When the user was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the user was last updated' }
    ],
    expectedRLS: true
  },
  {
    name: 'roles',
    description: 'User roles defining permissions and access levels',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'name', type: 'text', description: 'Role name' },
      { name: 'rank', type: 'integer', description: 'Role rank (lower number means higher privilege)' },
      { name: 'description', type: 'text', description: 'Role description' },
      { name: 'created_at', type: 'timestamp', description: 'When the role was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the role was last updated' }
    ],
    expectedRLS: false
  },
  {
    name: 'departments',
    description: 'Organizational departments',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'name', type: 'text', description: 'Department name' },
      { name: 'description', type: 'text', description: 'Department description' },
      { name: 'created_at', type: 'timestamp', description: 'When the department was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the department was last updated' }
    ],
    expectedRLS: true
  },
  {
    name: 'venues',
    description: 'Venues or locations',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'name', type: 'text', description: 'Venue name' },
      { name: 'address', type: 'text', description: 'Venue address' },
      { name: 'created_at', type: 'timestamp', description: 'When the venue was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the venue was last updated' }
    ],
    expectedRLS: false
  },
  {
    name: 'schedules',
    description: 'Employee work schedules',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'user_id', type: 'uuid', description: 'Foreign key to users table' },
      { name: 'venue_id', type: 'uuid', description: 'Foreign key to venues table' },
      { name: 'start_time', type: 'timestamp', description: 'When the shift starts' },
      { name: 'end_time', type: 'timestamp', description: 'When the shift ends' },
      { name: 'created_at', type: 'timestamp', description: 'When the schedule was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the schedule was last updated' }
    ],
    expectedRLS: true
  },
  {
    name: 'gratuities',
    description: 'Employee gratuity records',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'user_id', type: 'uuid', description: 'Foreign key to users table' },
      { name: 'amount', type: 'numeric', description: 'Gratuity amount' },
      { name: 'date', type: 'date', description: 'Date of the gratuity' },
      { name: 'created_at', type: 'timestamp', description: 'When the gratuity record was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the gratuity record was last updated' }
    ],
    expectedRLS: true
  },
  {
    name: 'messages',
    description: 'Internal messaging system',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'sender_id', type: 'uuid', description: 'Foreign key to users table (sender)' },
      { name: 'recipient_id', type: 'uuid', description: 'Foreign key to users table (recipient)' },
      { name: 'content', type: 'text', description: 'Message content' },
      { name: 'is_read', type: 'boolean', description: 'Whether the message has been read' },
      { name: 'created_at', type: 'timestamp', description: 'When the message was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the message was last updated' }
    ],
    expectedRLS: true
  },
  {
    name: 'courses',
    description: 'Training courses for the LMS',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'title', type: 'text', description: 'Course title' },
      { name: 'description', type: 'text', description: 'Course description' },
      { name: 'department_id', type: 'uuid', description: 'Foreign key to departments table' },
      { name: 'created_by', type: 'uuid', description: 'Foreign key to users table (creator)' },
      { name: 'created_at', type: 'timestamp', description: 'When the course was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the course was last updated' }
    ],
    expectedRLS: false
  },
  {
    name: 'course_enrollments',
    description: 'User enrollments in courses',
    columns: [
      { name: 'id', type: 'uuid', description: 'Primary key' },
      { name: 'user_id', type: 'uuid', description: 'Foreign key to users table' },
      { name: 'course_id', type: 'uuid', description: 'Foreign key to courses table' },
      { name: 'status', type: 'text', description: 'Enrollment status (e.g., in_progress, completed)' },
      { name: 'progress', type: 'numeric', description: 'Course progress percentage' },
      { name: 'created_at', type: 'timestamp', description: 'When the enrollment was created' },
      { name: 'updated_at', type: 'timestamp', description: 'When the enrollment was last updated' }
    ],
    expectedRLS: true
  }
];

// Expected roles based on the project documentation
export const expectedRoles = [
  { 
    name: 'SuperAdmin',
    rank: 1,
    description: 'Complete platform access across all venues'
  },
  { 
    name: 'Venue Admin',
    rank: 2,
    description: 'Administrative access to specific venues'
  },
  { 
    name: 'Director',
    rank: 3,
    description: 'Access to all pages at assigned venues'
  },
  { 
    name: 'SeniorManager',
    rank: 4,
    description: 'Access to most pages at assigned venues'
  },
  { 
    name: 'Department Manager',
    rank: 5,
    description: 'Department-level management'
  },
  { 
    name: 'Department Lead',
    rank: 6,
    description: 'View access to department pages'
  },
  { 
    name: 'Staff',
    rank: 7,
    description: 'Basic view access to certain pages'
  }
]; 