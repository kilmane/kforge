// src-tauri/src/ai/providers/groq/mod.rs

use crate::ai::{
  error::AiError,
  secret_store,
  types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};

/// Groq provider (OpenAI-compatible Chat Completions).
///
/// Notes:
/// - Sync provider to match the current AiProvider trait.
/// - Uses `reqwest::blocking`.
/// - Default base_url for OpenAI compatibility: https://api.groq.com/openai/v1
///   (Groq docs: OpenAI-compatible base URL). :contentReference[oaicite:2]{index=2}
pub struct GroqProvider {
  base_url: String,
}

impl GroqProvider {
  pub fn new() -> Self {
    Self {
      base_url: "https://api.groq.com/openai/v1".to_string(),
    }
  }

  fn provider_id(&self) -> &'static str {
    "groq"
  }

  fn resolve_base_url(&self, req: &AiRequest) -> String {
    req.endpoint.clone().unwrap_or_else(|| self.base_url.clone())
  }

  fn load_api_key(&self) -> Result<String, AiError> {
    match secret_store::get_api_key(self.provider_id())? {
      Some(k) if !k.trim().is_empty() => Ok(k),
      _ => Err(AiError::auth("No Groq API key set. Use ai_set_api_key first.")),
    }
  }

  fn extract_output_text(resp: &GroqChatCompletionResponse) -> String {
    resp
      .choices
      .get(0)
      .and_then(|c| c.message.as_ref())
      .and_then(|m| m.content.clone())
      .unwrap_or_default()
  }
}

impl super::AiProvider for GroqProvider {
  fn id(&self) -> &'static str {
    "groq"
  }

  fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
    let api_key = self.load_api_key()?;
    let base_url = self.resolve_base_url(req);

    // Groq docs: POST /chat/completions (OpenAI-compatible) :contentReference[oaicite:3]{index=3}
    let url = format!(
      "{}/chat/completions",
      base_url.trim_end_matches('/')
    );

    let mut messages: Vec<GroqMessage> = Vec::new();
    if let Some(sys) = req.system.as_ref().filter(|s| !s.trim().is_empty()) {
      messages.push(GroqMessage {
        role: "system".to_string(),
        content: sys.to_string(),
      });
    }
    messages.push(GroqMessage {
      role: "user".to_string(),
      content: req.input.clone(),
    });

    let body = GroqChatCompletionRequest {
      model: req.model.clone(),
      messages,
      temperature: req.temperature,
      max_tokens: req.max_output_tokens,
      stream: Some(false),
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
      // Try parse OpenAI-style error envelope (Groq is OpenAI-compatible)
      let msg = match serde_json::from_slice::<OpenAICompatErrorEnvelope>(&bytes) {
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
        "Groq HTTP {}: {}",
        status.as_u16(),
        msg
      )));
    }

    let parsed: GroqChatCompletionResponse = serde_json::from_slice(&bytes)
      .map_err(|e| AiError::provider(format!("Failed to parse Groq JSON: {e}")))?;

    let id = parsed.id.clone().unwrap_or_else(|| "unknown".to_string());
    let model = parsed.model.clone().unwrap_or_else(|| req.model.clone());
    let output_text = Self::extract_output_text(&parsed);

    let usage = parsed.usage.as_ref().map(|u| AiUsage {
      input_tokens: u.prompt_tokens,
      output_tokens: u.completion_tokens,
      total_tokens: u.total_tokens,
    });

    Ok(AiResponse {
      id,
      provider_id: self.provider_id().to_string(),
      model,
      output_text,
      usage,
    })
  }
}

// -------------------- Groq JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct GroqChatCompletionRequest {
  model: String,
  messages: Vec<GroqMessage>,

  #[serde(skip_serializing_if = "Option::is_none")]
  temperature: Option<f32>,

  /// OpenAI-compatible chat completions uses `max_tokens`
  #[serde(skip_serializing_if = "Option::is_none")]
  max_tokens: Option<u32>,

  #[serde(skip_serializing_if = "Option::is_none")]
  stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct GroqMessage {
  role: String,
  content: String,
}

#[derive(Debug, Deserialize)]
struct GroqChatCompletionResponse {
  id: Option<String>,
  model: Option<String>,
  choices: Vec<GroqChoice>,
  usage: Option<GroqUsage>,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
  message: Option<GroqAssistantMessage>,
}

#[derive(Debug, Deserialize)]
struct GroqAssistantMessage {
  content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GroqUsage {
  #[serde(default)]
  prompt_tokens: Option<u32>,
  #[serde(default)]
  completion_tokens: Option<u32>,
  #[serde(default)]
  total_tokens: Option<u32>,
}

// -------------------- OpenAI-compatible error envelope --------------------

#[derive(Debug, Deserialize)]
struct OpenAICompatErrorEnvelope {
  error: OpenAICompatErrorBody,
}

#[derive(Debug, Deserialize)]
struct OpenAICompatErrorBody {
  message: String,
}
