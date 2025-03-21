import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../../services/supabase';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { throwApiError } from '../../middleware/error-handler';
import { authAsyncHandler } from '../../middleware/express-utils';

const router = Router();

/**
 * Schema for the fix-order-columns request
 * Currently doesn't require any input parameters
 */
const fixOrderColumnsSchema = z.object({
  // Empty schema for now, might add options later if needed
}).optional();

/**
 * @route POST /api/admin/schema/fix-order-columns
 * @desc Add 'order' columns to content tables if they don't exist
 * @access Admin, SuperAdmin
 * 
 * This replaces the functionality in the legacy fix-order-columns.ts utility
 * It adds 'order' columns to programs, courses, lessons, and modules tables if they don't exist
 */
router.post('/fix-order-columns',
  requireAuth,
  requireRole(['admin', 'SuperAdmin']),
  authAsyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('API: Attempting to fix order columns for all content tables...');
      
      // Add order column to programs table
      await executeOrderColumnFix('programs');
      
      // Add order column to courses table
      await executeOrderColumnFix('courses');
      
      // Add order column to lessons table
      await executeOrderColumnFix('lessons');
      
      // Add order column to modules table
      await executeOrderColumnFix('modules');
      
      console.log('API: Order column fix completed successfully');
      
      // Send successful response
      res.json({
        success: true,
        message: 'Order columns fixed successfully',
        data: {
          tables: ['programs', 'courses', 'lessons', 'modules'],
          status: 'completed'
        }
      });
    } catch (error) {
      console.error('API: Error fixing order columns:', error);
      throwApiError('Failed to fix order columns', 500, 'SCHEMA_ERROR', { error: String(error) });
    }
  })
);

/**
 * Helper function to execute the order column fix for a specific table
 */
async function executeOrderColumnFix(tableName: string) {
  try {
    console.log(`API: Checking if order column exists in ${tableName} table...`);
    
    // First check if the order column already exists by attempting a query
    const testQuery = await supabase.from(tableName).select('id').limit(1);
    
    // If we got a specific error about the column not existing, add it
    if (testQuery.error?.message.includes(`column "${tableName}.order" does not exist`)) {
      console.log(`API: Adding order column to ${tableName} table...`);
      
      // Execute the ALTER TABLE statement using RPC
      const { error: alterError } = await supabase.rpc('execute_sql', {
        query: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;`
      });
      
      if (alterError) {
        console.error(`API: Failed to add order column to ${tableName}:`, alterError);
        throw new Error(`Failed to add order column to ${tableName}: ${alterError.message}`);
      }
      
      console.log(`API: Successfully added order column to ${tableName} table`);
    } else {
      console.log(`API: Order column already exists in ${tableName} table`);
    }
  } catch (error) {
    console.error(`API: Error adding order column to ${tableName}:`, error);
    throw error;
  }
}

export default router; 