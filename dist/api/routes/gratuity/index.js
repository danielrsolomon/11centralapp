"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tips_1 = __importDefault(require("./tips"));
const payments_1 = __importDefault(require("./payments"));
const stats_1 = __importDefault(require("./stats"));
const router = (0, express_1.Router)();
/**
 * @route GET /api/gratuity
 * @desc Root route for gratuity module, provides module info and available endpoints
 * @access Public
 */
router.get('/', (req, res) => {
    res.json({
        module: 'Gratuity',
        description: 'API endpoints for managing tips and gratuities',
        version: '1.0.0',
        endpoints: {
            '/api/gratuity/tips': 'Tip management',
            '/api/gratuity/payment-session': 'Payment processing for tips',
            '/api/gratuity/stats': 'Statistics and reporting'
        }
    });
});
// Mount the sub-routes
router.use('/tips', tips_1.default);
router.use('/payment-session', payments_1.default);
router.use('/stats', stats_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map