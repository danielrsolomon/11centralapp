"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const backendContentService_1 = require("../../services/backendContentService");
/**
 * Helper to log and send JSON responses with proper headers
 */
const sendJSONResponse = (res, status, responseData, logPrefix) => {
    // Set the content type header explicitly
    res.setHeader('Content-Type', 'application/json');
    // Log the exact response payload being sent
    console.log(`DEBUG - ${logPrefix} Response [EXACT]:`, JSON.stringify(responseData, null, 2));
    // Log the response headers
    console.log(`DEBUG - ${logPrefix} Response Headers:`, res.getHeaders());
    // Log the structure of the response (for quick reference)
    console.log(`DEBUG - ${logPrefix} Response Structure:`, {
        keys: Object.keys(responseData),
        success: responseData.success,
        dataType: responseData.data ? (Array.isArray(responseData.data) ? 'array' : typeof responseData.data) : 'null',
        errorPresent: !!responseData.error
    });
    // Send the response
    return res.status(status).json(responseData);
};
const router = (0, express_1.Router)();
/**
 * Validation schemas for University Programs
 * These schemas use Zod for type validation and ensuring data integrity
 */
const programIdSchema = zod_1.z.object({
    programId: zod_1.z.string().uuid({ message: 'Invalid program ID format' })
});
const departmentIdSchema = zod_1.z.object({
    departmentId: zod_1.z.string().uuid({ message: 'Invalid department ID format' })
});
const createProgramSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, { message: 'Title is required' }),
    description: zod_1.z.string().optional(),
    department_id: zod_1.z.string().uuid({ message: 'Invalid department ID format' }).optional(),
    thumbnail_url: zod_1.z.string().url().optional(),
    published: zod_1.z.boolean().optional(),
    order: zod_1.z.number().optional()
});
const updateProgramSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, { message: 'Title is required' }).optional(),
    description: zod_1.z.string().optional(),
    department_id: zod_1.z.string().uuid({ message: 'Invalid department ID format' }).optional(),
    thumbnail_url: zod_1.z.string().url().optional(),
    published: zod_1.z.boolean().optional(),
    order: zod_1.z.number().optional()
});
const reorderProgramsSchema = zod_1.z.object({
    program_ids: zod_1.z.array(zod_1.z.string().uuid({ message: 'Invalid program ID format' }))
});
/**
 * @route GET /api/university/programs
 * @desc Get all programs with optional ordering
 * @access Authenticated - Any authenticated user can access program listings
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('API: Fetching all programs');
        const { query } = req;
        const filterPublished = query.published === 'true';
        const { data, error } = await backendContentService_1.backendContentService.getAllPrograms(filterPublished);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to fetch programs', 'PROGRAMS_FETCH_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs GET All Error');
        }
        const successResponse = {
            success: true,
            data: data || []
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs GET All Success');
    }
    catch (error) {
        console.error('API: Unexpected error in GET /programs:', error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error fetching programs', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs GET All Exception');
    }
});
/**
 * @route GET /api/university/programs/by-department/:departmentId
 * @desc Get programs by department
 * @access Authenticated - Any authenticated user can access program listings
 */
router.get('/by-department/:departmentId', (0, validation_1.validateParams)(departmentIdSchema), async (req, res, next) => {
    try {
        console.log(`API: Fetching programs for department ${req.params.departmentId}`);
        const { departmentId } = req.params;
        const { data, error } = await backendContentService_1.backendContentService.getProgramsByDepartment(departmentId);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to fetch programs by department', 'PROGRAMS_FETCH_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs GET By Department Error');
        }
        const successResponse = {
            success: true,
            data: data || []
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs GET By Department Success');
    }
    catch (error) {
        console.error(`API: Unexpected error in GET /programs/by-department/${req.params.departmentId}:`, error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error fetching programs by department', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs GET By Department Exception');
    }
});
/**
 * @route GET /api/university/programs/:programId
 * @desc Get a single program by ID with its associated courses
 * @access Authenticated - Any authenticated user can view program details
 */
