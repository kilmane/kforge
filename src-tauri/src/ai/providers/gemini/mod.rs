// src-tauri/src/ai/providers/gemini/mod.rs

use crate::ai::{
    error::AiError,
    secret_store,
    types::{AiRequest, AiResponse, AiUsage},
};

use serde::Deserialize;
use serde::Serialize;

/// Gemini provider using the Google Generative Language API (generateContent).
///
/// NOTE:
/// - This provider is SYNC to match the current AiProvider trait.
/// - It uses `reqwest::blocking` like OpenAI.
pub struct GeminiProvider {
    base_url: String,
}

impl GeminiProvider {
    pub fn new() -> Self {
        Self {
            // Keep the version in the default base URL to match existing usage.
            base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
        }
    }

    fn provider_id(&self) -> &'static str {
        "gemini"
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
                "No Gemini API key set. Use ai_set_api_key first.",
            )),
        }
    }

    fn normalize_model(model: &str) -> String {
        // Gemini expects: /models/<MODEL>:generateContent
        // Accept common inputs:
        // - "gemini-1.5-flash"
        // - "models/gemini-1.5-flash"
        // - "models/gemini-1.5-flash:generateContent"
        let mut m = model.trim().to_string();

        if let Some(stripped) = m.strip_prefix("models/") {
            m = stripped.to_string();
        }
        if let Some(stripped) = m.strip_suffix(":generateContent") {
            m = stripped.to_string();
        }

        m
    }

    fn extract_output_text(resp: &GeminiGenerateResponse) -> String {
        // Concatenate all text parts from the first candidate (typical behavior),
        // but be resilient if multiple parts exist.
        let mut out = String::new();

        if let Some(cands) = &resp.candidates {
            if let Some(first) = cands.first() {
                if let Some(content) = &first.content {
                    if let Some(parts) = &content.parts {
                        for p in parts {
                            if let Some(t) = &p.text {
                                if !out.is_empty() {
                                    out.push('\n');
                                }
                                out.push_str(t);
                            }
                        }
                    }
                }
            }
        }

        out
    }
}

impl super::AiProvider for GeminiProvider {
    fn id(&self) -> &'static str {
        "gemini"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let api_key = self.load_api_key()?;

        let model = Self::normalize_model(&req.model);
        if model.is_empty() {
            return Err(AiError::invalid("Missing model for Gemini request."));
        }
        if req.input.trim().is_empty() {
            return Err(AiError::invalid("Missing input for Gemini request."));
        }

        let base_url = self.resolve_base_url(req);
        let url = format!(
            "{}/models/{}:generateContent",
            base_url.trim_end_matches('/'),
            model
        );

