// src-tauri/src/ai/providers/openai/mod.rs

use crate::ai::{
  error::AiError,
  secret_store,
  types::{AiRequest, AiResponse, AiUsage},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// OpenAI provider using the Responses API.
///
/// NOTE:
/// - This provider is SYNC to match the current AiProvider trait.
/// - It uses `reqwest::blocking` (we'll ensure the Cargo.toml deps match next).
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
    req.endpoint.clone().unwrap_or_else(|| self.base_url.clone())
  }

  fn load_api_key(&self) -> Result<String, AiError> {
    match secret_store::get_api_key(self.provider_id())? {
      Some(k) if !k.trim().is_empty() => Ok(k),
      _ => Err(AiError::auth(
        "No OpenAI API key set. Use ai_set_api_key first.",
      )),
    }
  }

  fn extract_output_text(v: &Value) -> String {
    // Responses API commonly: output[...].content[...].text
    // We’ll concatenate any found text blocks.
    let mut out = String::new();

    if let Some(output) = v.get("output").and_then(|x| x.as_array()) {
      for item in output {
        if let Some(content) = item.get("content").and_then(|x| x.as_array()) {
          for c in content {
            // Typical: { "type": "output_text", "text": "..." }
            if let Some(t) = c.get("text").and_then(|x| x.as_str()) {
              if !out.is_empty() {
                out.push('\n');
              }
              out.push_str(t);
            }
          }
        }
      }
    }

    // Fallbacks (just in case variants appear)
    if out.is_empty() {
      if let Some(t) = v.get("output_text").and_then(|x| x.as_str()) {
        out = t.to_string();
      }
    }

    out
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

    // Build request body for Responses API
    let body = OpenAIResponsesRequest {
      model: req.model.clone(),
      input: req.input.clone(),
      instructions: req.system.clone(),
      temperature: req.temperature,
      max_output_tokens: req.max_output_tokens,
      store: Some(false),
      // keep it simple for now
      tool_choice: Some("none".to_string()),
      tools: Some(vec![]),
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
      // Try parse OpenAI-style error envelope
      let msg = match serde_json::from_slice::<OpenAIErrorEnvelope>(&bytes) {
        Ok(env) => env.error.message,
        Err(_) => String::from_utf8_lossy(&bytes).to_string(),
      };

      // Map error kind into your existing AiError constructors
      if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err(AiError::auth(msg));
      }
      if status.as_u16() == 400 {
        return Err(AiError::invalid(msg));
      }

      return Err(AiError::provider(format!(
        "OpenAI HTTP {}: {}",
        status.as_u16(),
        msg
      )));
    }

    let v: Value = serde_json::from_slice(&bytes)
      .map_err(|e| AiError::provider(format!("Failed to parse OpenAI JSON: {e}")))?;

    let id = v
      .get("id")
      .and_then(|x| x.as_str())
      .unwrap_or("unknown")
      .to_string();

    let model = v
      .get("model")
      .and_then(|x| x.as_str())
      .unwrap_or(&req.model)
      .to_string();

    let output_text = Self::extract_output_text(&v);

    let usage = v.get("usage").and_then(|u| {
      Some(AiUsage {
        input_tokens: u.get("input_tokens").and_then(|x| x.as_u64()).map(|n| n as u32),
        output_tokens: u.get("output_tokens").and_then(|x| x.as_u64()).map(|n| n as u32),
        total_tokens: u.get("total_tokens").and_then(|x| x.as_u64()).map(|n| n as u32),
      })
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

// -------------------- OpenAI JSON shapes (minimal) --------------------

#[derive(Debug, Serialize)]
struct OpenAIResponsesRequest {
  model: String,
  input: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  instructions: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  temperature: Option<f32>,

  #[serde(skip_serializing_if = "Option::is_none")]
  max_output_tokens: Option<u32>,

  #[serde(skip_serializing_if = "Option::is_none")]
  store: Option<bool>,

  #[serde(skip_serializing_if = "Option::is_none")]
  tool_choice: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  tools: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
struct OpenAIErrorEnvelope {
  error: OpenAIErrorBody,
}

#[derive(Debug, Deserialize)]
struct OpenAIErrorBody {
  message: String,
}
