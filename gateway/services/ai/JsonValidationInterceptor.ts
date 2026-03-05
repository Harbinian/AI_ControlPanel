/**
 * JsonValidationInterceptor
 * Validates AI model responses to ensure they conform to OpenClaw protocol
 * Throws specific exceptions that trigger L2 fallback
 */

export class JsonValidationError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly parseError?: Error
  ) {
    super(message);
    this.name = 'JsonValidationError';
  }
}

export class OpenClawValidationError extends JsonValidationError {
  constructor(
    message: string,
    rawResponse: string,
    public readonly missingFields: string[]
  ) {
    super(message, rawResponse);
    this.name = 'OpenClawValidationError';
  }
}

export class JsonValidationInterceptor {
  private requiredFields: string[] = [
    'claw_version',
    'request_id',
    'timestamp',
    'source',
    'target_device',
    'action',
    'payload'
  ];

  /**
   * Validate and parse AI response as OpenClawEnvelope
   * @throws JsonValidationError - If JSON is invalid
   * @throws OpenClawValidationError - If required fields are missing
   */
  validate(rawResponse: string): unknown {
    console.log(`[Validator] Validating response, length: ${rawResponse.length}`);

    // Step 1: Clean markdown wrapper if present
    const cleaned = this.cleanMarkdown(rawResponse);

    // Step 2: Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error: any) {
      console.error('[Validator] JSON parse failed:', error.message);
      throw new JsonValidationError(
        `Invalid JSON: ${error.message}`,
        rawResponse,
        error
      );
    }

    // Step 3: Validate OpenClaw required fields
    const missingFields = this.validateRequiredFields(parsed);
    if (missingFields.length > 0) {
      console.error('[Validator] Missing fields:', missingFields);
      throw new OpenClawValidationError(
        `Missing required OpenClaw fields: ${missingFields.join(', ')}`,
        rawResponse,
        missingFields
      );
    }

    // Step 4: Validate field types
    this.validateFieldTypes(parsed);

    // Step 5: Validate action enum
    this.validateAction(parsed.action);

    console.log('[Validator] Validation passed');
    return parsed;
  }

  /**
   * Remove markdown code block wrapper
   */
  private cleanMarkdown(response: string): string {
    let cleaned = response.trim();

    // Remove ```json or ``` prefix
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    // Remove ``` suffix
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return cleaned.trim();
  }

  /**
   * Check for required OpenClaw fields
   */
  private validateRequiredFields(parsed: any): string[] {
    const missing: string[] = [];

    for (const field of this.requiredFields) {
      if (!(field in parsed) || parsed[field] === undefined || parsed[field] === null) {
        missing.push(field);
      }
    }

    return missing;
  }

  /**
   * Validate field types
   */
  private validateFieldTypes(parsed: any): void {
    // claw_version must be string
    if (typeof parsed.claw_version !== 'string') {
      throw new OpenClawValidationError(
        'claw_version must be a string',
        JSON.stringify(parsed),
        ['claw_version']
      );
    }

    // request_id must be string (UUID format)
    if (typeof parsed.request_id !== 'string') {
      throw new OpenClawValidationError(
        'request_id must be a string',
        JSON.stringify(parsed),
        ['request_id']
      );
    }

    // timestamp must be number
    if (typeof parsed.timestamp !== 'number') {
      throw new OpenClawValidationError(
        'timestamp must be a number',
        JSON.stringify(parsed),
        ['timestamp']
      );
    }

    // action must be string
    if (typeof parsed.action !== 'string') {
      throw new OpenClawValidationError(
        'action must be a string',
        JSON.stringify(parsed),
        ['action']
      );
    }

    // payload must be object
    if (typeof parsed.payload !== 'object' || Array.isArray(parsed.payload)) {
      throw new OpenClawValidationError(
        'payload must be an object',
        JSON.stringify(parsed),
        ['payload']
      );
    }
  }

  /**
   * Validate action is a known intent
   */
  private validateAction(action: string): void {
    const validActions = [
      'RECORD_PREFERENCE',
      'EXECUTE_ACTION',
      'QUERY_PREFERENCE',
      'SYNC_DELTA',
      'CLARIFY'
    ];

    if (!validActions.includes(action)) {
      console.warn(`[Validator] Unknown action: ${action}, allowing but flagging`);
      // Don't throw - allow unknown actions but log warning
    }
  }

  /**
   * Check if error should trigger L2 fallback
   */
  static shouldFallback(error: any): boolean {
    if (error instanceof JsonValidationError) {
      return true; // Invalid JSON -> fallback
    }

    if (error instanceof OpenClawValidationError) {
      return true; // Missing required fields -> fallback
    }

    // Check error message patterns
    const fallbackPatterns = [
      'JSON',
      'parse',
      'Invalid',
      'Missing',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'confidence',
      '< 0.8'
    ];

    const errorMsg = error?.message || '';
    return fallbackPatterns.some(p => errorMsg.toLowerCase().includes(p.toLowerCase()));
  }
}

export default JsonValidationInterceptor;
