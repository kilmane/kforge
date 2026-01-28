// src-tauri/src/ai/providers/mistral/mod.rs

use crate::ai::{
    error::{AiError, AiErrorKind},
    providers::openai_compat::{OpenAICompatClient, OpenAICompatConfig, ProviderError},
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

use serde_json::{json, Value};

/// First-class Mistral provider.
///
/// Uses the shared OpenAI-compatible client:
/// - Base URL stored WITHOUT `/v1` (client appends `/v1/...`).
/// - Auth: Authorization: Bearer <key> (handled by shared client).
/// - Endpoint: POST {base}/v1/chat/completions
pub struct MistralProvider {
    base_url: String,
}

impl MistralProvider {
    pub fn new() -> Self {
        Self {
            base_url: "https://api.mistral.ai".to_string(),
        }
    }

    fn provider_id(&self) -> &'static str {
        "mistral"
    }

    fn load_api_key(&self) -> Result<String, AiError> {
        match secret_store::get_api_key(self.provider_id())? {
            Some(k) if !k.trim().is_empty() => Ok(k),
            _ => Err(AiError::auth(
                "No Mistral API key set. Use ai_set_api_key with provider 'mistral' first.",
            )),
        }
    }

    fn map_provider_error(&self, err: ProviderError) -> AiError {
        let provider = self.provider_id();

        match err {
            ProviderError::Upstream { status, body } => {
                let msg = if status == 429 {
                    format!(
                        "{body}\n\nHint: Mistral rate limit / free-tier evaluation limit reached. Check your Mistral usage/limits or try again later."
                    )
                } else {
                    body
                };

                if status == 401 || status == 403 {
                    AiError::with_http(provider, AiErrorKind::Auth, status, msg)
                } else if status == 400 {
                    AiError::with_http(provider, AiErrorKind::InvalidRequest, status, msg)
                } else {
                    AiError::with_http(provider, AiErrorKind::Upstream, status, msg)
                }
            }
            other => AiError::new(provider, AiErrorKind::Unknown, other.to_string()),
        }
    }

    fn extract_output_text(v: &Value) -> String {
        v.pointer("/choices/0/message/content")
            .and_then(|x| x.as_str())
            .unwrap_or_default()
            .to_string()
    }

    fn extract_usage(v: &Value) -> Option<AiUsage> {
        let prompt = v
            .pointer("/usage/prompt_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);

        let completion = v
            .pointer("/usage/completion_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);

        let total = v
            .pointer("/usage/total_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);

        if prompt.is_none() && completion.is_none() && total.is_none() {
            None
        } else {
            Some(AiUsage {
                input_tokens: prompt,
                output_tokens: completion,
                total_tokens: total,
            })
        }
    }
}

impl super::AiProvider for MistralProvider {
    fn id(&self) -> &'static str {
        "mistral"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let api_key = self.load_api_key()?;
        let base_url = self.base_url.clone();

        let mut messages: Vec<Value> = Vec::new();

        if let Some(sys) = req.system.as_ref().filter(|s| !s.trim().is_empty()) {
            messages.push(json!({ "role": "system", "content": sys }));
        }

        messages.push(json!({ "role": "user", "content": req.input }));

        let mut body = json!({
          "model": req.model,
          "messages": messages,
          "stream": false
        });

        if let Some(t) = req.temperature {
            body["temperature"] = json!(t);
        }

        if let Some(m) = req.max_output_tokens {
            body["max_tokens"] = json!(m);
        }

        let cfg = OpenAICompatConfig {
            base_url,
            api_key,
            default_model: None,
            extra_headers: Vec::new(),
            timeout_secs: 60,
        };

        let client = OpenAICompatClient::new(&cfg).map_err(|e| self.map_provider_error(e))?;

        let v = client
            .post_chat_completions(&body)
            .map_err(|e| self.map_provider_error(e))?;

        let id = v
            .get("id")
            .and_then(|x| x.as_str())
            .unwrap_or("unknown")
            .to_string();

        let model = v
            .get("model")
            .and_then(|x| x.as_str())
            .unwrap_or_else(|| req.model.as_str())
            .to_string();

        let output_text = Self::extract_output_text(&v);
        let usage = Self::extract_usage(&v);

        Ok(AiResponse {
            id,
            provider_id: self.provider_id().to_string(),
            model,
            output_text,
            usage,
        })
    }
}
