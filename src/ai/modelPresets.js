// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  openai: ["gpt-4o-mini", "gpt-4o"],

  gemini: [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview"
  ],

  claude: ["claude-3-5-sonnet", "claude-3-5-haiku"],

  deepseek: ["deepseek-chat"],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],

  // Kept as suggestions only; UX treats OpenRouter as manual entry.
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],

  huggingface: [],
  custom: [],

  ollama: ["llama3.1", "llama3", "mistral", "qwen2.5"],
  lmstudio: [],
  mock: ["mock-1"]
};
