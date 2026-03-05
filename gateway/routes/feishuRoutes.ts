/**
 * FeishuRoutes - Feishu Webhook Gateway
 *
 * Endpoint: POST /api/v1/feishu/webhook
 * Security: X-Lark-Signature verification
 * Events Handled:
 *   - im.message.receive_v1 (Text & Image messages)
 *   - card.action.trigger (HITL button clicks)
 *
 * Required npm dependencies:
 *   npm install express crypto express-validator uuid
 *   npm install @types/express @types/crypto-js @types/uuid --save-dev
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { body, header, validationResult } from 'express-validator';
import { RouterService, RoutingContext } from '../services/ai/RouterService';
import { OpenClawEnvelope, OpenClawAction } from '../types/openclaw_types';

const router = Router();

// Feishu webhook configuration
const FEISHU_CONFIG = {
  // Get from Feishu Open Platform console
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  // Encryption key for signature verification
  encryptKey: process.env.FEISHU_ENCRYPT_KEY || ''
};

// Instantiate RouterService
const routerService = new RouterService();

/**
 * Verify Feishu webhook signature
 * Uses HMAC-SHA256 with app_secret
 */
function verifySignature(timestamp: string, nonce: string, bodyRaw: string): string {
  const signString = `${timestamp}\n${nonce}\n${bodyRaw}\n${FEISHU_CONFIG.appSecret}`;
  const signature = crypto
    .createHmac('sha256', FEISHU_CONFIG.appSecret)
    .update(signString)
    .digest('base64');

  return signature;
}

/**
 * Extract text content from Feishu message event
 */
function extractTextContent(event: any): string | null {
  try {
    if (event.message && event.message.message_type === 'text') {
      return event.message.text?.content || null;
    }

    // For image messages, return placeholder (image processing handled separately)
    if (event.message && event.message.message_type === 'image') {
      return '[IMAGE_RECEIVED]';
    }

    return null;
  } catch (error) {
    console.error('[Feishu] Error extracting text content:', error);
    return null;
  }
}

/**
 * Extract image content from Feishu message event
 */
function extractImageContent(event: any): string[] {
  const images: string[] = [];

  try {
    if (event.message && event.message.message_type === 'image') {
      // Image token - would need to call Feishu API to get actual image
      const imageKey = event.message.image_key;
      if (imageKey) {
        images.push(`feishu_image:${imageKey}`);
      }
    }
  } catch (error) {
    console.error('[Feishu] Error extracting image content:', error);
  }

  return images;
}

/**
 * Extract member ID from Feishu event
 */
function extractMemberId(event: any): number | undefined {
  try {
    const userId = event.sender?.sender_id?.user_id;
    if (userId) {
      // Convert Feishu user_id to numeric member ID (mock conversion)
      // In production: Query Bitable to map user_id -> member_id
      return parseInt(userId.replace(/\D/g, '').slice(-6)) || undefined;
    }
    return undefined;
  } catch (error) {
    console.error('[Feishu] Error extracting member ID:', error);
    return undefined;
  }
}

/**
 * POST /api/v1/feishu/webhook
 * Main webhook entry point for Feishu events
 */
router.post(
  '/webhook',
  [
    // Validation rules
    header('x-lark-signature')
      .notEmpty()
      .withMessage('X-Lark-Signature header is required'),
    header('x-lark-timestamp')
      .notEmpty()
      .withMessage('X-Lark-Timestamp header is required'),
    header('x-lark-nonce')
      .notEmpty()
      .withMessage('X-Lark-Nonce header is required')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.warn('[Feishu] Validation failed:', errors.array());
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
        return;
      }

      // Extract headers for signature verification
      const signature = req.headers['x-lark-signature'] as string;
      const timestamp = req.headers['x-lark-timestamp'] as string;
      const nonce = req.headers['x-lark-nonce'] as string;

      // Get raw body for signature verification
      const bodyRaw = JSON.stringify(req.body);

      // Verify signature
      const expectedSignature = verifySignature(timestamp, nonce, bodyRaw);
      if (signature !== expectedSignature && process.env.NODE_ENV === 'production') {
        console.warn('[Feishu] Invalid signature detected');
        res.status(401).json({
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Signature verification failed'
        });
        return;
      }

      // Parse event
      const event = req.body;
      console.log('[Feishu] Received event:', JSON.stringify(event, null, 2));

      // Handle different event types
      const eventType = event.type;
      const challenge = event.challenge; // URL verification challenge

      // URL verification (Feishu initial verification)
      if (challenge) {
        console.log('[Feishu] URL verification challenge received');
        res.status(200).json({ challenge });
        return;
      }

      // Process message or card events
      if (eventType === 'im.message.receive_v1') {
        await handleMessageEvent(event, res);
      } else if (eventType === 'card.action.trigger') {
        await handleCardActionEvent(event, res);
      } else {
        console.log(`[Feishu] Unhandled event type: ${eventType}`);
        res.status(200).json({ success: true, message: 'Event received' });
      }

    } catch (error) {
      console.error('[Feishu Webhook] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process webhook'
      });
    }
  }
);

/**
 * Handle incoming message events (text & image)
 */
