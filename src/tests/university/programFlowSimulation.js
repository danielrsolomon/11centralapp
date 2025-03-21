// Simple end-to-end simulation for E11EVEN University module
import { programService } from '../../services/programService.js';

// Simulate file object for test
class MockFile {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.size = 1024;
  }
}

async function simulateUniversityFlow() {
  console.log('Starting E11EVEN University module end-to-end simulation...');
  console.log('------------------------------------------------------');

  try {
    // STEP 1: Program Creation with Thumbnail
    console.log('STEP 1: Creating a new program with thumbnail');
    
    const mockThumbnail = new MockFile('test-thumbnail.jpg', 'image/jpeg');
    const programData = {
      title: 'Test Program (End-to-End)',
      description: 'This is a test program created during end-to-end testing',
      status: 'active',
      departments: [],
      created_by: 'test-user-id',
    };
    
    console.log('Program data:', programData);
    console.log('Using thumbnail:', mockThumbnail.name);
    
    const departmentIds = ['dept-1', 'dept-2'];
    console.log('Selected departments:', departmentIds);
    
    console.log('Calling programService.createProgramWithThumbnail...');
    const createResult = await programService.createProgramWithThumbnail(
      programData,
      mockThumbnail,
      departmentIds
    );
    
    console.log('Creation result:', createResult.error ? 'ERROR' : 'SUCCESS');
    if (createResult.error) {
      console.error('Error during program creation:', createResult.error);
    } else {
      console.log('Program created successfully with ID:', createResult.data?.id);
      console.log('Thumbnail URL:', createResult.data?.thumbnail_url);
    }
    
    // STEP 2: API Processing (simulated by checking result structure)
    console.log('\nSTEP 2: Verifying API Processing');
    console.log('Checking response structure from service layer...');
    
    if (createResult.data && typeof createResult.data === 'object') {
      console.log('✓ Response contains data object');
      
      const requiredFields = ['id', 'title', 'description', 'thumbnail_url', 'created_at', 'updated_at'];
      const missingFields = requiredFields.filter(field => !(field in createResult.data));
      
      if (missingFields.length === 0) {
        console.log('✓ Response contains all required fields');
      } else {
        console.log('✗ Response missing required fields:', missingFields.join(', '));
      }
    } else {
      console.log('✗ Response does not contain proper data object');
    }
    
    if (createResult.error === null) {
      console.log('✓ Error field is null (no errors)');
    } else {
      console.log('✗ Error field contains error:', createResult.error);
    }
    
    // STEP 3: Program Listing
    console.log('\nSTEP 3: Fetching Program List');
    console.log('Calling programService.getPublishedPrograms...');
    
    const listResult = await programService.getPublishedPrograms();
    
    console.log('Listing result:', listResult.error ? 'ERROR' : 'SUCCESS');
    if (listResult.error) {
      console.error('Error fetching programs:', listResult.error);
    } else {
      console.log('Retrieved', listResult.data?.length || 0, 'programs');
      
      // Check if our newly created program is in the list
      if (createResult.data && listResult.data) {
        const newProgramInList = listResult.data.find(p => p.id === createResult.data.id);
        
        if (newProgramInList) {
          console.log('✓ Newly created program found in listing');
          
          // Verify data consistency
          const consistencyIssues = [];
          if (newProgramInList.title !== createResult.data.title) {
            consistencyIssues.push('title mismatch');
          }
          if (newProgramInList.description !== createResult.data.description) {
            consistencyIssues.push('description mismatch');
          }
          if (newProgramInList.thumbnail_url !== createResult.data.thumbnail_url) {
            consistencyIssues.push('thumbnail_url mismatch');
          }
          
          if (consistencyIssues.length === 0) {
            console.log('✓ Data consistency verified between creation and listing');
          } else {
            console.log('✗ Data consistency issues:', consistencyIssues.join(', '));
          }
        } else {
          console.log('✗ Newly created program NOT found in listing');
        }
      }
    }
    
    // STEP 4: Error Handling Tests
    console.log('\nSTEP 4: Testing Error Handling');
    
    // Test with invalid data
    console.log('Testing creation with invalid data (missing required fields)...');
    const invalidResult = await programService.createProgramWithThumbnail({
      // Missing title and other required fields
      description: 'Test description'
    });
    
    if (invalidResult.error) {
      console.log('✓ Error correctly returned for invalid data:', invalidResult.error.message);
    } else {
      console.log('✗ No error returned for invalid data');
    }
    
    // Test with invalid thumbnail
    console.log('Testing creation with invalid thumbnail type...');
    const invalidThumbnail = new MockFile('test.pdf', 'application/pdf');
    const invalidFileResult = await programService.createProgramWithThumbnail(
      {
        title: 'Test Program',
        description: 'Test description',
        status: 'active',
        departments: [],
        created_by: 'test-user-id',
      },
      invalidThumbnail
    );
    
    if (invalidFileResult.error) {
      console.log('✓ Error correctly returned for invalid file type:', invalidFileResult.error.message);
    } else {
      console.log('✗ No error returned for invalid file type');
    }
    
    console.log('\nEnd-to-End Test Completion');
    console.log('------------------------------------------------------');
    console.log('Summary:');
    
    if (!createResult.error && !listResult.error) {
      console.log('✅ End-to-end flow completed successfully. Service layer is integrated correctly.');
    } else {
      console.log('❌ End-to-end flow encountered errors. Service layer integration may have issues.');
    }
    
    console.log('Test completed.');
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
    console.log('❌ End-to-end flow failed due to unexpected error.');
  }
}

// Execute the simulation
simulateUniversityFlow().catch(console.error); 