// src-tauri/src/ai/providers/openai_compat/client.rs

use std::time::Duration;

use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

use super::{OpenAICompatConfig, ProviderError};

pub struct OpenAICompatClient {
    http: Client,
    base_url: String, // normalized, no trailing slash, no /v1
}

impl OpenAICompatClient {
    pub fn new(cfg: &OpenAICompatConfig) -> Result<Self, ProviderError> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        // Default: Authorization: Bearer <key>
        let bearer = format!("Bearer {}", cfg.api_key);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&bearer).map_err(ProviderError::HeaderValue)?,
        );

        for (k, v) in &cfg.extra_headers {
            let name = HeaderName::from_bytes(k.as_bytes()).map_err(ProviderError::HeaderName)?;
            let value = HeaderValue::from_str(v).map_err(ProviderError::HeaderValue)?;

            headers.insert(name, value);
        }

        let http = Client::builder()
            .timeout(Duration::from_secs(cfg.timeout_secs))
            .default_headers(headers)
            .build()?;

        Ok(Self {
            http,
            base_url: cfg.normalized_base_url(),
        })
    }

    #[inline]
    fn v1(&self, path: &str) -> String {
        format!("{}/v1/{}", self.base_url, path.trim_start_matches('/'))
    }

    /// POST {base}/v1/chat/completions
    pub fn post_chat_completions(
        &self,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value, ProviderError> {
        let url = self.v1("chat/completions");
        self.post_json(&url, body)
    }

    /// POST {base}/v1/responses
    pub fn post_responses(
        &self,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value, ProviderError> {
        let url = self.v1("responses");
        self.post_json(&url, body)
    }

    /// GET {base}/v1/models (handy for debugging; optional)
    pub fn get_models(&self) -> Result<serde_json::Value, ProviderError> {
        let url = self.v1("models");
        let resp = self.http.get(url).send()?;
        let status = resp.status();
        let text = resp.text()?;
        if !status.is_success() {
            return Err(ProviderError::Upstream {
                status: status.as_u16(),
                body: text,
            });
        }
        Ok(serde_json::from_str(&text)?)
    }

    fn post_json(
        &self,
        url: &str,
        body: &serde_json::Value,
    ) -> Result<serde_json::Value, ProviderError> {
        let resp = self.http.post(url).json(body).send()?;
        let status = resp.status();
        let text = resp.text()?; // read body even on error so we can preserve it
        if !status.is_success() {
            return Err(ProviderError::Upstream {
                status: status.as_u16(),
                body: text,
            });
        }
        Ok(serde_json::from_str(&text)?)
    }
}
