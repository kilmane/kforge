use crate::ai::{
  error::{AiError, AiErrorPayload},
  providers,
  secret_store,
  types::{AiRequest, AiResponse},
};

// NOTE: We intentionally use camelCase argument names here
// so the frontend can invoke with { providerId, apiKey } reliably.

#[tauri::command]
pub fn ai_set_api_key(providerId: String, apiKey: String) -> Result<(), AiErrorPayload> {
  secret_store::set_api_key(&providerId, &apiKey).map_err(AiErrorPayload::from)
}

#[tauri::command]
pub fn ai_clear_api_key(providerId: String) -> Result<(), AiErrorPayload> {
  secret_store::clear_api_key(&providerId).map_err(AiErrorPayload::from)
}

#[tauri::command]
pub fn ai_has_api_key(providerId: String) -> Result<bool, AiErrorPayload> {
  let has = secret_store::get_api_key(&providerId)
    .map_err(AiErrorPayload::from)?
    .is_some();
  Ok(has)
}

#[tauri::command]
pub fn ai_generate(request: AiRequest) -> Result<AiResponse, AiErrorPayload> {
  let provider = providers::get_provider(&request.provider_id)
    .ok_or_else(|| AiErrorPayload::from(AiError::invalid(format!(
      "Unknown provider_id: {}",
      request.provider_id
    ))))?;

  provider.generate(&request).map_err(AiErrorPayload::from)
}
