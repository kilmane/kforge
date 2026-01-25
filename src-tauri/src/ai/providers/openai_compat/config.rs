// src-tauri/src/ai/providers/openai_compat/config.rs

#[derive(Clone, Debug)]
pub struct OpenAICompatConfig {
    /// Base without trailing slash, and WITHOUT the /v1 suffix.
    ///
    /// Examples:
    /// - DeepSeek:   https://api.deepseek.com
    /// - Groq:       https://api.groq.com/openai
    /// - OpenRouter: https://openrouter.ai/api
    pub base_url: String,

    /// Provider API key (Bearer by default).
    pub api_key: String,

    /// Optional default model for the wrapper to use.
    pub default_model: Option<String>,

    /// Extra headers (e.g. OpenRouter: HTTP-Referer, X-Title)
    pub extra_headers: Vec<(String, String)>,

    /// Sync HTTP timeout.
    pub timeout_secs: u64,
}

impl OpenAICompatConfig {
    pub fn normalized_base_url(&self) -> String {
        self.base_url.trim_end_matches('/').to_string()
    }
}
