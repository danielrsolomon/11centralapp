import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase admin client with the service role key
let supabaseAdmin: any = null;

if (isDevelopment && supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[FIX API] Failed to create Supabase admin client:', error);
  }
}

export async function POST(request: Request) {
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
    const { action, data } = await request.json();
    
    switch (action) {
      case 'fix-sequence-order':
        return await fixSequenceOrder(data.table);
      
      case 'fix-orphaned-content':
        return await fixOrphanedContent(data.entityType, data.orphanedIds);
      
      case 'reassign-courses':
        return await reassignCourses(data.courses, data.targetProgramId);
      
      case 'reassign-lessons':
        return await reassignLessons(data.lessons, data.targetCourseId);
      
      case 'reassign-modules':
        return await reassignModules(data.modules, data.targetLessonId);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[FIX API] Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error },
      { status: 500 }
    );
  }
}

// Fix sequence order in a table to ensure content displays in correct order
async function fixSequenceOrder(table: string) {
  if (!['courses', 'lessons', 'modules'].includes(table)) {
    return NextResponse.json(
      { error: 'Invalid table specified for sequence order fix' },
      { status: 400 }
    );
  }

  let parentIdField;
  if (table === 'courses') parentIdField = 'program_id';
  if (table === 'lessons') parentIdField = 'course_id';
  if (table === 'modules') parentIdField = 'lesson_id';

  try {
    // Get all entities from the table
    const { data: entities, error } = await supabaseAdmin
      .from(table)
      .select(`id, ${parentIdField}, sequence_order`)
      .order('sequence_order', { ascending: true });

    if (error) throw error;

    // Group by parent ID
    const groupedByParent: Record<string, any[]> = {};
    entities.forEach((entity: any) => {
      const parentId = entity[parentIdField];
      if (!groupedByParent[parentId]) groupedByParent[parentId] = [];
      groupedByParent[parentId].push(entity);
    });

    // Fix sequence order for each parent
    const results = [];
    for (const parentId in groupedByParent) {
      const parentEntities = groupedByParent[parentId];
      
      // Skip if only one or no entities
      if (parentEntities.length <= 1) continue;
      
      // Check if sequence is already correct
      let needsFix = false;
      for (let i = 0; i < parentEntities.length; i++) {
        if (parentEntities[i].sequence_order !== i + 1) {
          needsFix = true;
          break;
        }
      }
      
      if (!needsFix) continue;
      
      // Fix sequence order
      for (let i = 0; i < parentEntities.length; i++) {
        const { error: updateError } = await supabaseAdmin
          .from(table)
          .update({ sequence_order: i + 1 })
          .eq('id', parentEntities[i].id);
        
        if (updateError) throw updateError;
        
        results.push({
          id: parentEntities[i].id,
          oldSequence: parentEntities[i].sequence_order,
          newSequence: i + 1
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixes: results,
      message: `Fixed sequence order for ${results.length} entities in ${table}`
    });
  } catch (error) {
    console.error(`[FIX API] Error fixing sequence order in ${table}:`, error);
    return NextResponse.json(
      { error: `Failed to fix sequence order in ${table}`, details: error },
      { status: 500 }
    );
  }
}

// Fix orphaned content by either deleting it or reassigning it
async function fixOrphanedContent(
  entityType: 'courses' | 'lessons' | 'modules', 
  orphanedIds: string[]
) {
  if (!['courses', 'lessons', 'modules'].includes(entityType)) {
    return NextResponse.json(
      { error: 'Invalid entity type specified' },
      { status: 400 }
    );
  }

  if (!orphanedIds || !Array.isArray(orphanedIds) || orphanedIds.length === 0) {
    return NextResponse.json(
      { error: 'No orphaned IDs provided' },
      { status: 400 }
    );
  }

  try {
    // Delete orphaned content
    const { error, data } = await supabaseAdmin
      .from(entityType)
      .delete()
      .in('id', orphanedIds)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deletedCount: data.length,
      deletedItems: data,
      message: `Successfully deleted ${data.length} orphaned ${entityType}`
    });
  } catch (error) {
    console.error(`[FIX API] Error deleting orphaned ${entityType}:`, error);
    return NextResponse.json(
      { error: `Failed to delete orphaned ${entityType}`, details: error },
      { status: 500 }
    );
  }
}

// Reassign courses to a different program
async function reassignCourses(courseIds: string[], targetProgramId: string) {
  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
    return NextResponse.json(
      { error: 'No course IDs provided' },
      { status: 400 }
    );
  }

  if (!targetProgramId) {
    return NextResponse.json(
      { error: 'No target program ID provided' },
      { status: 400 }
    );
  }

  try {
    // Verify target program exists
    const { data: program, error: programError } = await supabaseAdmin
      .from('programs')
      .select('id')
      .eq('id', targetProgramId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { error: 'Target program does not exist' },
        { status: 400 }
      );
    }

    // Reassign courses
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({ program_id: targetProgramId })
      .in('id', courseIds)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reassignedCount: data.length,
      reassignedItems: data,
      message: `Successfully reassigned ${data.length} courses to program ${targetProgramId}`
    });
  } catch (error) {
    console.error('[FIX API] Error reassigning courses:', error);
    return NextResponse.json(
      { error: 'Failed to reassign courses', details: error },
      { status: 500 }
    );
  }
}

// Reassign lessons to a different course
async function reassignLessons(lessonIds: string[], targetCourseId: string) {
  if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    return NextResponse.json(
      { error: 'No lesson IDs provided' },
      { status: 400 }
    );
  }

  if (!targetCourseId) {
    return NextResponse.json(
      { error: 'No target course ID provided' },
      { status: 400 }
    );
  }

  try {
    // Verify target course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', targetCourseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Target course does not exist' },
        { status: 400 }
      );
    }

    // Reassign lessons
    const { data, error } = await supabaseAdmin
      .from('lessons')
      .update({ course_id: targetCourseId })
      .in('id', lessonIds)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reassignedCount: data.length,
      reassignedItems: data,
      message: `Successfully reassigned ${data.length} lessons to course ${targetCourseId}`
    });
  } catch (error) {
    console.error('[FIX API] Error reassigning lessons:', error);
    return NextResponse.json(
      { error: 'Failed to reassign lessons', details: error },
      { status: 500 }
    );
  }
}

// Reassign modules to a different lesson
async function reassignModules(moduleIds: string[], targetLessonId: string) {
  if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
    return NextResponse.json(
      { error: 'No module IDs provided' },
      { status: 400 }
    );
  }

  if (!targetLessonId) {
    return NextResponse.json(
      { error: 'No target lesson ID provided' },
      { status: 400 }
    );
  }

  try {
    // Verify target lesson exists
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('id', targetLessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Target lesson does not exist' },
        { status: 400 }
      );
    }

    // Reassign modules
    const { data, error } = await supabaseAdmin
      .from('modules')
      .update({ lesson_id: targetLessonId })
      .in('id', moduleIds)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reassignedCount: data.length,
      reassignedItems: data,
      message: `Successfully reassigned ${data.length} modules to lesson ${targetLessonId}`
    });
  } catch (error) {
    console.error('[FIX API] Error reassigning modules:', error);
    return NextResponse.json(
      { error: 'Failed to reassign modules', details: error },
      { status: 500 }
    );
  }
} 