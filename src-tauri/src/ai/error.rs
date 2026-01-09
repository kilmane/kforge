use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AiErrorKind {
  Auth,
  RateLimit,
  Network,
  InvalidRequest,
  Provider,
  Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiErrorPayload {
  pub kind: AiErrorKind,
  pub message: String,
}

// ✅ This fixes the thiserror Display requirement.
impl fmt::Display for AiErrorPayload {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "{:?}: {}", self.kind, self.message)
  }
}

#[derive(Debug, Error)]
pub enum AiError {
  #[error("{0}")]
  Payload(AiErrorPayload),
}

impl AiError {
  pub fn auth(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Auth,
      message: msg.into(),
    })
  }

  pub fn invalid(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::InvalidRequest,
      message: msg.into(),
    })
  }

  pub fn provider(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Provider,
      message: msg.into(),
    })
  }

  pub fn unknown(msg: impl Into<String>) -> Self {
    Self::Payload(AiErrorPayload {
      kind: AiErrorKind::Unknown,
      message: msg.into(),
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
