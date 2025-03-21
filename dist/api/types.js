"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHandler = exports.asyncHandler = void 0;
// Helper function to cast an async handler to a RequestHandler type
// This helps TypeScript understand that our handlers are compatible with Express
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
exports.asyncHandler = asyncHandler;
// Helper function to cast an authenticated async handler to a RequestHandler type
const authHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
exports.authHandler = authHandler;
//# sourceMappingURL=types.js.map