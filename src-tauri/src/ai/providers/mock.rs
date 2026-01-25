use crate::ai::{
    error::AiError,
    types::{AiRequest, AiResponse},
};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct MockProvider;

impl super::AiProvider for MockProvider {
    fn id(&self) -> &'static str {
        "mock"
    }

    fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError> {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| AiError::unknown(format!("time error: {e}")))?
            .as_millis();

        Ok(AiResponse {
            id: format!("mock-{millis}"),
            provider_id: self.id().to_string(),
            model: req.model.clone(),
            output_text: format!("(mock) you said:\n{}", req.input),
            usage: None,
        })
    }
}
