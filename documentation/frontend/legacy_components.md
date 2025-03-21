# Legacy Components and Future Refactoring

## Overview

While most of the E11EVEN Central App has been refactored to use the new service layer architecture, some legacy components remain in use. This document identifies these components, explains why they're still in use, and outlines plans for future refactoring.

## Identified Legacy Components

### 1. ~~fix-order-columns.ts~~ (Refactored)

This utility previously directly manipulated database columns through Supabase RPC calls. It has been successfully refactored to use the API layer through `adminService.fixOrderColumns()`.

**Previous Implementation:**
```typescript
// src/components/university/fix-order-columns.ts
export async function fixOrderColumns() {
  try {
    console.log('Attempting to fix order columns for all content tables...');
    
    // Add order column to programs table
    const addProgramOrderColumnResult = await supabase.from('programs').select('id').limit(1);
    if (addProgramOrderColumnResult.error?.message.includes('column "programs.order" does not exist')) {
      console.log('Adding order column to programs table...');
      const { error: alterError } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE programs ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 999;'
      });
      if (alterError) console.error('Failed to add order column to programs:', alterError);
    }

    // Similar code for courses, lessons, and modules tables
    // ...
  } catch (error) {
    console.error('Error fixing order columns:', error);
    return false;
  }
}
```

**Current Implementation:**
```typescript
// In src/services/adminService.ts
export const fixOrderColumns = async (): Promise<{ success: boolean; error: Error | null }> => {
  try {
    console.log('AdminService: Calling API to fix order columns');
    
    const response = await api.post('/admin/schema/fix-order-columns', {});
    
    if (!response.success) {
      console.error('AdminService: Failed to fix order columns:', response.error);
      return {
        success: false,
        error: new Error(response.error?.message || 'Failed to fix order columns')
      };
    }
    
    console.log('AdminService: Successfully fixed order columns');
    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('AdminService: Error in fixOrderColumns:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error fixing order columns')
    };
  }
};
```

**Usage in ContentManagement.tsx:**
```typescript
// Imported from adminService instead of directly
import { fixOrderColumns } from '../../services/adminService';

// Used in a useEffect
useEffect(() => {
  const attemptFixOrderColumns = async () => {
    try {
      await fixOrderColumns();
    } catch (error) {
      console.error('Failed to fix order columns:', error);
    }
  };
  
  attemptFixOrderColumns();
}, []);
```

### 2. MinimalProgramDialog.tsx (Still using direct Supabase calls)

This component is used for creating new programs with minimal UI flickering. It directly uses Supabase for database operations and file uploads.

**Current Usage**: Used in ContentManagement.tsx for the "Add Program" functionality.

**Why It's Still Used**: This component was developed as a solution to UI flickering issues in dialog components. It provides a stable and reliable way to create programs, though it doesn't follow the current service layer pattern.

**Current Implementation (excerpt):**
```typescript
// In MinimalProgramDialog.tsx
import { supabase } from '../../services/supabase';

// Later in the component...
const handleCreateProgram = async () => {
  setIsCreating(true);
  setError(null);
  
  try {
    // Create program record
    const { data: programData, error: programError } = await supabase
      .from('programs')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        department_id: selectedDepartment,
        is_published: isPublished,
        created_by: user.id,
        order: 999 // Default order
      }])
      .select()
      .single();
    
    if (programError) throw programError;
    
    // Handle thumbnail upload if provided
    if (thumbnailFile) {
      const fileExt = thumbnailFile.name.split('.').pop();
      const filePath = `${THUMBNAIL_FOLDER}/${programData.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, thumbnailFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filePath);
      
      // Update program with thumbnail URL
      const { error: updateError } = await supabase
        .from('programs')
        .update({ thumbnail_url: publicUrlData.publicUrl })
        .eq('id', programData.id);
      
      if (updateError) throw updateError;
      
      // Get the updated record
      const { data: updatedProgram, error: fetchError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programData.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      programData.thumbnail_url = updatedProgram.thumbnail_url;
    }
    
    // Call onCreated callback with the created program
    if (onCreated) {
      onCreated(programData);
    }
    
    // Close dialog
    handleClose();
  } catch (err) {
    console.error('Error creating program:', err);
    setError(`Failed to create program: ${err.message}`);
  } finally {
    setIsCreating(false);
  }
};
```

## Usage in ContentManagement.tsx

The MinimalProgramDialog component is used in ContentManagement.tsx:

```typescript
// In ContentManagement.tsx
import MinimalProgramDialog from '../../components/university/MinimalProgramDialog';

