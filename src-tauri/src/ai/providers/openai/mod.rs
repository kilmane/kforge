// src-tauri/src/ai/providers/openai/mod.rs

use crate::ai::{
    error::AiError,
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

pub mod types;

use types::{
    extract_output_text, OpenAIErrorEnvelope, OpenAIResponsesRequest, OpenAIResponsesResponse,
};

/// OpenAI provider using the Responses API.
///
/// NOTE:
/// - This provider is SYNC to match the current AiProvider trait.
/// - It uses `reqwest::blocking`.
pub struct OpenAIProvider {
    base_url: String,
}

impl OpenAIProvider {
    pub fn new() -> Self {
        Self {
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    fn provider_id(&self) -> &'static str {
        "openai"
    }

    fn resolve_base_url(&self, req: &AiRequest) -> String {
        req.endpoint
            .clone()
            .unwrap_or_else(|| self.base_url.clone())
    }

    fn load_api_key(&self) -> Result<String, AiError> {
        match secret_store::get_api_key(self.provider_id())? {
            Some(k) if !k.trim().is_empty() => Ok(k),
            _ => Err(AiError::auth(
                "No OpenAI API key set. Use ai_set_api_key first.",
            )),
        }
    }

    fn map_error(status: reqwest::StatusCode, body_bytes: &[u8]) -> AiError {
        let msg = match serde_json::from_slice::<OpenAIErrorEnvelope>(body_bytes) {
            Ok(env) => env.error.message,
            Err(_) => String::from_utf8_lossy(body_bytes).to_string(),
        };

        match status.as_u16() {
            401 | 403 => AiError::auth(msg),
            400 => AiError::invalid(msg),
            408 => AiError::provider(format!("OpenAI request timeout: {msg}")),
            429 => AiError::provider(format!("OpenAI rate limited: {msg}")),
            500..=599 => AiError::provider(format!("OpenAI server error: {msg}")),
            _ => AiError::provider(format!("OpenAI HTTP {}: {}", status.as_u16(), msg)),
        }
    }
}

impl super::AiProvider for OpenAIProvider {
    fn id(&self) -> &'static str {
        "openai"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let api_key = self.load_api_key()?;
        let base_url = self.resolve_base_url(req);
        let url = format!("{}/responses", base_url.trim_end_matches('/'));

        // Build request body for Responses API (text-only v1)
        let body = OpenAIResponsesRequest {
            model: req.model.clone(),
            input: Some(req.input.clone()),
            instructions: req.system.clone(),
            store: Some(false),
            temperature: req.temperature,
            top_p: None,
            max_output_tokens: req.max_output_tokens,
            // Tools are disabled for Phase 3.1.1 (text-only)
            tool_choice: None,
            tools: None,
        };

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| AiError::unknown(format!("HTTP client build failed: {e}")))?;

        let resp = client
            .post(url)
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .map_err(|e| AiError::unknown(format!("Network error: {e}")))?;

        let status = resp.status();
        let bytes = resp
            .bytes()
            .map_err(|e| AiError::unknown(format!("Failed reading response: {e}")))?;

        if !status.is_success() {
            return Err(Self::map_error(status, &bytes));
        }

        let parsed: OpenAIResponsesResponse = serde_json::from_slice(&bytes).map_err(|e| {
            AiError::provider(format!("Failed to parse OpenAI Responses JSON: {e}"))
        })?;

        // IMPORTANT: borrow `parsed` first (no moves yet), then move fields out.
        let output_text = extract_output_text(&parsed);
        let model = parsed.model.unwrap_or_else(|| req.model.clone());
        let usage = parsed.usage.map(|u| AiUsage {
            input_tokens: u.input_tokens,
            output_tokens: u.output_tokens,
            total_tokens: u.total_tokens,
        });

        Ok(AiResponse {
            id: parsed.id,
            provider_id: self.provider_id().to_string(),
            model,
            output_text,
            usage,
        })
    }
}
