"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointments_1 = __importDefault(require("./appointments"));
const availability_1 = __importDefault(require("./availability"));
const services_1 = __importDefault(require("./services"));
const router = (0, express_1.Router)();
// Root route with module information
router.get('/', (_req, res) => {
    res.json({
        name: 'Schedule Module',
        description: 'Appointment scheduling and provider availability management',
        endpoints: [
            '/api/schedule/appointments',
            '/api/schedule/availability',
            '/api/schedule/services'
        ]
    });
});
// Mount sub-routes
router.use('/appointments', appointments_1.default);
router.use('/availability', availability_1.default);
router.use('/services', services_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map