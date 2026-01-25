// src-tauri/src/ai/providers/deepseek/mod.rs

use crate::ai::{
    error::{AiError, AiErrorKind},
    providers::openai_compat::{OpenAICompatClient, OpenAICompatConfig, ProviderError},
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

use serde_json::{json, Map, Value};

/// DeepSeek provider (OpenAI-compatible Chat Completions).
///
/// Phase 3.2.x:
/// - Thin adapter over `openai_compat`.
/// - Builds request JSON, calls shared client, maps response/errors to `AiResponse`/`AiError`.
pub struct DeepSeekProvider {
    base_url: String,
}

impl DeepSeekProvider {
    pub fn new() -> Self {
        // NOTE: OpenAICompatClient appends `/v1/...`, so this must be the base WITHOUT `/v1`.
        Self {
            base_url: "https://api.deepseek.com".to_string(),
        }
    }

    fn provider_id(&self) -> &'static str {
        "deepseek"
    }

    /// OpenAICompatConfig expects base_url WITHOUT `/v1`.
    /// Users may pass either form via `req.endpoint`; normalize defensively.
    fn normalize_base_url_for_compat(url: &str) -> String {
        let mut s = url.trim_end_matches('/').to_string();

        // Strip a trailing `/v1` if present.
        if let Some(stripped) = s.strip_suffix("/v1") {
            s = stripped.to_string();
        }

        s.trim_end_matches('/').to_string()
    }

    fn resolve_base_url(&self, req: &AiRequest) -> String {
        let raw = req
            .endpoint
            .clone()
            .unwrap_or_else(|| self.base_url.clone());
        Self::normalize_base_url_for_compat(&raw)
    }

    fn load_api_key(&self) -> Result<String, AiError> {
        match secret_store::get_api_key(self.provider_id())? {
            Some(k) if !k.trim().is_empty() => Ok(k),
            _ => Err(AiError::auth(
                "No DeepSeek API key set. Use ai_set_api_key first.",
            )),
        }
    }

    fn extract_error_message(body: &str) -> String {
        // Try OpenAI-style error envelope: { "error": { "message": "..." } }
        if let Ok(v) = serde_json::from_str::<Value>(body) {
            if let Some(msg) = v
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
            {
                return msg.to_string();
            }
        }
        body.to_string()
    }

    fn map_upstream_status_to_kind(status: u16) -> AiErrorKind {
        match status {
            400 => AiErrorKind::BadRequest,
            401 | 403 => AiErrorKind::Auth,
            408 | 504 => AiErrorKind::Network,
            429 => AiErrorKind::RateLimited,
            500..=599 => AiErrorKind::Server,
            _ => AiErrorKind::Provider,
        }
    }

    fn map_provider_error(&self, err: ProviderError) -> AiError {
        match err {
            ProviderError::Upstream { status, body } => {
                let msg = Self::extract_error_message(&body);
                let kind = Self::map_upstream_status_to_kind(status);
                AiError::with_http(self.provider_id(), kind, status, msg)
            }

            ProviderError::Http(e) => {
                AiError::new(self.provider_id(), AiErrorKind::Network, e.to_string())
            }
            ProviderError::Json(e) => {
                AiError::new(self.provider_id(), AiErrorKind::Parse, e.to_string())
            }

            ProviderError::HeaderName(e) => AiError::new(
                self.provider_id(),
                AiErrorKind::Unknown,
                format!("Invalid header name: {e}"),
            ),
            ProviderError::HeaderValue(e) => AiError::new(
                self.provider_id(),
                AiErrorKind::Unknown,
                format!("Invalid header value: {e}"),
            ),

            ProviderError::Message(m) => AiError::new(self.provider_id(), AiErrorKind::Provider, m),
        }
    }

    fn extract_output_text(v: &Value) -> String {
        v.get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.get(0))
            .and_then(|c0| c0.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .unwrap_or_default()
            .to_string()
    }

    fn extract_id(v: &Value) -> String {
        v.get("id")
            .and_then(|id| id.as_str())
            .unwrap_or("unknown")
            .to_string()
    }

    fn extract_model(v: &Value, fallback: &str) -> String {
        v.get("model")
            .and_then(|m| m.as_str())
            .unwrap_or(fallback)
            .to_string()
    }

    fn extract_usage(v: &Value) -> Option<AiUsage> {
        let u = v.get("usage")?;

        let prompt_tokens = u
            .get("prompt_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);
        let completion_tokens = u
            .get("completion_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);
        let total_tokens = u
            .get("total_tokens")
            .and_then(|x| x.as_u64())
            .map(|n| n as u32);

        Some(AiUsage {
            input_tokens: prompt_tokens,
            output_tokens: completion_tokens,
            total_tokens,
        })
    }

    fn build_chat_completions_body(req: &AiRequest) -> Value {
        let mut messages: Vec<Value> = Vec::new();

        if let Some(sys) = req.system.as_ref().filter(|s| !s.trim().is_empty()) {
            messages.push(json!({ "role": "system", "content": sys }));
        }

        messages.push(json!({ "role": "user", "content": req.input }));

        // Build object with conditional fields to avoid sending nulls.
        let mut obj = Map::new();
        obj.insert("model".to_string(), Value::String(req.model.clone()));
        obj.insert("messages".to_string(), Value::Array(messages));

        if let Some(t) = req.temperature {
            if let Some(n) = serde_json::Number::from_f64(t as f64) {
                obj.insert("temperature".to_string(), Value::Number(n));
            }
        }

        if let Some(mt) = req.max_output_tokens {
            obj.insert(
                "max_tokens".to_string(),
                Value::Number(serde_json::Number::from(mt)),
            );
        }

        Value::Object(obj)
    }
}

impl super::AiProvider for DeepSeekProvider {
    fn id(&self) -> &'static str {
        "deepseek"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let api_key = self.load_api_key()?;
        let base_url = self.resolve_base_url(req);

        let cfg = OpenAICompatConfig {
            base_url,
            api_key,
            default_model: None,
            extra_headers: vec![],
            timeout_secs: 60,
        };

        let client = OpenAICompatClient::new(&cfg).map_err(|e| self.map_provider_error(e))?;

        // DeepSeek target (via compat client): {base}/v1/chat/completions
        let body = Self::build_chat_completions_body(req);
        let v = client
            .post_chat_completions(&body)
            .map_err(|e| self.map_provider_error(e))?;

        let id = Self::extract_id(&v);
        let model = Self::extract_model(&v, &req.model);
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
