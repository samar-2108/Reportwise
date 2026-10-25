import { z } from "zod";

export interface LLMFile {
  mimeType: string;
  data: Buffer;
}

/**
 * Custom error thrown when the free tier or daily rate limits/quotas are exhausted.
 */
export class QuotaExceededError extends Error {
  public readonly code = "QUOTA_EXCEEDED";

  constructor(
    message = "Our free daily analysis limit has been reached. Please try again later."
  ) {
    super(message);
    this.name = "QuotaExceededError";
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

export interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Universal LLM Provider interface allowing provider interchangeability (Gemini, Mock, etc.)
 */
export interface LLMProvider {
  /**
   * Pass 1: Vision-based extraction from uploaded documents/photos
   */
  extractFromFiles(files: LLMFile[], systemPrompt: string): Promise<unknown>;

  /**
   * Pass 2: Structured interpretation guided by Zod schema
   */
  generateStructured<T>(
    input: unknown,
    systemPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T>;

  /**
   * Chat: Conversational response generation with system instructions and history
   */
  generateChatResponse(
    messages: ChatMessageInput[],
    systemPrompt: string
  ): Promise<string>;
}

