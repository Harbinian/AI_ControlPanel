import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory store (replace with actual DB/Redis in production)
interface DeviceCommand {
  requestId: string;
  deviceId: string;
  command: any;
  status: 'pending' | 'sent' | 'acknowledged';
  createdAt: number;
}

const pendingCommands: Map<string, DeviceCommand[]> = new Map();

/**
 * GET /api/v1/commands
 * Android Edge pulls pending commands for this device.
 */
router.get(
  '/',
  [
    query('device_id').notEmpty().withMessage('device_id is required'),
    query('last_sync').isNumeric().withMessage('last_sync must be a number')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
        return;
      }

      const { device_id, last_sync } = req.query;

      // Fetch pending commands for device (mock implementation)
      const commands = pendingCommands.get(device_id as string) || [];

      const pending = commands.filter(c =>
        c.status === 'pending' && c.createdAt > Number(last_sync) * 1000
      );

      res.status(200).json(pending.map(c => ({
        claw_version: "1.0",
        request_id: c.requestId,
        timestamp: Math.floor(c.createdAt / 1000),
        source: "feishu_gateway",
        target_device: device_id,
        action: c.command.action,
        payload: c.command.payload
      })));

    } catch (error) {
      console.error('[GET /commands] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch commands'
      });
    }
  }
);

/**
 * POST /api/v1/commands/:requestId/ack
 * Android sends ACK after command execution.
 */
router.post(
  '/:requestId/ack',
  [
    body('request_id').notEmpty(),
    body('status').isIn(['SUCCESS', 'FAILED', 'PENDING_HITL']),
    body('executed_at').isNumeric(),
    body('result').optional().isObject(),
    body('error').optional().isString()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
        return;
      }

      const { requestId } = req.params;
      const { status, result, error } = req.body;

      console.log(`[ACK] Request ${requestId}: ${status}`);

      // Update command status in store (mock)
      // In production: Update in database/Bitable

      res.status(200).json({ success: true });

    } catch (error) {
      console.error('[POST /commands/:requestId/ack] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process ACK'
      });
    }
  }
);

/**
 * POST /api/v1/sync/delta
 * Android requests delta sync for preferences.
 */
router.post(
  '/sync/delta',
  [
    body('device_id').notEmpty(),
    body('last_synced_at').isNumeric(),
    body('pending_tasks').optional().isArray()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
        return;
      }

      const { device_id, last_synced_at, pending_tasks } = req.body;

      // Process pending task ACKs
      if (pending_tasks && pending_tasks.length > 0) {
        console.log(`[SYNC] Processing ${pending_tasks.length} pending task ACKs`);
        // Update audit log in Bitable
      }

      // Fetch delta from Bitable (mock)
      const syncResponse = {
        sync_id: uuidv4(),
        sync_timestamp: Math.floor(Date.now() / 1000),
        commands: [],
        preferences_delta: [],
        full_resync_required: false
      };

      res.status(200).json(syncResponse);

    } catch (error) {
      console.error('[POST /sync/delta] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process delta sync'
      });
    }
  }
);

/**
 * GET /api/v1/sync/full
 * Android requests full resync.
 */
router.get(
  '/sync/full',
  [
    query('device_id').notEmpty()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: errors.array()
        });
        return;
      }

      const { device_id } = req.query;

      // Full sync response (mock)
      const syncResponse = {
        sync_id: uuidv4(),
        sync_timestamp: Math.floor(Date.now() / 1000),
        commands: [],
        preferences_delta: [],
        full_resync_required: false
      };

      res.status(200).json(syncResponse);

    } catch (error) {
      console.error('[GET /sync/full] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process full sync'
      });
    }
  }
);

export default router;
export { pendingCommands };
