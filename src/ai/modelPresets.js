
// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  openai: [
    "gpt-5-mini",     // 🟢 Cheap / Test
    "gpt-4.1-mini"   // 🟠 Main
  ],

  gemini: [
    "gemini-2.5-flash-lite",   // 🟢 Sandbox
    "gemini-2.5-flash",        // 🟢 Sandbox
    "gemini-3-flash-preview",  // 🟠 Main
    "gemini-2.5-pro",          // 🟠 Main
    "gemini-3-pro-preview"     // 🔴 Heavy
  ],

 claude: [
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-opus-4-5"
],


deepseek: [
  "deepseek-chat",      // 🟢 Sandbox
  "deepseek-reasoner"   // 🟠 Main
],

  
  groq: [
  "llama-3.1-8b-instant",     // 🟢 Sandbox
  "llama-3.3-70b-versatile"  // 🟠 Main
],


  // Suggestions only; OpenRouter is manual-first
openrouter: [
  "mistralai/devstral-2512:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "xiaomi/mimo-v2-flash:free"
],


  huggingface: [],
  custom: [],

  ollama: ["llama3.1", "llama3", "mistral", "qwen2.5"],
  lmstudio: [],
  mock: ["mock-1"]
};
