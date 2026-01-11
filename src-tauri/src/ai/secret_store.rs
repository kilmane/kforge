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

fn is_missing_entry_error(err_string_lower: &str) -> bool {
  // Different platforms / keyring backends use different wording.
  // We treat these as "no key stored" rather than a hard error.
  err_string_lower.contains("not found")
    || err_string_lower.contains("no entry")
    || err_string_lower.contains("no matching entry")
    || err_string_lower.contains("no matching entry found")
    || err_string_lower.contains("entry not found")
}

pub fn get_api_key(provider_id: &str) -> Result<Option<String>, AiError> {
  let entry = entry_for(provider_id)?;

  match entry.get_password() {
    Ok(v) => Ok(Some(v)),
    Err(e) => {
      let msg = e.to_string().to_lowercase();
      if is_missing_entry_error(&msg) {
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
      if is_missing_entry_error(&msg) {
        Ok(())
      } else {
        Err(AiError::unknown(format!("keyring delete failed: {e}")))
      }
    }
  }
}
