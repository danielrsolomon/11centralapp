"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
exports.createApiServer = createApiServer;
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = require("body-parser");
const error_handler_1 = require("./middleware/error-handler");
const routes_1 = __importDefault(require("./routes"));
/**
 * Configure and create the Express API server
 */
function createApiServer() {
    const app = (0, express_1.default)();
    // Configure middleware
    app.use((0, cors_1.default)());
    app.use((0, body_parser_1.json)());
    app.use((0, body_parser_1.urlencoded)({ extended: true }));
    // Log all requests
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });
    // Mount API routes
    app.use('/api', routes_1.default);
    // Handle 404s
    app.use(error_handler_1.notFoundHandler);
    // Global error handler
    app.use(error_handler_1.errorHandler);
    return app;
}
/**
 * Start the API server on the specified port
 */
function startApiServer(port = 5000) {
    const app = createApiServer();
    app.listen(port, () => {
        console.log(`E11EVEN Central API server running on port ${port}`);
    });
    return app;
}
// Re-export all admin API functions for backwards compatibility
__exportStar(require("./supabaseAdmin"), exports);
// Export the Supabase admin client
var supabaseAdmin_1 = require("./supabaseAdmin");
Object.defineProperty(exports, "supabaseAdmin", { enumerable: true, get: function () { return supabaseAdmin_1.supabaseAdmin; } });
//# sourceMappingURL=index.js.map