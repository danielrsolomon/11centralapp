"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const programs_1 = __importDefault(require("./programs"));
const courses_1 = __importDefault(require("./courses"));
const modules_1 = __importDefault(require("./modules"));
const lessons_1 = __importDefault(require("./lessons"));
const progress_1 = __importDefault(require("./progress"));
const error_handler_1 = require("../../middleware/error-handler");
const backendContentService_1 = require("../../services/backendContentService");
const router = (0, express_1.Router)();
/**
 * Helper to get a safe error code from any error object
 */
const getErrorCode = (error) => {
    if (error && typeof error === 'object') {
        // Check if it's a PostgrestError with a code property
        if ('code' in error) {
            return error.code;
        }
        // Check if error has a name that can be used as code
        if ('name' in error && typeof error.name === 'string') {
            return error.name;
        }
    }
    return 'UNKNOWN_ERROR';
};
// Root route with module information
router.get('/', (_req, res) => {
    res.json({
        name: 'University Module',
        description: 'Learning management system for E11EVEN Central',
        endpoints: [
            '/api/university/programs',
            '/api/university/courses',
            '/api/university/modules',
            '/api/university/lessons',
            '/api/university/progress',
            '/api/university/content/hierarchy'
        ]
    });
});
// Content hierarchy endpoint - refactored to use backend service layer
// @ts-ignore: Express router type compatibility
router.get('/content/hierarchy', async (req, res, next) => {
    try {
        console.log('API: Fetching content hierarchy');
        // Use the backend content service to get hierarchy data
        const { data, error } = await backendContentService_1.backendContentService.getContentHierarchy();
        if (error) {
            console.error('API: Error fetching content hierarchy:', error);
            // Create standardized error response
            const errorResponse = (0, error_handler_1.createErrorResponse)(500, error.message || 'Failed to fetch content hierarchy', getErrorCode(error) || 'CONTENT_HIERARCHY_ERROR', error);
            // Enhanced debugging - log the exact error response being sent
            console.log('DEBUG - Content Hierarchy Error Response [EXACT]:', JSON.stringify(errorResponse, null, 2));
            // Explicitly set content type
            res.setHeader('Content-Type', 'application/json');
            // Log response headers
            console.log('DEBUG - Content Hierarchy Error Response Headers:', res.getHeaders());
            return res.status(500).json(errorResponse);
        }
        // Create standardized success response
        const successResponse = {
            success: true,
            data: data || []
        };
        // Enhanced debugging - log the exact success response being sent
        console.log('DEBUG - Content Hierarchy Success Response [EXACT]:', JSON.stringify(successResponse, null, 2));
        console.log('DEBUG - Content Hierarchy Response Structure:', {
            success: successResponse.success,
            dataIsArray: Array.isArray(successResponse.data),
            dataLength: Array.isArray(successResponse.data) ? successResponse.data.length : 'not an array',
            firstItem: Array.isArray(successResponse.data) && successResponse.data.length > 0 ?
                JSON.stringify(successResponse.data[0]).substring(0, 100) + '...' : 'no items',
            responseKeys: Object.keys(successResponse)
        });
        // Explicitly set content type
        res.setHeader('Content-Type', 'application/json');
        // Log response headers
        console.log('DEBUG - Content Hierarchy Success Response Headers:', res.getHeaders());
        // Return the hierarchical tree with consistent format
        return res.json(successResponse);
    }
    catch (error) {
        console.error('API: Unexpected error fetching content hierarchy:', error);
        // Return a valid JSON response with error information using helper
        const errorResponse = (0, error_handler_1.createErrorResponse)(500, error instanceof Error ? error.message : 'Unexpected error fetching content hierarchy', 'UNEXPECTED_ERROR', error instanceof Error ? error.stack : String(error));
        // Enhanced debugging - log the exact catch error response being sent
        console.log('DEBUG - Content Hierarchy Catch Error Response [EXACT]:', JSON.stringify(errorResponse, null, 2));
        // Explicitly set content type
        res.setHeader('Content-Type', 'application/json');
        // Log response headers
        console.log('DEBUG - Content Hierarchy Catch Error Response Headers:', res.getHeaders());
        return res.status(500).json(errorResponse);
    }
});
// Mount sub-routes
router.use('/programs', programs_1.default);
router.use('/courses', courses_1.default);
router.use('/modules', modules_1.default);
router.use('/lessons', lessons_1.default);
router.use('/progress', progress_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map