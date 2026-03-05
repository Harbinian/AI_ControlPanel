/**
 * RouterService - Dual-Core Model Routing Engine
 * Implements L1 (Minimax) -> L2 (Gemini) fallback logic
 */

import { MinimaxClient } from './MinimaxClient';
import { GeminiClient } from './GeminiClient';
import { JsonValidationInterceptor } from './JsonValidationInterceptor';
import { OpenClawEnvelope } from '../types/openclaw_types';

export enum ModelLevel {
  L1 = 'minimax',
  L2 = 'gemini'
}

export interface RoutingContext {
  userMessage: string;
  images?: string[]; // Base64 or URLs
  memberId?: number;
  highStakes?: boolean;
  explicitDoubt?: boolean;
}

export interface RoutingResult {
  success: boolean;
  model: ModelLevel;
  response?: OpenClawEnvelope;
  error?: string;
  retryCount: number;
}

export class FallbackException extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly attemptCount: number
  ) {
    super(message);
    this.name = 'FallbackException';
  }
}

export class RouterService {
  private minimaxClient: MinimaxClient;
  private geminiClient: GeminiClient;
  private jsonValidator: JsonValidationInterceptor;
  private maxRetries: number = 1; // Retry once before fallback

  constructor() {
    this.minimaxClient = new MinimaxClient();
    this.geminiClient = new GeminiClient();
    this.jsonValidator = new JsonValidationInterceptor();
  }

  /**
   * Core routing logic: L1 Minimax -> L2 Gemini fallback
   */
  async route(context: RoutingContext): Promise<RoutingResult> {
    console.log(`[Router] Starting route for message: "${context.userMessage.substring(0, 50)}..."`);

    // Check for high-stakes conditions that require L2 directly
    if (this.shouldUseL2Directly(context)) {
      console.log('[Router] High-stakes detected, routing directly to L2 (Gemini)');
      return this.routeToGemini(context);
    }

    // Try L1 (Minimax) first
    try {
      const result = await this.routeToMinimax(context);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('[Router] L1 failed with exception:', error);
    }

    // Fallback to L2 (Gemini)
    console.log('[Router] L1 failed or confidence < 0.8, falling back to L2');
    return this.routeToGemini(context);
  }

  /**
   * Route to L1 (Minimax) with retry and validation
   */
  private async routeToMinimax(context: RoutingContext): Promise<RoutingResult> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[Router] Attempting L1 (Minimax), attempt ${attempt + 1}`);

        const response = await this.minimaxClient.generate({
          message: context.userMessage,
          images: context.images,
          systemPrompt: this.buildSystemPrompt(context)
        });

        // Validate JSON response
        const validated = this.jsonValidator.validate(response);

        return {
          success: true,
          model: ModelLevel.L1,
          response: validated as OpenClawEnvelope,
          retryCount: attempt
        };
      } catch (error: any) {
        console.error(`[Router] L1 attempt ${attempt + 1} failed:`, error.message);

        // Check if we should retry or fallback
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          console.log('[Router] Retryable error, will retry L1');
          continue;
        }

        // Throw fallback exception to trigger L2
        throw new FallbackException(
          'L1 failed after retries',
          error,
          attempt + 1
        );
      }
    }

    // Should not reach here
    throw new FallbackException('L1 exhausted', new Error('Max retries exceeded'), this.maxRetries + 1);
  }

  /**
   * Route to L2 (Gemini)
   */
  private async routeToGemini(context: RoutingContext): Promise<RoutingResult> {
    try {
      console.log('[Router] Routing to L2 (Gemini)');

      const response = await this.geminiClient.generate({
        message: context.userMessage,
        images: context.images,
        context: this.buildGeminiContext(context)
      });

      // Gemini should return valid JSON
      const validated = this.jsonValidator.validate(response);

      return {
        success: true,
        model: ModelLevel.L2,
        response: validated as OpenClawEnvelope,
        retryCount: 0
      };
    } catch (error: any) {
      console.error('[Router] L2 (Gemini) failed:', error.message);
      return {
        success: false,
        model: ModelLevel.L2,
        error: error.message,
        retryCount: 0
      };
    }
  }

  /**
   * Determine if we should skip L1 and use L2 directly
   */
  private shouldUseL2Directly(context: RoutingContext): boolean {
    // High-stakes: modifying Family_Members table or deleting data
    if (context.highStakes) {
      return true;
    }

    // Explicit user doubt in message
    const doubtKeywords = ['不对', '确定吗', '重新看', 'wrong', 'are you sure', 'look again'];
    const messageLower = context.userMessage.toLowerCase();
    if (doubtKeywords.some(kw => messageLower.includes(kw))) {
      context.explicitDoubt = true;
      return true;
    }

    return false;
  }

  /**
   * Build system prompt for Minimax to enforce OpenClaw format
   */
  private buildSystemPrompt(context: RoutingContext): string {
    return `You are a Family Guardian AI assistant. Your task is to analyze user input and output a STRICT JSON object that follows the OpenClaw protocol.

IMPORTANT: Output ONLY valid JSON. No markdown wrapping, no conversational filler, no explanations.

The JSON must follow this exact structure:
{
  "claw_version": "1.0",
  "request_id": "<uuid-v4>",
  "timestamp": <unix-timestamp>,
  "source": "feishu_gateway",
  "target_device": "<device-id>",
  "action": "<INTENT_NAME>",
  "payload": { <key-value-pairs> }
}

Valid actions:
- RECORD_PREFERENCE: Record a family member's preference
- EXECUTE_ACTION: Execute a device action
- QUERY_PREFERENCE: Query preference history
- SYNC_DELTA: Request preference sync

If you cannot determine the action, output:
{
  "action": "CLARIFY",
  "payload": { "question": "<clarifying question>" }
}

Context: ${context.memberId ? `Target member ID: ${context.memberId}` : 'No specific member'}`;
  }

  /**
   * Build context for Gemini (includes more context for deep reasoning)
   */
  private buildGeminiContext(context: RoutingContext): string {
    return `You are performing deep reasoning for the Family Guardian system.

The user message requires careful analysis. Previous AI processing failed or returned low confidence.

User message: ${context.userMessage}
${context.images ? `Images provided: ${context.images.length}` : ''}
${context.memberId ? `Target member: ${context.memberId}` : ''}
${context.explicitDoubt ? 'User has explicitly expressed doubt about previous response.' : ''}

Output a valid OpenClaw JSON envelope. Be thorough in your reasoning.`;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof FallbackException) {
      return false; // Already handled by fallback logic
    }

    // Retry on network errors, JSON parse errors, timeout
    const retryablePatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'timeout',
      'network',
      'JSON',
      'parse'
    ];

    const errorMsg = error.message || '';
    return retryablePatterns.some(p => errorMsg.toLowerCase().includes(p.toLowerCase()));
  }
}

export default RouterService;
