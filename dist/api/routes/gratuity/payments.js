"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../../../services/supabase");
const auth_1 = require("../../middleware/auth");
const validation_1 = require("../../middleware/validation");
const error_handler_1 = require("../../middleware/error-handler");
const router = (0, express_1.Router)();
// Validation schemas
const paymentSessionSchema = zod_1.z.object({
    tip_id: zod_1.z.string().uuid('Invalid tip ID'),
    return_url: zod_1.z.string().url('Invalid return URL')
});
const sessionIdSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid('Invalid session ID format')
});
/**
 * @route POST /api/gratuity/payment-session
 * @desc Create a payment session for processing a tip
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/', auth_1.requireAuth, (0, validation_1.validateBody)(paymentSessionSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { tip_id, return_url } = req.body;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Check if tip exists and belongs to user
        const { data: tip, error: tipError } = await supabase_1.supabase
            .from('gratuity_tips')
            .select('*')
            .eq('id', tip_id)
            .eq('tipper_id', userId)
            .single();
        if (tipError) {
            next(new error_handler_1.ApiError(tipError.message, 400, tipError.code));
            return;
        }
        if (!tip) {
            next(new error_handler_1.ApiError('Tip not found or does not belong to you', 404, 'TIP_NOT_FOUND'));
            return;
        }
        // Ensure the tip is in pending status
        if (tip.payment_status !== 'pending') {
            next(new error_handler_1.ApiError('This tip is not in pending status', 400, 'INVALID_TIP_STATUS'));
            return;
        }
        // Create payment session
        // NOTE: In a real implementation, this would integrate with a payment gateway like Stripe
        const sessionData = {
            tip_id,
            tipper_id: userId,
            provider_id: tip.provider_id,
            amount: tip.amount,
            status: 'awaiting_payment',
            return_url,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min expiry
        };
        const { data: session, error: sessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .insert(sessionData)
            .select()
            .single();
        if (sessionError) {
            next(new error_handler_1.ApiError(sessionError.message, 400, sessionError.code));
            return;
        }
        // In a real implementation, redirect URL would come from payment gateway
        const mockPaymentUrl = `https://example.com/pay?session=${session.id}&amount=${tip.amount}`;
        res.json({
            success: true,
            data: {
                session_id: session.id,
                payment_url: mockPaymentUrl,
                expires_at: session.expires_at
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route GET /api/gratuity/payment-session/:sessionId
 * @desc Get the status of a payment session
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.get('/:sessionId', auth_1.requireAuth, (0, validation_1.validateParams)(sessionIdSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Get the payment session
        const { data: session, error: sessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .select(`
          *,
          tip:tip_id(id, amount, provider_id, payment_status),
          provider:provider_id(id, first_name, last_name)
        `)
            .eq('id', sessionId)
            .single();
        if (sessionError) {
            next(new error_handler_1.ApiError(sessionError.message, 400, sessionError.code));
            return;
        }
        if (!session) {
            next(new error_handler_1.ApiError('Payment session not found', 404, 'SESSION_NOT_FOUND'));
            return;
        }
        // Check if the user is the tipper or provider
        if (session.tipper_id !== userId && session.provider_id !== userId) {
            next(new error_handler_1.ApiError('You do not have permission to view this session', 403, 'FORBIDDEN'));
            return;
        }
        res.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/gratuity/payment-session/:sessionId/complete
 * @desc Mark a payment session as complete (simulate payment gateway callback)
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/:sessionId/complete', auth_1.requireAuth, (0, validation_1.validateParams)(sessionIdSchema), (0, validation_1.validateBody)(zod_1.z.object({
    status: zod_1.z.enum(['completed', 'failed']),
    transaction_id: zod_1.z.string().optional()
})), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        const { status, transaction_id } = req.body;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Get the payment session
        const { data: session, error: sessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        if (sessionError) {
            next(new error_handler_1.ApiError(sessionError.message, 400, sessionError.code));
            return;
        }
        if (!session) {
            next(new error_handler_1.ApiError('Payment session not found', 404, 'SESSION_NOT_FOUND'));
            return;
        }
        // Check if the user is the tipper (in real implementation, this would be validated by payment gateway)
        if (session.tipper_id !== userId) {
            next(new error_handler_1.ApiError('You do not have permission to complete this session', 403, 'FORBIDDEN'));
            return;
        }
        // Check if session is still valid
        const now = new Date();
        const expiresAt = new Date(session.expires_at);
        if (now > expiresAt) {
            next(new error_handler_1.ApiError('Payment session has expired', 400, 'SESSION_EXPIRED'));
            return;
        }
        // Check if session is already completed
        if (session.status !== 'awaiting_payment') {
            next(new error_handler_1.ApiError('Payment session is already processed', 400, 'SESSION_ALREADY_PROCESSED'));
            return;
        }
        // Update session status
        const { data: updatedSession, error: updateSessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .update({
            status: status === 'completed' ? 'payment_received' : 'payment_failed',
            transaction_id,
            completed_at: new Date().toISOString()
        })
            .eq('id', sessionId)
            .select()
            .single();
        if (updateSessionError) {
            next(new error_handler_1.ApiError(updateSessionError.message, 400, updateSessionError.code));
            return;
        }
        // If payment is successful, update tip status
        if (status === 'completed') {
            const { error: updateTipError } = await supabase_1.supabase
                .from('gratuity_tips')
                .update({
                payment_status: 'completed',
                updated_at: new Date().toISOString()
            })
                .eq('id', session.tip_id);
            if (updateTipError) {
                next(new error_handler_1.ApiError(updateTipError.message, 400, updateTipError.code));
                return;
            }
        }
        else {
            // Mark tip as failed if payment failed
            const { error: updateTipError } = await supabase_1.supabase
                .from('gratuity_tips')
                .update({
                payment_status: 'failed',
                updated_at: new Date().toISOString()
            })
                .eq('id', session.tip_id);
            if (updateTipError) {
                next(new error_handler_1.ApiError(updateTipError.message, 400, updateTipError.code));
                return;
            }
        }
        res.json({
            success: true,
            data: {
                session: updatedSession,
                status,
                return_url: session.return_url
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route POST /api/gratuity/payment-session/:sessionId/cancel
 * @desc Cancel a payment session
 * @access Authenticated
 */
