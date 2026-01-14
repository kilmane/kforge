use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AiErrorKind {
  // Auth / credential issues
  Auth,

  // Rate limiting / quotas
  RateLimit,   // legacy name (keep)
  RateLimited, // used by some providers/adapters

  // Network / transport failures
  Network,

  // Request was invalid (client-side)
  InvalidRequest, // legacy name (keep)
  BadRequest,

  // Provider returned 5xx or similar
  Server,

  // Provider returned an error response (HTTP or upstream gateway style)
  Upstream,

  // Failed to parse provider response JSON
  Parse,

  // Provider-specific errors (but not necessarily HTTP)
  Provider,

  // Anything else
  Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiErrorPayload {
  pub kind: AiErrorKind,
  pub message: String,

  // Optional context (kept optional to avoid breaking callers)
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub provider: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub http_status: Option<u16>,
}

// ✅ This satisfies thiserror Display requirement for the Payload.
impl fmt::Display for AiErrorPayload {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    if let Some(p) = &self.provider {
      if let Some(code) = self.http_status {
        write!(f, "[{p}] {:?} (HTTP {code}): {}", self.kind, self.message)
      } else {
        write!(f, "[{p}] {:?}: {}", self.kind, self.message)
      }
    } else {
      write!(f, "{:?}: {}", self.kind, self.message)
    }
  }
}

#[derive(Debug, Error)]
pub enum AiError {
  #[error("{0}")]
  Payload(AiErrorPayload),
}

impl AiError {
  // --- Existing constructors (kept for compatibility) ---

  pub fn auth(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Auth,
      message: msg.into(),
      provider: None,
      http_status: None,
    })
  }

  pub fn invalid(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::InvalidRequest,
      message: msg.into(),
      provider: None,
      http_status: None,
    })
  }

  pub fn provider(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Provider,
      message: msg.into(),
      provider: None,
      http_status: None,
    })
  }

  pub fn unknown(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Unknown,
      message: msg.into(),
      provider: None,
      http_status: None,
    })
  }

  // --- New constructors required by adapters (OpenAI, etc.) ---

  pub fn new(provider: impl Into<String>, kind: AiErrorKind, message: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind,
      message: message.into(),
      provider: Some(provider.into()),
      http_status: None,
    })
  }

  pub fn with_http(
    provider: impl Into<String>,
    kind: AiErrorKind,
    http_status: u16,
    message: impl Into<String>,
  ) -> Self {
    Self::Payload(AiErrorPayload {
      kind,
      message: message.into(),
      provider: Some(provider.into()),
      http_status: Some(http_status),
    })
  }
}

impl From<AiError> for AiErrorPayload {
  fn from(value: AiError) -> Self {
    match value {
      AiError::Payload(p) => p,
    }
  }
}
