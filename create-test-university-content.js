/**
 * Test Script: Create University Content
 * 
 * This script creates sample content for the E11EVEN University module
 * to test the content tree functionality.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create Supabase client with service role key (for admin access)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main function to create test content
 */
async function createTestContent() {
  try {
    console.log('Creating test content for E11EVEN University...');
    
    // First check the programs table structure
    const { data: programFields, error: schemaError } = await supabase
      .from('programs')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('Error checking program table schema:', schemaError);
    } else {
      console.log('Available program fields:', programFields && programFields.length > 0 
        ? Object.keys(programFields[0]).join(', ') 
        : 'No sample program found');
    }
    
    // Create a test program
    const programId = await createProgram();
    if (!programId) {
      console.error('Failed to create program. Aborting.');
      return;
    }
    console.log(`Created program with ID: ${programId}`);
    
    // Create courses for the program
    const courseId1 = await createCourse(programId, 'Introduction Course', 'Basic introduction to concepts', 1);
    const courseId2 = await createCourse(programId, 'Advanced Topics', 'More advanced material', 2);
    
    if (!courseId1 || !courseId2) {
      console.error('Failed to create one or more courses. Aborting.');
      return;
    }
    console.log(`Created courses with IDs: ${courseId1}, ${courseId2}`);
    
    // Create lessons for the first course
    const lessonId1 = await createLesson(courseId1, 'Getting Started', 'First steps in the program', 1);
    const lessonId2 = await createLesson(courseId1, 'Core Concepts', 'Essential concepts to understand', 2);
    
    if (!lessonId1 || !lessonId2) {
      console.error('Failed to create one or more lessons. Aborting.');
      return;
    }
    console.log(`Created lessons with IDs: ${lessonId1}, ${lessonId2}`);
    
    // Create modules for the first lesson
    const moduleId1 = await createModule(lessonId1, 'Introduction', 'Welcome to the course', 1);
    const moduleId2 = await createModule(lessonId1, 'First Steps', 'Getting started with basics', 2);
    
    if (!moduleId1 || !moduleId2) {
      console.error('Failed to create one or more modules. Aborting.');
      return;
    }
    console.log(`Created modules with IDs: ${moduleId1}, ${moduleId2}`);
    
    console.log('\nSuccessfully created test content for E11EVEN University!');
    console.log('Please refresh the content tree in the UI to see the new content.');
  } catch (error) {
    console.error('Error creating test content:', error);
  }
}

/**
 * Create a test program
 */
async function createProgram() {
  try {
    // Check if test program already exists
    const { data: existingPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('title', 'Test Program')
      .limit(1);
    
    if (existingPrograms && existingPrograms.length > 0) {
      console.log('Test program already exists, using existing program');
      return existingPrograms[0].id;
    }
    
    // Create new program
    const { data, error } = await supabase
      .from('programs')
      .insert({
        title: 'Test Program',
        description: 'This is a test program created for verification',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating program:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Unexpected error creating program:', error);
    return null;
  }
}

/**
 * Create a test course
 */
async function createCourse(programId, title, description, order) {
  try {
    // Check if course already exists
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('program_id', programId)
      .eq('title', title)
      .limit(1);
    
    if (existingCourses && existingCourses.length > 0) {
      console.log(`Course "${title}" already exists, using existing course`);
      return existingCourses[0].id;
    }
    
    // Create new course
    const { data, error } = await supabase
      .from('courses')
      .insert({
        program_id: programId,
        title: title,
        description: description,
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating course "${title}":`, error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error(`Unexpected error creating course "${title}":`, error);
    return null;
  }
}

/**
 * Create a test lesson
 */
async function createLesson(courseId, title, description, order) {
  try {
    // Check if lesson already exists
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('title', title)
      .limit(1);
    
    if (existingLessons && existingLessons.length > 0) {
      console.log(`Lesson "${title}" already exists, using existing lesson`);
      return existingLessons[0].id;
    }
    
    // Create new lesson
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        course_id: courseId,
        title: title,
        description: description,
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating lesson "${title}":`, error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error(`Unexpected error creating lesson "${title}":`, error);
    return null;
  }
}

/**
 * Create a test module
 */
async function createModule(lessonId, title, description, order) {
  try {
    // Check if module already exists
    const { data: existingModules } = await supabase
      .from('modules')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('title', title)
      .limit(1);
    
    if (existingModules && existingModules.length > 0) {
      console.log(`Module "${title}" already exists, using existing module`);
      return existingModules[0].id;
    }
    
    // Create new module
    const { data, error } = await supabase
      .from('modules')
      .insert({
        lesson_id: lessonId,
        title: title,
        description: description,
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating module "${title}":`, error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error(`Unexpected error creating module "${title}":`, error);
    return null;
  }
}

// Run the script
createTestContent(); 