        let body = GeminiGenerateRequest::from_ai_request(req);

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| AiError::unknown(format!("HTTP client build failed: {e}")))?;

        let resp = client
            .post(url)
            // Prefer header-based auth (keeps keys out of URLs/logs).
            .header("x-goog-api-key", api_key)
            .json(&body)
            .send()
            .map_err(|e| AiError::unknown(format!("Network error: {e}")))?;

        let status = resp.status();
        let bytes = resp
            .bytes()
            .map_err(|e| AiError::unknown(format!("Failed reading response: {e}")))?;

        if !status.is_success() {
            // Try parse Gemini-style error envelope
            // Typical shape:
            // { "error": { "code": 401, "message": "...", "status": "UNAUTHENTICATED" } }
            let msg = match serde_json::from_slice::<GeminiErrorEnvelope>(&bytes) {
                Ok(env) => {
                    let mut parts = Vec::new();
                    if let Some(code) = env.error.code {
                        parts.push(format!("code={code}"));
                    }
                    if let Some(st) = env.error.status {
                        parts.push(format!("status={st}"));
                    }
                    if let Some(m) = env.error.message {
                        parts.push(m);
                    }
                    if parts.is_empty() {
                        String::from_utf8_lossy(&bytes).to_string()
                    } else {
                        parts.join(" — ")
                    }
                }
                Err(_) => String::from_utf8_lossy(&bytes).to_string(),
            };

            if status.as_u16() == 401 || status.as_u16() == 403 {
                return Err(AiError::auth(msg));
            }
            if status.as_u16() == 400 {
                return Err(AiError::invalid(msg));
            }

            // Keep conservative (no assumptions about extra constructors).
            return Err(AiError::provider(format!(
                "Gemini HTTP {}: {}",
                status.as_u16(),
                msg
            )));
        }

        let parsed: GeminiGenerateResponse = serde_json::from_slice(&bytes)
            .map_err(|e| AiError::provider(format!("Failed to parse Gemini JSON: {e}")))?;

        let output_text = Self::extract_output_text(&parsed);
        if output_text.trim().is_empty() {
            return Err(AiError::provider(
                "Gemini returned an empty response (no candidate text).".to_string(),
            ));
        }

        let usage = parsed.usage_metadata.as_ref().map(|u| AiUsage {
            input_tokens: u.prompt_token_count,
            output_tokens: u.candidates_token_count,
            total_tokens: u.total_token_count,
        });

        Ok(AiResponse {
            // Gemini generateContent doesn't reliably return an "id" field in this API.
            // We'll generate a deterministic-ish id for now.
            id: format!("gemini-{}", chrono_like_millis()),
            provider_id: self.provider_id().to_string(),
            model: req.model.clone(),
            output_text,
            usage,
        })
    }
}

// -------------------- Gemini JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct GeminiGenerateRequest {
    contents: Vec<GeminiContent>,

    // API expects camelCase: systemInstruction
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "systemInstruction")]
    system_instruction: Option<GeminiSystemInstruction>,

    // API expects camelCase: generationConfig
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "generationConfig")]
    generation_config: Option<GeminiGenerationConfig>,
}

impl GeminiGenerateRequest {
    fn from_ai_request(req: &AiRequest) -> Self {
        let system_instruction = req.system.as_ref().map(|s| GeminiSystemInstruction {
            parts: vec![GeminiPartOut { text: s.clone() }],
        });

        let generation_config = {
            let has_any = req.temperature.is_some() || req.max_output_tokens.is_some();
            if has_any {
                Some(GeminiGenerationConfig {
                    temperature: req.temperature,
                    max_output_tokens: req.max_output_tokens,
                })
            } else {
                None
            }
        };

        Self {
            contents: vec![GeminiContent {
                role: "user".to_string(),
                parts: vec![GeminiPartOut {
                    text: req.input.clone(),
                }],
            }],
            system_instruction,
            generation_config,
        }
    }
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPartOut>,
}

#[derive(Debug, Serialize)]
struct GeminiPartOut {
    text: String,
}

#[derive(Debug, Serialize)]
struct GeminiSystemInstruction {
    parts: Vec<GeminiPartOut>,
}

#[derive(Debug, Serialize)]
struct GeminiGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct GeminiGenerateResponse {
    candidates: Option<Vec<GeminiCandidate>>,

    #[serde(rename = "usageMetadata")]
    usage_metadata: Option<GeminiUsageMetadata>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiContentIn>,
}

#[derive(Debug, Deserialize)]
struct GeminiContentIn {
    parts: Option<Vec<GeminiPartIn>>,
}

#[derive(Debug, Deserialize)]
struct GeminiPartIn {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiUsageMetadata {
    #[serde(rename = "promptTokenCount")]
    prompt_token_count: Option<u32>,

    #[serde(rename = "candidatesTokenCount")]
    candidates_token_count: Option<u32>,

    #[serde(rename = "totalTokenCount")]
    total_token_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct GeminiErrorEnvelope {
    error: GeminiErrorBody,
}

#[derive(Debug, Deserialize)]
struct GeminiErrorBody {
    code: Option<u16>,
    message: Option<String>,
    status: Option<String>,
}

// Tiny helper: avoids adding a new dependency (chrono) just for ids.
fn chrono_like_millis() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
