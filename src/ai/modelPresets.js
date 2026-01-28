// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  // ------------------------
  // OpenAI
  // ------------------------
  openai: [
    { id: "gpt-5-mini", tier: "sandbox", note: "Cheap paid; safe for testing/spam." },
    { id: "gpt-4.1-mini", tier: "main", note: "Balanced default for day-to-day dev." }
  ],

  // ------------------------
  // Gemini
  // ------------------------
  gemini: [
    { id: "gemini-2.5-flash-lite", tier: "sandbox", note: "Fast + cheap; good for quick iterations." },
    { id: "gemini-2.5-flash", tier: "sandbox", note: "Fast; solid for routine tasks." },
    { id: "gemini-3-flash-preview", tier: "main", note: "Preview; balanced. Expect occasional changes." },
    { id: "gemini-2.5-pro", tier: "main", note: "Stronger reasoning; good default when Flash isn’t enough." },
    { id: "gemini-3-pro-preview", tier: "heavy", note: "Preview + high capability; use sparingly." }
  ],

  // ------------------------
  // Anthropic (Claude)
  // ------------------------
  claude: [
    { id: "claude-haiku-4-5", tier: "sandbox", note: "Cheap + fast; great for small tasks." },
    { id: "claude-sonnet-4-5", tier: "main", note: "Balanced default for dev + writing." },
    { id: "claude-opus-4-5", tier: "heavy", note: "Highest capability; expensive—use sparingly." }
  ],

  // ------------------------
  // DeepSeek (OpenAI-compatible style)
  // ------------------------
  deepseek: [
    { id: "deepseek-chat", tier: "sandbox", note: "Cheap/general chat + coding." },
    { id: "deepseek-reasoner", tier: "main", note: "Stronger reasoning; slower/costlier than chat." }
  ],

  // ------------------------
  // Groq (fast inference; pricing depends on your Groq account)
  // ------------------------
  groq: [
    { id: "llama-3.1-8b-instant", tier: "sandbox", note: "Very fast; great for quick loops." },
    { id: "llama-3.3-70b-versatile", tier: "main", note: "Bigger model; better quality, still fast." }
  ],

  // ------------------------
  // OpenRouter (manual-first; free models rotate/deprecate)
  // ------------------------
  openrouter: [
    { id: "mistralai/devstral-2512:free", tier: "free", note: "Free via OpenRouter; can rotate/deprecate." },
    { id: "qwen/qwen3-coder:free", tier: "free", note: "Free coder model; availability may change." },
    { id: "meta-llama/llama-3.3-70b-instruct:free", tier: "free", note: "Free 70B; may be rate-limited/rotating." },
    { id: "xiaomi/mimo-v2-flash:free", tier: "free", note: "Free; fast-ish. Availability may change." }
  ],

  // ------------------------
  // Hugging Face
  // NOTE: IDs are stable; availability depends on your HF endpoint/provider.
  // ------------------------
  huggingface: [
    { id: "Qwen/Qwen2.5-Coder-1.5B-Instruct", tier: "sandbox", note: "Small + cheap; good for quick code tasks." },
    { id: "Qwen/Qwen2.5-Coder-7B-Instruct", tier: "main", note: "Solid default coder size." },
    { id: "deepseek-ai/deepseek-coder-6.7b-instruct", tier: "main", note: "Good coding quality; mid-size." },
    { id: "codellama/CodeLlama-7b-Instruct-hf", tier: "main", note: "Classic 7B coder; decent baseline." },
    { id: "bigcode/starcoder2-15b-instruct-v0.1", tier: "heavy", note: "Larger; slower/costlier—use sparingly." }
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
    { id: "qwen2.5-coder:1.5b", tier: "sandbox", note: "Local small coder; fast." },
    { id: "mistral:7b", tier: "sandbox", note: "Local 7B; quick general use." },
    { id: "llama3.1:8b", tier: "main", note: "Local default; better quality than tiny models." },
    { id: "qwen2.5-coder:7b", tier: "main", note: "Local coder default; good balance." },
    { id: "deepseek-coder:6.7b", tier: "main", note: "Local coder; solid mid-size." },
    { id: "codellama:13b", tier: "heavy", note: "Bigger local model; slower—use sparingly." }
  ],

  // ------------------------
  // LM Studio
  // Keep empty until we add “List models” from /v1/models into “My models”
  // ------------------------
  lmstudio: [],

  // ------------------------
  // Mock
  // ------------------------
  mock: [{ id: "mock-1", tier: "unknown", note: "Mock provider model." }],

  // ------------------------
  // Mistral (API)
  // ------------------------
  mistral: [
    { id: "mistral-small-latest", tier: "sandbox", note: "Good starter model (general)" },
    { id: "codestral-latest", tier: "main", note: "Coding-focused" }
  ],

};
