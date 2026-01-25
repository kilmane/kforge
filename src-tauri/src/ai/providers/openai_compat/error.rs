// src-tauri/src/ai/providers/openai_compat/error.rs

use std::{error::Error, fmt};

#[derive(Debug)]
pub enum ProviderError {
    Http(reqwest::Error),
    Json(serde_json::Error),

    HeaderName(reqwest::header::InvalidHeaderName),
    HeaderValue(reqwest::header::InvalidHeaderValue),

    /// Non-2xx response from provider with raw body preserved.
    Upstream {
        status: u16,
        body: String,
    },

    Message(String),
}

impl fmt::Display for ProviderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProviderError::Http(e) => write!(f, "http error: {e}"),
            ProviderError::Json(e) => write!(f, "json error: {e}"),
            ProviderError::HeaderName(e) => write!(f, "invalid header name: {e}"),
            ProviderError::HeaderValue(e) => write!(f, "invalid header value: {e}"),
            ProviderError::Upstream { status, body } => {
                write!(f, "upstream error {status}: {body}")
            }
            ProviderError::Message(m) => write!(f, "{m}"),
        }
    }
}

impl Error for ProviderError {}

impl From<reqwest::Error> for ProviderError {
    fn from(e: reqwest::Error) -> Self {
        ProviderError::Http(e)
    }
}

impl From<serde_json::Error> for ProviderError {
    fn from(e: serde_json::Error) -> Self {
        ProviderError::Json(e)
    }
}
