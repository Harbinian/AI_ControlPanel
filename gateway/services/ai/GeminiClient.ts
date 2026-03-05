/**
 * GeminiClient - Level 2 Model Client
 * Deep logic, high-stakes auditing, and multi-modal fallback
 */

import { OpenClawEnvelope } from '../../types/openclaw_types';

export interface GeminiRequest {
  message: string;
  images?: string[];
  context?: string;
}

export interface GeminiResponse {
  content: string;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private endpoint: string;
  private model: string = 'gemini-2.0-flash';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.endpoint = process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Generate response from Gemini
   * Used for complex reasoning, high-stakes, and fallback scenarios
   */
  async generate(request: GeminiRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log(`[Gemini] Generating response for: "${request.message.substring(0, 30)}..."`);

    try {
      // Build content parts
      const parts: any[] = [];

      if (request.context) {
        parts.push({ text: request.context });
      }

      parts.push({ text: request.message });

      // Add images if provided
      if (request.images?.length) {
        for (const img of request.images) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: this.isBase64(img) ? img : await this.urlToBase64(img)
            }
          });
        }
      }

      const response = await fetch(
        `${this.endpoint}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts
            }],
            generationConfig: {
              temperature: 0.2, // Lower temperature for structured output
              maxOutputTokens: 2048,
              responseMimeType: 'text/plain'
            },
            systemInstruction: {
              parts: [{
                text: `You are a Family Guardian AI performing deep reasoning.

Output ONLY valid JSON matching the OpenClaw protocol. No markdown, no explanations.

Required JSON structure:
{
  "claw_version": "1.0",
  "request_id": "<uuid>",
  "timestamp": <unix>,
  "source": "feishu_gateway",
  "target_device": "<device>",
  "action": "<ACTION>",
  "payload": {}
}

Valid actions: RECORD_PREFERENCE, EXECUTE_ACTION, QUERY_PREFERENCE, SYNC_DELTA, CLARIFY`
              }]
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('Gemini returned empty response');
      }

      // Clean up potential markdown wrapper
      const cleaned = this.cleanMarkdownWrapper(content);

      console.log(`[Gemini] Response received, length: ${cleaned.length}`);
      return cleaned;

    } catch (error: any) {
      console.error('[Gemini] Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse Gemini response to OpenClawEnvelope
   */
  parseResponse(rawResponse: string): OpenClawEnvelope {
    try {
      const cleaned = this.cleanMarkdownWrapper(rawResponse);
      const parsed = JSON.parse(cleaned);

      if (!parsed.action) {
        throw new Error('Missing required field: action');
      }

      return parsed as OpenClawEnvelope;
    } catch (error: any) {
      console.error('[Gemini] Failed to parse response:', error.message);
      throw new Error(`Invalid OpenClaw format: ${error.message}`);
    }
  }

  /**
   * Remove markdown code block wrapper if present
   */
  private cleanMarkdownWrapper(content: string): string {
    // Remove ```json or ``` wrapper
    let cleaned = content.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return cleaned.trim();
  }

  /**
   * Check if string is base64
   */
  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Convert URL to base64 (placeholder - implement with proper fetch)
   */
  private async urlToBase64(url: string): Promise<string> {
    // TODO: Implement proper URL to base64 conversion
    // For now, assume it's already base64 or a data URL
    return url;
  }
}

export default GeminiClient;