// @ts-ignore: Express router type compatibility
router.post('/:sessionId/cancel', auth_1.requireAuth, (0, validation_1.validateParams)(sessionIdSchema), async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        if (!userId) {
            next(new error_handler_1.ApiError('User ID is required', 400, 'USER_REQUIRED'));
            return;
        }
        // Get the payment session
        const { data: session, error: sessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        if (sessionError) {
            next(new error_handler_1.ApiError(sessionError.message, 400, sessionError.code));
            return;
        }
        if (!session) {
            next(new error_handler_1.ApiError('Payment session not found', 404, 'SESSION_NOT_FOUND'));
            return;
        }
        // Check if the user is the tipper
        if (session.tipper_id !== userId) {
            next(new error_handler_1.ApiError('You do not have permission to cancel this session', 403, 'FORBIDDEN'));
            return;
        }
        // Check if session can be cancelled
        if (session.status !== 'awaiting_payment') {
            next(new error_handler_1.ApiError('Only pending payment sessions can be cancelled', 400, 'INVALID_SESSION_STATUS'));
            return;
        }
        // Update session status
        const { data: updatedSession, error: updateSessionError } = await supabase_1.supabase
            .from('gratuity_payment_sessions')
            .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
        })
            .eq('id', sessionId)
            .select()
            .single();
        if (updateSessionError) {
            next(new error_handler_1.ApiError(updateSessionError.message, 400, updateSessionError.code));
            return;
        }
        res.json({
            success: true,
            data: {
                session: updatedSession,
                return_url: session.return_url
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map