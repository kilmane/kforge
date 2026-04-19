// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  // ------------------------
  // OpenAI
  // ------------------------
  openai: [
    {
      id: "gpt-5.4-nano",
      tier: "sandbox",
      note: "Cheapest GPT-5.4-class option; good for lightweight testing.",
    },
    {
      id: "gpt-5.4-mini",
      tier: "main",
      note: "Balanced default for day-to-day dev + general work.",
    },
    {
      id: "gpt-5.4",
      tier: "heavy",
      note: "Highest capability; use sparingly for harder reasoning/coding.",
    },
  ],

  // ------------------------
  // Gemini
  // ------------------------
  gemini: [
    {
      id: "gemini-2.5-flash-lite",
      tier: "sandbox",
      note: "Fast + cheap; good for quick iterations.",
    },
    {
      id: "gemini-2.5-flash",
      tier: "sandbox",
      note: "Fast; solid for routine tasks.",
    },
    {
      id: "gemini-3-flash-preview",
      tier: "main",
      note: "Preview; balanced. Expect occasional changes.",
    },
    {
      id: "gemini-2.5-pro",
      tier: "main",
      note: "Stronger reasoning; good default when Flash isn’t enough.",
    },
    {
      id: "gemini-3.1-pro-preview",
      tier: "heavy",
      note: "High capability; still preview, so expect changes.",
    },
  ],

  // ------------------------
  // Anthropic (Claude)
  // ------------------------
  claude: [
    {
      id: "claude-haiku-4-5",
      tier: "sandbox",
      note: "Cheap + fast; great for small tasks.",
    },
    {
      id: "claude-sonnet-4-6",
      tier: "main",
      note: "Balanced default for dev + writing.",
    },
    {
      id: "claude-opus-4-7",
      tier: "heavy",
      note: "Highest capability; expensive—use sparingly.",
    },
  ],

  // ------------------------
  // DeepSeek (OpenAI-compatible style)
  // ------------------------
  deepseek: [
    {
      id: "deepseek-chat",
      tier: "sandbox",
      note: "Cheap/general chat + coding.",
    },
    {
      id: "deepseek-reasoner",
      tier: "main",
      note: "Stronger reasoning; slower/costlier than chat.",
    },
  ],

  // ------------------------
  // Groq (fast inference; pricing depends on your Groq account)
  // ------------------------
  groq: [
    {
      id: "llama-3.1-8b-instant",
      tier: "sandbox",
      note: "Very fast; great for quick loops.",
    },
    {
      id: "llama-3.3-70b-versatile",
      tier: "main",
      note: "Bigger model; better quality, still fast.",
    },
  ],

  // ------------------------
  // OpenRouter (manual-first; free models rotate/deprecate)
  // ------------------------
  openrouter: [
    {
      id: "openrouter/free",
      tier: "free",
      note: "Free router; selects from currently available free models.",
    },
  ],

  // ------------------------
  // Custom endpoints
  // Suggested IDs (you can add your own)
  // ------------------------
  custom: [
    {
      id: "openrouter/free",
      tier: "free",
      note: "Free route via OpenRouter; availability may change.",
    },
    {
      id: "mistral-small-latest",
      tier: "unknown",
      note: "Endpoint-dependent; often a good low-cost starter.",
    },
    {
      id: "codestral-latest",
      tier: "unknown",
      note: "Endpoint-dependent coding-focused model.",
    },
    {
      id: "deepseek-chat",
      tier: "unknown",
      note: "Endpoint-dependent; paid on DeepSeek API.",
    },
    {
      id: "llama-3.1-8b-instant",
      tier: "unknown",
      note: "Endpoint-dependent; availability varies by host.",
    },
  ],

  // ------------------------
  // Ollama (local or remote)
  // NOTE: Names must match what the user's Ollama has pulled.
  // ------------------------
  ollama: [
    {
      id: "qwen2.5-coder:1.5b",
      tier: "sandbox",
      note: "Local small coder; fast.",
    },
    { id: "mistral:7b", tier: "sandbox", note: "Local 7B; quick general use." },
    {
      id: "llama3.1:8b",
      tier: "main",
      note: "Local default; better quality than tiny models.",
    },
    {
      id: "qwen2.5-coder:7b",
      tier: "main",
      note: "Local coder default; good balance.",
    },
    {
      id: "deepseek-coder:6.7b",
      tier: "main",
      note: "Local coder; solid mid-size.",
    },
    {
      id: "codellama:13b",
      tier: "heavy",
      note: "Bigger local model; slower—use sparingly.",
    },
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
    {
      id: "mistral-small-latest",
      tier: "sandbox",
      note: "Good starter model (general).",
    },
    { id: "codestral-latest", tier: "main", note: "Coding-focused." },
  ],
};