router.get('/:programId', (0, validation_1.validateParams)(programIdSchema), async (req, res, next) => {
    try {
        console.log(`API: Fetching program ${req.params.programId}`);
        const { programId } = req.params;
        const includeCourses = req.query.includeCourses === 'true';
        const { data, error } = await backendContentService_1.backendContentService.getProgramById(programId, includeCourses);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to fetch program', 'PROGRAM_FETCH_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs GET By ID Error');
        }
        if (!data) {
            const notFoundResponse = (0, error_handler_1.createErrorResponse)(404, 'Program not found', 'PROGRAM_NOT_FOUND');
            return sendJSONResponse(res, 404, notFoundResponse, 'Programs GET By ID Not Found');
        }
        const successResponse = {
            success: true,
            data
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs GET By ID Success');
    }
    catch (error) {
        console.error(`API: Unexpected error in GET /programs/${req.params.programId}:`, error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error fetching program', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs GET By ID Exception');
    }
});
/**
 * @route POST /api/university/programs
 * @desc Create a new program
 * @access Admin or SuperAdmin - Only administrators can create programs
 */
router.post('/', (0, validation_1.validateBody)(createProgramSchema), async (req, res, next) => {
    try {
        console.log('API: Creating new program');
        const programData = req.body;
        const { data, error } = await backendContentService_1.backendContentService.createProgram(programData);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to create program', 'PROGRAM_CREATE_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs POST Create Error');
        }
        const successResponse = {
            success: true,
            data
        };
        return sendJSONResponse(res, 201, successResponse, 'Programs POST Create Success');
    }
    catch (error) {
        console.error('API: Unexpected error in POST /programs:', error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error creating program', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs POST Create Exception');
    }
});
/**
 * @route PUT /api/university/programs/:programId
 * @desc Update an existing program
 * @access Admin or SuperAdmin - Only administrators can update programs
 */
router.put('/:programId', (0, validation_1.validateParams)(programIdSchema), (0, validation_1.validateBody)(updateProgramSchema), async (req, res, next) => {
    try {
        console.log(`API: Updating program ${req.params.programId}`);
        const { programId } = req.params;
        const programData = req.body;
        const { data, error } = await backendContentService_1.backendContentService.updateProgram(programId, programData);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to update program', 'PROGRAM_UPDATE_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Update Error');
        }
        if (!data) {
            const notFoundResponse = (0, error_handler_1.createErrorResponse)(404, 'Program not found', 'PROGRAM_NOT_FOUND');
            return sendJSONResponse(res, 404, notFoundResponse, 'Programs PUT Update Not Found');
        }
        const successResponse = {
            success: true,
            data
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs PUT Update Success');
    }
    catch (error) {
        console.error(`API: Unexpected error in PUT /programs/${req.params.programId}:`, error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error updating program', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Update Exception');
    }
});
/**
 * @route DELETE /api/university/programs/:programId
 * @desc Delete a program if it has no associated courses
 * @access Admin or SuperAdmin - Only administrators can delete programs
 */
router.delete('/:programId', (0, validation_1.validateParams)(programIdSchema), async (req, res, next) => {
    try {
        console.log(`API: Deleting program ${req.params.programId}`);
        const { programId } = req.params;
        const { data, error } = await backendContentService_1.backendContentService.deleteProgram(programId);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to delete program', 'PROGRAM_DELETE_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs DELETE Error');
        }
        if (!data) {
            const notFoundResponse = (0, error_handler_1.createErrorResponse)(404, 'Program not found or already deleted', 'PROGRAM_NOT_FOUND');
            return sendJSONResponse(res, 404, notFoundResponse, 'Programs DELETE Not Found');
        }
        const successResponse = {
            success: true,
            data: { id: programId, deleted: true }
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs DELETE Success');
    }
    catch (error) {
        console.error(`API: Unexpected error in DELETE /programs/${req.params.programId}:`, error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error deleting program', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs DELETE Exception');
    }
});
/**
 * @route PUT /api/university/programs/reorder
 * @desc Reorder multiple programs by updating their order values
 * @access Admin or SuperAdmin - Only administrators can reorder programs
 */
router.put('/reorder', (0, validation_1.validateBody)(reorderProgramsSchema), async (req, res, next) => {
    try {
        console.log('API: Reordering programs');
        const { program_ids } = req.body;
        const { data, error } = await backendContentService_1.backendContentService.reorderPrograms(program_ids);
        if (error) {
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, 'Failed to reorder programs', 'PROGRAMS_REORDER_ERROR', error);
            return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Reorder Error');
        }
        const successResponse = {
            success: true,
            data
        };
        return sendJSONResponse(res, 200, successResponse, 'Programs PUT Reorder Success');
    }
    catch (error) {
        console.error('API: Unexpected error in PUT /programs/reorder:', error);
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error reordering programs', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        return sendJSONResponse(res, 500, errorResponse, 'Programs PUT Reorder Exception');
    }
});
exports.default = router;
//# sourceMappingURL=programs.js.map