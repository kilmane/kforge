// src-tauri/src/ai/providers/deepseek/mod.rs

use crate::ai::{
  error::AiError,
  secret_store,
  types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};

/// DeepSeek provider (OpenAI-compatible Chat Completions).
///
/// Notes:
/// - Sync provider to match the current AiProvider trait.
/// - Uses `reqwest::blocking`.
/// - Default base_url uses the OpenAI-compatible namespace: https://api.deepseek.com/v1
///   (DeepSeek docs say you may also use https://api.deepseek.com without /v1). :contentReference[oaicite:1]{index=1}
pub struct DeepSeekProvider {
  base_url: String,
}

impl DeepSeekProvider {
  pub fn new() -> Self {
    Self {
      base_url: "https://api.deepseek.com/v1".to_string(),
    }
  }

  fn provider_id(&self) -> &'static str {
    "deepseek"
  }

  fn resolve_base_url(&self, req: &AiRequest) -> String {
    req.endpoint.clone().unwrap_or_else(|| self.base_url.clone())
  }

  fn load_api_key(&self) -> Result<String, AiError> {
    match secret_store::get_api_key(self.provider_id())? {
      Some(k) if !k.trim().is_empty() => Ok(k),
      _ => Err(AiError::auth(
        "No DeepSeek API key set. Use ai_set_api_key first.",
      )),
    }
  }

  fn extract_output_text(resp: &DeepSeekChatCompletionResponse) -> String {
    resp
      .choices
      .get(0)
      .and_then(|c| c.message.as_ref())
      .and_then(|m| m.content.clone())
      .unwrap_or_default()
  }
}

impl super::AiProvider for DeepSeekProvider {
  fn id(&self) -> &'static str {
    "deepseek"
  }

  fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
    let api_key = self.load_api_key()?;
    let base_url = self.resolve_base_url(req);

    // DeepSeek docs: POST /chat/completions :contentReference[oaicite:2]{index=2}
    let url = format!(
      "{}/chat/completions",
      base_url.trim_end_matches('/')
    );

    let mut messages: Vec<DeepSeekMessage> = Vec::new();
    if let Some(sys) = req.system.as_ref().filter(|s| !s.trim().is_empty()) {
      messages.push(DeepSeekMessage {
        role: "system".to_string(),
        content: sys.to_string(),
      });
    }
    messages.push(DeepSeekMessage {
      role: "user".to_string(),
      content: req.input.clone(),
    });

    let body = DeepSeekChatCompletionRequest {
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
      // Try parse OpenAI-style error envelope (DeepSeek is OpenAI-compatible)
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
        "DeepSeek HTTP {}: {}",
        status.as_u16(),
        msg
      )));
    }

    let parsed: DeepSeekChatCompletionResponse = serde_json::from_slice(&bytes).map_err(|e| {
      AiError::provider(format!("Failed to parse DeepSeek JSON: {e}"))
    })?;

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

// -------------------- DeepSeek JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct DeepSeekChatCompletionRequest {
  model: String,
  messages: Vec<DeepSeekMessage>,

  #[serde(skip_serializing_if = "Option::is_none")]
  temperature: Option<f32>,

  /// DeepSeek (OpenAI-compat chat completions) uses `max_tokens`
  #[serde(skip_serializing_if = "Option::is_none")]
  max_tokens: Option<u32>,

  #[serde(skip_serializing_if = "Option::is_none")]
  stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct DeepSeekMessage {
  role: String,
  content: String,
}

#[derive(Debug, Deserialize)]
struct DeepSeekChatCompletionResponse {
  id: Option<String>,
  model: Option<String>,
  choices: Vec<DeepSeekChoice>,
  usage: Option<DeepSeekUsage>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekChoice {
  message: Option<DeepSeekAssistantMessage>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekAssistantMessage {
  content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekUsage {
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
