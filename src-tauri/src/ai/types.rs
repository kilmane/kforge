use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiRequest {
    pub provider_id: String,
    pub model: String,
    pub input: String,

    // Future-friendly fields (not all used in 3.1.0 yet)
    pub system: Option<String>,
    pub temperature: Option<f32>,
    pub max_output_tokens: Option<u32>,

    // Bring-your-own-endpoint (OpenAI-compatible) – used in later sub-phases
    pub endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiUsage {
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    pub total_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub id: String,
    pub provider_id: String,
    pub model: String,
    pub output_text: String,
    pub usage: Option<AiUsage>,
}
