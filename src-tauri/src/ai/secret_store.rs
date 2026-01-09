use crate::ai::error::AiError;
use keyring::Entry;

const SERVICE: &str = "kforge";

// Store each provider key as a separate keyring entry.
// Example username: "provider:openai"
fn entry_for(provider_id: &str) -> Result<Entry, AiError> {
  Entry::new(SERVICE, &format!("provider:{provider_id}"))
    .map_err(|e| AiError::unknown(format!("keyring init failed: {e}")))
}

pub fn set_api_key(provider_id: &str, api_key: &str) -> Result<(), AiError> {
  let entry = entry_for(provider_id)?;
  entry
    .set_password(api_key)
    .map_err(|e| AiError::unknown(format!("keyring set failed: {e}")))?;
  Ok(())
}

pub fn get_api_key(provider_id: &str) -> Result<Option<String>, AiError> {
  let entry = entry_for(provider_id)?;

  match entry.get_password() {
    Ok(v) => Ok(Some(v)),
    Err(e) => {
      let msg = e.to_string().to_lowercase();
      if msg.contains("not found") || msg.contains("no entry") {
        Ok(None)
      } else {
        Err(AiError::unknown(format!("keyring get failed: {e}")))
      }
    }
  }
}

pub fn clear_api_key(provider_id: &str) -> Result<(), AiError> {
  let entry = entry_for(provider_id)?;
  match entry.delete_credential() {
    Ok(_) => Ok(()),
    Err(e) => {
      let msg = e.to_string().to_lowercase();
      if msg.contains("not found") || msg.contains("no entry") {
        Ok(())
      } else {
        Err(AiError::unknown(format!("keyring delete failed: {e}")))
      }
    }
  }
}
