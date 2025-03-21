"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const university_1 = __importDefault(require("./university"));
const chat_1 = __importDefault(require("./chat"));
const schedule_1 = __importDefault(require("./schedule"));
const gratuity_1 = __importDefault(require("./gratuity"));
const admin_1 = __importDefault(require("./admin"));
const error_handler_1 = require("../middleware/error-handler");
// Import route modules
// We'll add these as we create them
// import universityRoutes from './university';
// import chatRoutes from './chat';
// import scheduleRoutes from './schedule';
// import gratuityRoutes from './gratuity';
// import adminRoutes from './admin';
// import authRoutes from './auth';
const router = (0, express_1.Router)();
// Root route with API information
router.get('/', (_req, res) => {
    res.json({
        name: 'E11EVEN Central API',
        version: '1.0.0',
        description: 'API for E11EVEN Central application',
        endpoints: [
            '/api/university',
            '/api/chat',
            '/api/schedule',
            '/api/gratuity',
            '/api/admin'
        ]
    });
});
// Mount routes
router.use('/university', university_1.default);
router.use('/chat', chat_1.default);
router.use('/schedule', schedule_1.default);
router.use('/gratuity', gratuity_1.default);
router.use('/admin', admin_1.default);
// Handle 404 - must be after all routes
router.use(error_handler_1.notFoundHandler);
// Error handling middleware - must be last
router.use(error_handler_1.errorHandler);
exports.default = router;
//# sourceMappingURL=index.js.map