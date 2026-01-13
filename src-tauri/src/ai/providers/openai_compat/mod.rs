// src-tauri/src/ai/providers/openai_compat/mod.rs

mod client;
mod config;
mod error;

pub use client::OpenAICompatClient;
pub use config::OpenAICompatConfig;
pub use error::ProviderError;
