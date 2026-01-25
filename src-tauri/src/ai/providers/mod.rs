// src-tauri/src/ai/providers/mod.rs

use crate::ai::{
    error::AiError,
    types::{AiRequest, AiResponse},
};

pub trait AiProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError>;
}

pub mod claude;
pub mod custom;
pub mod deepseek;
pub mod gemini;
pub mod groq;
pub mod mock;
pub mod ollama;
pub mod openai;
pub mod openai_compat; // ✅ Phase 3.2.0 prep: shared OpenAI-compatible client
pub mod openrouter; // ✅ Phase 3.2.4: RunPod / DataCrunch / Custom Endpoint

pub fn get_provider(provider_id: &str) -> Option<Box<dyn AiProvider>> {
    match provider_id {
        "mock" => Some(Box::new(mock::MockProvider)),
        "openai" => Some(Box::new(openai::OpenAIProvider::new())),
        "gemini" => Some(Box::new(gemini::GeminiProvider::new())),
        "deepseek" => Some(Box::new(deepseek::DeepSeekProvider::new())),
        "claude" => Some(Box::new(claude::ClaudeProvider::new())),
        "groq" => Some(Box::new(groq::GroqProvider::new())),
        "openrouter" => Some(Box::new(openrouter::OpenRouterProvider::new())),
        "ollama" => Some(Box::new(ollama::OllamaProvider::new())),
        "custom" => Some(Box::new(custom::CustomEndpointProvider::new())),
        _ => None,
    }
}