async function handleMessageEvent(event: any, res: Response): Promise<void> {
  try {
    const textContent = extractTextContent(event);
    const images = extractImageContent(event);
    const memberId = extractMemberId(event);

    if (!textContent && images.length === 0) {
      res.status(200).json({
        success: false,
        error: 'NO_CONTENT',
        message: 'No text or image content found'
      });
      return;
    }

    // Check if HITL required (high-stakes action)
    const requireHitl = event.message?.chat_id?.includes('admin') || false;

    // Build routing context
    const context: RoutingContext = {
      userMessage: textContent || '[Image message]',
      images: images.length > 0 ? images : undefined,
      memberId,
      highStakes: requireHitl
    };

    console.log('[Feishu] Routing message to AI:', {
      messageLength: context.userMessage.length,
      hasImages: !!context.images,
      memberId: context.memberId,
      highStakes: context.highStakes
    });

    // Route to AI service
    const result = await routerService.route(context);

    if (!result.success) {
      console.error('[Feishu] Routing failed:', result.error);
      // Send error response back to Feishu
      res.status(200).json({
        success: false,
        error: 'ROUTING_FAILED',
        message: result.error
      });
      return;
    }

    // Check if HITL is required
    if (result.response?.action === 'EXECUTE_ACTION' && requireHitl) {
      console.log('[Feishu] HITL required, sending interactive card');
      await sendHitlCard(result.response, event);
      res.status(200).json({
        success: true,
        action: 'HITL_INITIATED',
        requestId: result.response.request_id
      });
      return;
    }

    // Process the OpenClaw envelope
    await processOpenClawEnvelope(result.response!);

    // Acknowledge successful processing
    res.status(200).json({
      success: true,
      action: 'PROCESSED',
      requestId: result.response?.request_id,
      aiAction: result.response?.action
    });

  } catch (error) {
    console.error('[Feishu] Error handling message event:', error);
    throw error;
  }
}

/**
 * Handle card action trigger events (HITL approvals)
 */
async function handleCardActionEvent(event: any, res: Response): Promise<void> {
  try {
    const actionData = event.action?.value;
    const requestId = actionData?.request_id;
    const approved = actionData?.action === 'approve';

    console.log('[Feishu] Card action received:', { requestId, approved });

    if (!requestId) {
      res.status(200).json({
        success: false,
        error: 'MISSING_REQUEST_ID'
      });
      return;
    }

    if (approved) {
      // Retrieve pending command and push to Android
      console.log(`[Feishu] HITL approved for request ${requestId}`);
      // In production: Push to Android via FCM or long-polling
      await pushToAndroid(requestId);
    } else {
      console.log(`[Feishu] HITL rejected for request ${requestId}`);
      // Update status in Bitable
    }

    res.status(200).json({
      success: true,
      action: approved ? 'APPROVED' : 'REJECTED',
      requestId
    });

  } catch (error) {
    console.error('[Feishu] Error handling card action:', error);
    throw error;
  }
}

/**
 * Send interactive message card for HITL
 */
async function sendHitlCard(envelope: OpenClawEnvelope, event: any): Promise<void> {
  // In production: Use Feishu API to send interactive card
  console.log('[Feishu] Sending HITL card for request:', envelope.request_id);

  const cardPayload = {
    config: {
      wide_screen_mode: true
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**Action Approval Required**\n\nRequest ID: ${envelope.request_id}\nAction: ${envelope.action}\nPayload: ${JSON.stringify(envelope.payload)}`
        }
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'lark_md',
              content: '✅ Approve'
            },
            type: 'primary',
            value: {
              action: 'approve',
              request_id: envelope.request_id
            }
          },
          {
            tag: 'button',
            text: {
              tag: 'lark_md',
              content: '❌ Reject'
            },
            type: 'default',
            value: {
              action: 'reject',
              request_id: envelope.request_id
            }
          }
        ]
      }
    ]
  };

  // Mock: Log card payload (in production: POST to Feishu message API)
  console.log('[Feishu] Card payload:', JSON.stringify(cardPayload, null, 2));
}

/**
 * Process OpenClaw envelope - store in command queue
 */
async function processOpenClawEnvelope(envelope: OpenClawEnvelope): Promise<void> {
  console.log('[Feishu] Processing OpenClaw envelope:', envelope.request_id);

  // In production:
  // 1. Store in Bitable (command queue)
  // 2. Push to Android via FCM
  // 3. Or queue for Android to poll

  // Mock: Store in memory (replace with database)
  const command = {
    requestId: envelope.request_id,
    deviceId: envelope.target_device,
    command: envelope,
    status: 'pending' as const,
    createdAt: Date.now()
  };

  // Import from commandRoutes (mock store)
  // In production: Use database
  console.log('[Feishu] Command stored:', command.requestId);
}

/**
 * Push approved command to Android device
 */
async function pushToAndroid(requestId: string): Promise<void> {
  // In production: Use FCM (Firebase Cloud Messaging) to push to Android
  console.log(`[Feishu] Pushing approved request ${requestId} to Android`);
}

/**
 * GET /api/v1/feishu/health
 * Health check for webhook
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'feishu_gateway',
    timestamp: Math.floor(Date.now() / 1000)
  });
});

export default router;
export { FEISHU_CONFIG };
