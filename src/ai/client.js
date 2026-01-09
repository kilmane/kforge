import { invoke } from "@tauri-apps/api/core";

/**
 * Store an API key securely in the OS keyring (per provider).
 */
export async function aiSetApiKey(providerId, apiKey) {
  return invoke("ai_set_api_key", { providerId, apiKey });
}

/**
 * Remove an API key from secure storage.
 */
export async function aiClearApiKey(providerId) {
  return invoke("ai_clear_api_key", { providerId });
}

/**
 * Check whether an API key exists for a provider.
 */
export async function aiHasApiKey(providerId) {
  return invoke("ai_has_api_key", { providerId });
}

/**
 * Generate text via the AI core (Phase 3.1.0).
 * For now this will hit the "mock" provider.
 */
export async function aiGenerate(request) {
  return invoke("ai_generate", { request });
}
