use crate::ai::{
  error::AiError,
  types::{AiRequest, AiResponse},
};

pub trait AiProvider: Send + Sync {
  fn id(&self) -> &'static str;
  fn generate(&self, req: &AiRequest) -> Result<AiResponse, AiError>;
}

pub mod mock;

pub fn get_provider(provider_id: &str) -> Option<Box<dyn AiProvider>> {
  match provider_id {
    "mock" => Some(Box::new(mock::MockProvider)),
    _ => None,
  }
}
