import Anthropic from "@anthropic-ai/sdk";

/**
 * Returns a configured Anthropic client.
 *
 * Prefers Replit's AI Integrations proxy (auto-provisioned, billed to Replit credits)
 * when AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY are set.
 *
 * Falls back to direct Anthropic API with ANTHROPIC_API_KEY if the user provided one.
 *
 * Returns null if neither is configured.
 */
export function createAnthropicClient(): Anthropic | null {
  const proxyUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const proxyKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (proxyUrl && proxyKey) {
    return new Anthropic({ apiKey: proxyKey, baseURL: proxyUrl });
  }
  const directKey = process.env.ANTHROPIC_API_KEY;
  if (directKey) {
    return new Anthropic({ apiKey: directKey });
  }
  return null;
}
