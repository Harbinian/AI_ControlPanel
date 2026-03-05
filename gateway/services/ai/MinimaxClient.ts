/**
 * MinimaxClient - Level 1 Model Client
 * Primary edge/daily engine for fast NLP and entity extraction
 */

import { OpenClawEnvelope } from '../../types/openclaw_types';

export interface MinimaxRequest {
  message: string;
  images?: string[];
  systemPrompt: string;
}

export interface MinimaxResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class MinimaxClient {
  private apiKey: string;
  private endpoint: string;
  private model: string = 'abab6.5s-chat';

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.endpoint = process.env.MINIMAX_ENDPOINT || 'https://api.minimax.chat/v1';
  }

  /**
   * Generate response from Minimax
   * CRITICAL: Must enforce JSON output via system prompt
   */
  async generate(request: MinimaxRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('MINIMAX_API_KEY not configured');
    }

    console.log(`[Minimax] Generating response for: "${request.message.substring(0, 30)}..."`);

    try {
      const response = await fetch(`${this.endpoint}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt
            },
            {
              role: 'user',
              content: request.images?.length
                ? [
                    { type: 'text', text: request.message },
                    ...request.images.map(img => ({ type: 'image_url', image_url: { url: img } }))
                  ]
                : request.message
            }
          ],
          temperature: 0.3, // Low temperature for deterministic JSON output
          response_format: { type: 'text' } // Enforce text, not JSON object
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Minimax API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json() as MinimaxResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Minimax returned empty response');
      }

      console.log(`[Minimax] Response received, length: ${content.length}`);
      return content;

    } catch (error: any) {
      console.error('[Minimax] Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract structured OpenClawEnvelope from Minimax response
   * This is called after JSON parsing succeeds
   */
  parseResponse(rawResponse: string): OpenClawEnvelope {
    try {
      const parsed = JSON.parse(rawResponse);

      // Validate required fields
      if (!parsed.action) {
        throw new Error('Missing required field: action');
      }

      return parsed as OpenClawEnvelope;
    } catch (error: any) {
      console.error('[Minimax] Failed to parse response:', error.message);
      throw new Error(`Invalid OpenClaw format: ${error.message}`);
    }
  }
}

export default MinimaxClient;
