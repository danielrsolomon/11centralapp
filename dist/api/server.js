"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// API Server Entry Point
const index_1 = require("./index");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Default port is 3001 or from environment variable
const PORT = parseInt(process.env.PORT || '3001', 10);
// Start the API server
console.log(`Starting E11EVEN Central API server on port ${PORT}...`);
(0, index_1.startApiServer)(PORT);
//# sourceMappingURL=server.js.map