// src/ai/providers/openai/types.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct OpenAIResponsesRequest {
    pub model: String,

    /// Can be string or array; we use string in v1 for simplicity.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,

    /// System/developer message inserted into context.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Privacy-first: disable response storage by setting store:false.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub store: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,

    /// Responses API supports max_output_tokens.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,

    /// Tools disabled for Phase 3.1.1 v1 (text-only).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIResponsesResponse {
    pub id: String,
    pub model: Option<String>,
    pub output: Option<Vec<OpenAIOutputItem>>,
    pub usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIUsage {
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    pub total_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum OpenAIOutputItem {
    #[serde(rename = "message")]
    Message {
        role: Option<String>,
        content: Vec<OpenAIContentPart>,
    },

    // Other output types (reasoning, tool calls, etc) ignored for v1
    #[serde(other)]
    Other,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum OpenAIContentPart {
    #[serde(rename = "output_text")]
    OutputText { text: String },

    #[serde(other)]
    Other,
}

/// Extract all assistant output_text segments (robust against multiple output items).
pub fn extract_output_text(resp: &OpenAIResponsesResponse) -> String {
    let mut out = String::new();
    let Some(items) = &resp.output else {
        return out;
    };

    for item in items {
        if let OpenAIOutputItem::Message { content, .. } = item {
            for part in content {
                if let OpenAIContentPart::OutputText { text } = part {
                    if !out.is_empty() {
                        out.push('\n');
                    }
                    out.push_str(text);
                }
            }
        }
    }
    out
}

/// Standard OpenAI error envelope: { "error": { "message", "type", "param", "code" } }
#[derive(Debug, Deserialize)]
pub struct OpenAIErrorEnvelope {
    pub error: OpenAIErrorBody,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIErrorBody {
    pub message: String,

    #[serde(rename = "type")]
    pub error_type: Option<String>,

    pub param: Option<String>,
    pub code: Option<String>,
}
