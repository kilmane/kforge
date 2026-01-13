// src-tauri/src/ai/providers/custom/mod.rs

use crate::ai::{
  error::{AiError, AiErrorKind},
  providers::openai_compat::{OpenAICompatClient, OpenAICompatConfig, ProviderError},
  secret_store,
  types::{AiRequest, AiResponse, AiUsage},
};

use serde_json::{json, Value};

/// Generic OpenAI-compatible provider for arbitrary endpoints (RunPod / DataCrunch / custom gateways).
///
/// Behavior:
/// - Uses `OpenAICompatClient::post_chat_completions`
/// - `OpenAICompatClient` always appends `/v1/...`, so we must store/pass a base URL WITHOUT `/v1`.
/// - If the user supplies an endpoint ending in `/v1`, we strip it.
/// - Uses API key stored under provider id `custom` (Bearer auth handled by shared client).
pub struct CustomEndpointProvider {
  base_url: String,
}

impl CustomEndpointProvider {
  pub fn new() -> Self {
    // Sensible default for an OpenAI-compatible endpoint.
    // Users can override via `req.endpoint`.
    Self {
      base_url: "https://api.openai.com".to_string(),
    }
  }

  fn provider_id(&self) -> &'static str {
    "custom"
  }

  fn load_api_key(&self) -> Result<String, AiError> {
    match secret_store::get_api_key(self.provider_id())? {
      Some(k) if !k.trim().is_empty() => Ok(k),
      _ => Err(AiError::auth(
        "No Custom Endpoint API key set. Use ai_set_api_key with provider 'custom' first.",
      )),
    }
  }

  fn normalize_base_url(&self, raw: &str) -> String {
    let mut s = raw.trim().trim_end_matches('/').to_string();

    // Strip trailing `/v1` if present (shared client appends it).
    if s.ends_with("/v1") {
      s.truncate(s.len().saturating_sub(3));
      s = s.trim_end_matches('/').to_string();
    }

    s
  }

  fn resolve_base_url(&self, req: &AiRequest) -> String {
    let raw = req
      .endpoint
      .as_ref()
      .map(|s| s.as_str())
      .unwrap_or(self.base_url.as_str());

    self.normalize_base_url(raw)
  }

  fn map_provider_error(&self, err: ProviderError) -> AiError {
    let provider = self.provider_id();

    match err {
      ProviderError::Upstream { status, body } => {
        // Preserve raw upstream body in the message.
        let msg = body;

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

impl super::AiProvider for CustomEndpointProvider {
  fn id(&self) -> &'static str {
    "custom"
  }

  fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
    let api_key = self.load_api_key()?;
    let base_url = self.resolve_base_url(req);

    // Build OpenAI-compatible chat completion payload from AiRequest.
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

    let cfg = OpenAICompatConfig { base_url };
    let client = OpenAICompatClient::new(cfg).map_err(|e| self.map_provider_error(e))?;

    let v = client
      .post_chat_completions(&api_key, &body)
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
