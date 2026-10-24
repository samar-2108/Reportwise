import { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { MockLLMProvider } from "./mock";
import { getServerEnv } from "@/lib/env";

export * from "./types";

let providerInstance: LLMProvider | null = null;

/**
 * Returns the configured LLMProvider instance based on the LLM_PROVIDER env variable.
 * Default: GeminiProvider. Can also be set to 'mock' for tests and zero-API operation.
 */
export function getLLMProvider(): LLMProvider {
  if (providerInstance) return providerInstance;

  const env = getServerEnv();
  const providerType = env.LLM_PROVIDER;

  switch (providerType) {
    case "mock":
      providerInstance = new MockLLMProvider();
      break;
    case "gemini":
    default:
      providerInstance = new GeminiProvider();
      break;
  }

  return providerInstance;
}

/**
 * For testing purposes: allows overriding the provider instance
 */
export function setLLMProvider(provider: LLMProvider | null): void {
  providerInstance = provider;
}

