// src/ai/modelPresets.js
// Suggestions only. Users can always type exact model IDs manually.

export const MODEL_PRESETS = {
  // ------------------------
  // OpenAI
  // ------------------------
  openai: [
    {
      id: "gpt-5.6-luna",
      tier: "sandbox",
      note: "Cost-sensitive GPT-5.6 option for guarded quick checks.",
    },
    {
      id: "gpt-5.6-terra",
      tier: "main",
      note: "Balanced GPT-5.6 default for day-to-day dev + general work.",
    },
    {
      id: "gpt-5.6-sol",
      tier: "heavy",
      note: "Frontier GPT-5.6 option for complex professional and coding work.",
    },
  ],

  // ------------------------
  // Gemini
  // ------------------------
  gemini: [
    {
      id: "gemini-3.5-flash-lite",
      tier: "sandbox",
      note: "Current low-latency option for quick guarded iterations.",
    },
    {
      id: "gemini-3.6-flash",
      tier: "main",
      note: "Current stable Flash model for coding and agentic execution.",
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
      note: "Fast lightweight option for small guarded tasks.",
    },
    {
      id: "claude-sonnet-5",
      tier: "main",
      note: "Current balanced option for speed, intelligence, dev, and writing.",
    },
    {
      id: "claude-opus-4-8",
      tier: "heavy",
      note: "High capability option for complex agentic coding and enterprise work.",
    },
    {
      id: "claude-fable-5",
      tier: "heavy",
      note: "Anthropic's highest-capability widely available model.",
    },
  ],

  // ------------------------
  // DeepSeek (OpenAI-compatible style)
  // ------------------------
  deepseek: [
    {
      id: "deepseek-v4-flash",
      tier: "sandbox",
      note: "Fast DeepSeek V4 option for general chat + coding.",
    },
    {
      id: "deepseek-v4-pro",
      tier: "main",
      note: "Stronger DeepSeek V4 option for reasoning and agentic work.",
    },
  ],

  // ------------------------
  // Groq (fast inference; pricing depends on your Groq account)
  // ------------------------
  groq: [
    {
      id: "openai/gpt-oss-20b",
      tier: "sandbox",
      note: "Fast lower-cost Groq production option for quick loops.",
    },
    {
      id: "openai/gpt-oss-120b",
      tier: "main",
      note: "Larger Groq production option for stronger reasoning and coding.",
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
      note: "Endpoint-dependent; starter suitability depends on the host.",
    },
    {
      id: "devstral-small-latest",
      tier: "unknown",
      note: "Endpoint-dependent agentic coding model.",
    },
    {
      id: "deepseek-v4-flash",
      tier: "unknown",
      note: "Endpoint-dependent; paid on DeepSeek API.",
    },
    {
      id: "openai/gpt-oss-20b",
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
    {
      id: "qwen2.5-coder:7b",
      tier: "main",
      note: "Local coder default; good balance.",
    },
    {
      id: "devstral-small-2",
      tier: "main",
      note: "Current agentic coding model; requires Ollama 0.13.3 or later.",
    },
    {
      id: "gpt-oss:20b",
      tier: "heavy",
      note: "Powerful local reasoning and agentic model; requires substantial memory.",
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
    {
      id: "devstral-small-latest",
      tier: "main",
      note: "Agentic coding-focused model.",
    },
  ],
};