// State for dialog
const [minimalDialogOpen, setMinimalDialogOpen] = useState(false);

// JSX
return (
  <div>
    {/* ... other components ... */}
    
    <button
      className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded mb-4"
      onClick={() => {
        console.log('ContentManagement: "Add Program" button clicked');
        setMinimalDialogOpen(true);
      }}
    >
      Add Program
    </button>
    
    {/* ... other components ... */}
    
    <MinimalProgramDialog 
      isOpen={minimalDialogOpen}
      onClose={() => {
        console.log('ContentManagement: Closing minimal dialog via onClose');
        setMinimalDialogOpen(false);
      }}
      onCreated={handleProgramCreated}
    />
  </div>
);
```

## Other Archived Components

In addition to the actively used legacy components, several unused components have been archived to the `src/components/university/old_backup/` directory:

1. **RealtimeProgramList.tsx**: A demo component for real-time updates
2. **ResourceUploader.tsx**: An older implementation of file uploads
3. **ThumbnailUploader.tsx**: An older implementation of thumbnail uploads

These components are no longer referenced in the active codebase and have been archived for reference.

## Impact on the Application

The remaining legacy component has the following impact:

1. **Direct Database Access**: Bypasses the service layer, making direct Supabase calls
2. **Inconsistent Error Handling**: Doesn't follow the standard error handling patterns
3. **Maintenance Challenges**: Changes to the database schema or API may require updates to this component
4. **Testing Difficulties**: Direct Supabase calls make testing more complex

However, it does provide important functionality that's currently working reliably in production.

## Refactoring Plan for MinimalProgramDialog.tsx

### Short-term Plan (Q2 2025)

1. **Create Service Methods**: Add methods to programService.ts for creating programs with thumbnails
   ```typescript
   // In programService.ts
   async createProgramWithThumbnail(
     programData: Omit<Program, 'id' | 'created_at' | 'updated_at'>,
     thumbnailFile?: File
   ): Promise<ApiResponse<Program>> {
     // Implementation
   }
   ```

2. **Create New Component**: Implement a new ProgramCreationDialog.tsx component that uses the service layer
   ```typescript
   // In ProgramCreationDialog.tsx
   import { programService } from '../../services/programService';
   
   // Instead of direct Supabase calls:
   const handleCreateProgram = async () => {
     try {
       const response = await programService.createProgramWithThumbnail(
         {
           title: title.trim(),
           description: description.trim(),
           department_id: selectedDepartment,
           is_published: isPublished,
         },
         thumbnailFile
       );
       
       if (response.error) throw new Error(response.error.message);
       
       if (onCreated && response.data) {
         onCreated(response.data);
       }
       
       handleClose();
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to create program');
     }
   };
   ```

3. **Swap Components**: Replace MinimalProgramDialog with the new component in ContentManagement.tsx
   ```typescript
   // In ContentManagement.tsx
   import ProgramCreationDialog from '../../components/university/ProgramCreationDialog';
   
   // Replace MinimalProgramDialog with ProgramCreationDialog
   <ProgramCreationDialog 
     isOpen={dialogOpen}
     onClose={() => setDialogOpen(false)}
     onCreated={handleProgramCreated}
   />
   ```

### Testing Strategy

1. **Implement Tests**: Create unit tests for the new component and service methods
2. **Parallel Testing**: Run both implementations side by side in a development environment
3. **Performance Testing**: Verify that the new implementation maintains the same UI performance

### Timeline

- **Q2 2025**: Implement service methods and new component
- **Q3 2025**: Test in development and staging environments
- **Q3 2025**: Deploy to production

## Long-term Architecture Goals

As the application continues to evolve, we'll maintain these architectural principles:

1. **Service Layer First**: All data operations should go through the service layer
2. **Clean Separation of Concerns**: Components focus on presentation, services handle data access
3. **Consistent Patterns**: Follow established patterns for all new features
4. **Progressive Refactoring**: Incrementally refactor any remaining direct Supabase calls

By following these principles, we'll ensure that the codebase remains maintainable, testable, and secure as it grows.

## Conclusion

While we've made significant progress in refactoring the application to use the service layer architecture, one legacy component (MinimalProgramDialog.tsx) still uses direct Supabase calls. This component is scheduled for refactoring in Q2-Q3 2025 to align with the rest of the codebase. 

The refactoring plan provides a clear path forward for bringing all components into alignment with the service layer architecture, ensuring a consistent and maintainable codebase across the entire application. 