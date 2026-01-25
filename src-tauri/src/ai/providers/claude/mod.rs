// src-tauri/src/ai/providers/claude/mod.rs

use crate::ai::{
    error::AiError,
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};

/// Anthropic Claude provider using the Messages API.
///
/// NOTE:
/// - This provider is SYNC to match the current AiProvider trait.
/// - It uses `reqwest::blocking` like the other providers.
pub struct ClaudeProvider {
    base_url: String,
    anthropic_version: String,
}

impl ClaudeProvider {
    pub fn new() -> Self {
        Self {
            base_url: "https://api.anthropic.com/v1".to_string(),
            // Anthropic requires an "anthropic-version" header.
            // This is the commonly documented stable version for the Messages API.
            anthropic_version: "2023-06-01".to_string(),
        }
    }

    fn provider_id(&self) -> &'static str {
        "claude"
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
                "No Claude (Anthropic) API key set. Use ai_set_api_key first.",
            )),
        }
    }

    fn extract_output_text(resp: &ClaudeMessagesResponse) -> String {
        // Messages API returns: content: [{ "type": "text", "text": "..." }, ...]
        let mut out = String::new();

        for block in &resp.content {
            if block.r#type == "text" {
                if let Some(t) = block.text.as_deref() {
                    if !out.is_empty() {
                        out.push('\n');
                    }
                    out.push_str(t);
                }
            }
        }

        out
    }
}

impl super::AiProvider for ClaudeProvider {
    fn id(&self) -> &'static str {
        "claude"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let api_key = self.load_api_key()?;
        let base_url = self.resolve_base_url(req);
        let url = format!("{}/messages", base_url.trim_end_matches('/'));

        // Anthropic requires max_tokens.
        // If caller doesn't provide, use a safe default to avoid API errors.
        let max_tokens = req.max_output_tokens.unwrap_or(1024);

        // Build request body for Anthropic Messages API.
        // Keep it simple: a single user message containing the full input text.
        let body = ClaudeMessagesRequest {
            model: req.model.clone(),
            max_tokens,
            temperature: req.temperature,
            system: req.system.clone(),
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: vec![ClaudeContentBlock {
                    r#type: "text".to_string(),
                    text: req.input.clone(),
                }],
            }],
            stream: Some(false),
        };

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| AiError::unknown(format!("HTTP client build failed: {e}")))?;

        let resp = client
            .post(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", self.anthropic_version.clone())
            .json(&body)
            .send()
            .map_err(|e| AiError::unknown(format!("Network error: {e}")))?;

        let status = resp.status();
        let bytes = resp
            .bytes()
            .map_err(|e| AiError::unknown(format!("Failed reading response: {e}")))?;

        if !status.is_success() {
            // Try parse Anthropic-style error envelope
            let msg = match serde_json::from_slice::<ClaudeErrorEnvelope>(&bytes) {
                Ok(env) => env.error.message,
                Err(_) => String::from_utf8_lossy(&bytes).to_string(),
            };

            if status.as_u16() == 401 || status.as_u16() == 403 {
                return Err(AiError::auth(msg));
            }
            if status.as_u16() == 400 {
                return Err(AiError::invalid(msg));
            }

            return Err(AiError::provider(format!(
                "Claude HTTP {}: {}",
                status.as_u16(),
                msg
            )));
        }

        let parsed: ClaudeMessagesResponse = serde_json::from_slice(&bytes)
            .map_err(|e| AiError::provider(format!("Failed to parse Claude JSON: {e}")))?;

        let output_text = Self::extract_output_text(&parsed);

        let usage = parsed.usage.map(|u| {
            let input = u.input_tokens;
            let output = u.output_tokens;
            let total = match (input, output) {
                (Some(i), Some(o)) => Some(i.saturating_add(o)),
                _ => None,
            };

            AiUsage {
                input_tokens: input,
                output_tokens: output,
                total_tokens: total,
            }
        });

        Ok(AiResponse {
            id: parsed.id.unwrap_or_else(|| "unknown".to_string()),
            provider_id: self.provider_id().to_string(),
            model: parsed.model.unwrap_or_else(|| req.model.clone()),
            output_text,
            usage,
        })
    }
}

// -------------------- Claude JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct ClaudeMessagesRequest {
    model: String,
    max_tokens: u32,

    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,

    messages: Vec<ClaudeMessage>,

    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: Vec<ClaudeContentBlock>,
}

#[derive(Debug, Serialize)]
struct ClaudeContentBlock {
    #[serde(rename = "type")]
    r#type: String,
    text: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeMessagesResponse {
    #[serde(default)]
    id: Option<String>,

    #[serde(default)]
    model: Option<String>,

    #[serde(default)]
    content: Vec<ClaudeContentBlockResponse>,

    #[serde(default)]
    usage: Option<ClaudeUsage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContentBlockResponse {
    #[serde(rename = "type")]
    r#type: String,

    #[serde(default)]
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ClaudeUsage {
    #[serde(default)]
    input_tokens: Option<u32>,

    #[serde(default)]
    output_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct ClaudeErrorEnvelope {
    error: ClaudeErrorBody,
}

#[derive(Debug, Deserialize)]
struct ClaudeErrorBody {
    #[serde(default)]
    r#type: Option<String>,

    message: String,
}
