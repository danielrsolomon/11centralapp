import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase admin client with the service role key
let supabaseAdmin = null;

if (isDevelopment && supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[VERIFY API] Failed to create Supabase admin client:', error);
  }
}

export async function GET(request: Request) {
  // Security check - only allow in development
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error - Supabase admin client not initialized' },
      { status: 500 }
    );
  }

  try {
    // Fetch all content entities
    const { data: programs, error: programsError } = await supabaseAdmin
      .from('programs')
      .select('id, title, status');

    if (programsError) {
      throw new Error(`Failed to fetch programs: ${programsError.message}`);
    }

    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title, program_id, status');

    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('lessons')
      .select('id, title, course_id, status');

    if (lessonsError) {
      throw new Error(`Failed to fetch lessons: ${lessonsError.message}`);
    }

    const { data: modules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select('id, title, lesson_id, status');

    if (modulesError) {
      throw new Error(`Failed to fetch modules: ${modulesError.message}`);
    }

    // Check for orphaned content
    const orphanedCourses = courses.filter(course => 
      !programs.some(program => program.id === course.program_id)
    );

    const orphanedLessons = lessons.filter(lesson => 
      !courses.some(course => course.id === lesson.course_id)
    );

    const orphanedModules = modules.filter(module => 
      !lessons.some(lesson => lesson.id === module.lesson_id)
    );

    // Build relationship maps for faster lookup
    const programCourses = programs.map(program => ({
      program,
      courses: courses.filter(course => course.program_id === program.id)
    }));

    const courseHierarchy = programCourses.map(({ program, courses }) => ({
      program,
      courses: courses.map(course => ({
        course,
        lessons: lessons.filter(lesson => lesson.course_id === course.id).map(lesson => ({
          lesson,
          modules: modules.filter(module => module.lesson_id === lesson.id)
        }))
      }))
    }));

    // Create issues report
    const issues = {
      orphanedCourses: orphanedCourses.map(c => ({ id: c.id, title: c.title, program_id: c.program_id })),
      orphanedLessons: orphanedLessons.map(l => ({ id: l.id, title: l.title, course_id: l.course_id })),
      orphanedModules: orphanedModules.map(m => ({ id: m.id, title: m.title, lesson_id: m.lesson_id })),
      emptyPrograms: programs.filter(p => 
        !courses.some(c => c.program_id === p.id)
      ).map(p => ({ id: p.id, title: p.title })),
      emptyCourses: courses.filter(c => 
        !lessons.some(l => l.course_id === c.id)
      ).map(c => ({ id: c.id, title: c.title, program_id: c.program_id })),
      emptyLessons: lessons.filter(l => 
        !modules.some(m => m.lesson_id === l.id)
      ).map(l => ({ id: l.id, title: l.title, course_id: l.course_id }))
    };

    // Count entities
    const counts = {
      programs: programs.length,
      courses: courses.length,
      lessons: lessons.length,
      modules: modules.length
    };

    return NextResponse.json({
      success: true,
      counts,
      issues,
      courseHierarchy
    });

  } catch (error) {
    console.error('[VERIFY API] Error verifying relationships:', error);
    return NextResponse.json(
      { error: 'Failed to verify relationships', details: error },
      { status: 500 }
    );
  }
} 