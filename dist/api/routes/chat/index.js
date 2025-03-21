"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rooms_1 = __importDefault(require("./rooms"));
const messages_1 = __importDefault(require("./messages"));
const reactions_1 = __importDefault(require("./reactions"));
const router = (0, express_1.Router)();
// Root route with module information
router.get('/', (_req, res) => {
    res.json({
        name: 'Chat Module',
        description: 'Real-time messaging system for E11EVEN Central',
        endpoints: [
            '/api/chat/rooms',
            '/api/chat/rooms/:roomId/messages',
            '/api/chat/messages/:messageId',
            '/api/chat/messages/:messageId/reactions'
        ]
    });
});
// Mount sub-routes
router.use('/rooms', rooms_1.default);
router.use('/rooms', messages_1.default); // Handles /rooms/:roomId/messages
router.use('/messages', reactions_1.default); // Handles /messages/:messageId/reactions
exports.default = router;
//# sourceMappingURL=index.js.map