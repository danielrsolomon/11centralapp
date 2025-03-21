"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_1 = __importDefault(require("./users"));
const roles_1 = __importDefault(require("./roles"));
const settings_1 = __importDefault(require("./settings"));
const logs_1 = __importDefault(require("./logs"));
const schema_1 = __importDefault(require("./schema"));
const router = (0, express_1.Router)();
/**
 * @route GET /api/admin
 * @desc Root route for admin module, provides module info and available endpoints
 * @access Public
 */
router.get('/', (req, res) => {
    res.json({
        module: 'Admin',
        description: 'Administrative functionality for managing users, roles, settings, and monitoring system activity',
        version: '1.0.0',
        endpoints: {
            '/api/admin/users': 'User management',
            '/api/admin/roles': 'Role management',
            '/api/admin/settings': 'System settings management',
            '/api/admin/logs': 'System logs and activity monitoring',
            '/api/admin/schema': 'Database schema operations'
        }
    });
});
// Mount the sub-routes
router.use('/users', users_1.default);
router.use('/roles', roles_1.default);
router.use('/settings', settings_1.default);
router.use('/logs', logs_1.default);
router.use('/schema', schema_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map