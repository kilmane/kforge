// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  // ------------------------
  // OpenAI
  // ------------------------
  openai: [
    "gpt-5-mini",   // 🟢 Sandbox (cheap/test)
    "gpt-4.1-mini"  // 🟠 Main
  ],

  // ------------------------
  // Gemini
  // ------------------------
  gemini: [
    "gemini-2.5-flash-lite",  // 🟢 Sandbox
    "gemini-2.5-flash",       // 🟢 Sandbox
    "gemini-3-flash-preview", // 🟠 Main
    "gemini-2.5-pro",         // 🟠 Main
    "gemini-3-pro-preview"    // 🔴 Heavy
  ],

  // ------------------------
  // Anthropic (Claude)
  // ------------------------
  claude: [
    "claude-haiku-4-5",  // 🟢 Sandbox
    "claude-sonnet-4-5", // 🟠 Main
    "claude-opus-4-5"    // 🔴 Heavy
  ],

  // ------------------------
  // DeepSeek (OpenAI-compatible style)
  // ------------------------
  deepseek: [
    "deepseek-chat",     // 🟢 Sandbox
    "deepseek-reasoner"  // 🟠 Main
  ],

  // ------------------------
  // Groq (fast inference; pricing depends on your Groq account)
  // ------------------------
  groq: [
    "llama-3.1-8b-instant",    // 🟢 Sandbox
    "llama-3.3-70b-versatile"  // 🟠 Main
  ],

  // ------------------------
  // OpenRouter (manual-first; free models rotate/deprecate)
  // ------------------------
  openrouter: [
    "mistralai/devstral-2512:free",
    "qwen/qwen3-coder:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "xiaomi/mimo-v2-flash:free"
  ],

  // ------------------------
  // Hugging Face
  // NOTE: IDs are stable; availability depends on your HF endpoint/provider.
  // ------------------------
  huggingface: [
    "Qwen/Qwen2.5-Coder-1.5B-Instruct",           // 🟢 Sandbox
    "Qwen/Qwen2.5-Coder-7B-Instruct",             // 🟠 Main
    "deepseek-ai/deepseek-coder-6.7b-instruct",   // 🟠 Main
    "codellama/CodeLlama-7b-Instruct-hf",         // 🟠 Main
    "bigcode/starcoder2-15b-instruct-v0.1"        // 🔴 Heavy
  ],

  // ------------------------
  // Custom endpoints
  // Unknown model IDs → leave empty
  // ------------------------
  custom: [],

  // ------------------------
  // Ollama (local or remote)
  // NOTE: Names must match what the user's Ollama has pulled.
  // ------------------------
  ollama: [
    "qwen2.5-coder:1.5b",   // 🟢 Sandbox
    "mistral:7b",           // 🟢 Sandbox
    "llama3.1:8b",          // 🟠 Main
    "qwen2.5-coder:7b",     // 🟠 Main
    "deepseek-coder:6.7b",  // 🟠 Main
    "codellama:13b"         // 🔴 Heavy
  ],

  // ------------------------
  // LM Studio
  // Keep empty until we add “List models” from /v1/models into “My models”
  // ------------------------
  lmstudio: [],

  // ------------------------
  // Mock
  // ------------------------
  mock: ["mock-1"]
};
