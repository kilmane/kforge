// src-tauri/src/ai/secret_store.rs

use crate::ai::error::AiError;

use keyring::Entry;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

// On Windows, some credential stores / dev contexts can behave inconsistently
// across separate Entry instances. We keep a small in-memory fallback cache so:
// - "Save key" immediately enables providers in the running session
// - providers can still retrieve the key during this session
//
// This does NOT replace secure storage; it is a pragmatic guardrail for dev.
static MEM_KEYS: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

fn mem() -> &'static Mutex<HashMap<String, String>> {
  MEM_KEYS.get_or_init(|| Mutex::new(HashMap::new()))
}

// Use a stable app identifier as the "service"
const SERVICE: &str = "com.kforge.kforge";

// Store each provider key as a separate keyring entry.
// Use underscore to avoid delimiter quirks in some backends.
fn entry_for(provider_id: &str) -> Result<Entry, AiError> {
  let username = format!("provider_{provider_id}");
  Entry::new(SERVICE, &username)
    .map_err(|e| AiError::unknown(format!("Keyring entry init failed: {e}")))
}

pub fn set_api_key(provider_id: &str, api_key: &str) -> Result<(), AiError> {
  let provider_id = provider_id.trim();
  if provider_id.is_empty() {
    return Err(AiError::invalid("provider_id is empty"));
  }

  let key = api_key.trim().to_string();
  if key.is_empty() {
    return Err(AiError::invalid("API key is empty"));
  }

  // Always set in-memory first (so UI can immediately enable this session)
  {
    let mut m = mem()
      .lock()
      .map_err(|_| AiError::unknown("MEM_KEYS lock poisoned"))?;
    m.insert(provider_id.to_string(), key.clone());
  }

  // Best-effort secure storage
  let entry = entry_for(provider_id)?;
  entry
    .set_password(&key)
    .map_err(|e| AiError::unknown(format!("Keyring write failed for {provider_id}: {e}")))?;

  // Best-effort verify (do not fail on NoEntry; mem fallback handles session)
  match entry.get_password() {
    Ok(_) => Ok(()),
    Err(keyring::Error::NoEntry) => Ok(()),
    Err(_) => Ok(()),
  }
}

pub fn get_api_key(provider_id: &str) -> Result<Option<String>, AiError> {
  let provider_id = provider_id.trim();
  if provider_id.is_empty() {
    return Ok(None);
  }

  // First try secure store
  let entry = entry_for(provider_id)?;
  match entry.get_password() {
    Ok(v) => return Ok(Some(v)),
    Err(keyring::Error::NoEntry) => {
      // fall through to mem
    }
    Err(e) => {
      // fall through to mem, but keep error discoverable if mem also misses
      let m = mem()
        .lock()
        .map_err(|_| AiError::unknown("MEM_KEYS lock poisoned"))?;
      if let Some(v) = m.get(provider_id) {
        return Ok(Some(v.clone()));
      }
      return Err(AiError::unknown(format!(
        "Keyring read failed for {provider_id}: {e}"
      )));
    }
  }

  // In-memory fallback (session only)
  let m = mem()
    .lock()
    .map_err(|_| AiError::unknown("MEM_KEYS lock poisoned"))?;
  Ok(m.get(provider_id).cloned())
}

pub fn clear_api_key(provider_id: &str) -> Result<(), AiError> {
  let provider_id = provider_id.trim();
  if provider_id.is_empty() {
    return Ok(());
  }

  // Clear mem fallback
  {
    let mut m = mem()
      .lock()
      .map_err(|_| AiError::unknown("MEM_KEYS lock poisoned"))?;
    m.remove(provider_id);
  }

  // Best-effort secure delete
  let entry = entry_for(provider_id)?;
  match entry.delete_credential() {
    Ok(_) => Ok(()),
    Err(keyring::Error::NoEntry) => Ok(()),
    Err(e) => Err(AiError::unknown(format!(
      "Keyring delete failed for {provider_id}: {e}"
    ))),
  }
}

// True if the key exists in the OS keyring (Credential Manager),
// false if not present. Errors only if the backend returns a real failure.
pub fn is_persisted_in_keyring(provider_id: &str) -> Result<bool, AiError> {
  let provider_id = provider_id.trim();
  if provider_id.is_empty() {
    return Ok(false);
  }

  let entry = entry_for(provider_id)?;
  match entry.get_password() {
    Ok(_) => Ok(true),
    Err(keyring::Error::NoEntry) => Ok(false),
    Err(e) => Err(AiError::unknown(format!(
      "Keyring read failed for {provider_id}: {e}"
    ))),
  }
}
