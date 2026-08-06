use async_trait::async_trait;
use rmcp::transport::auth::{AuthError, CredentialStore, StoredCredentials};

const KEYRING_SERVICE: &str = "com.kforge.kforge.supabase-autopilot";
const KEYRING_ACCOUNT: &str = "hosted-mcp-oauth";

#[derive(Clone, Debug, Default)]
pub struct WindowsCredentialStore;

impl WindowsCredentialStore {
    fn entry() -> Result<keyring::Entry, AuthError> {
        keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|error| {
            AuthError::InternalError(format!("credential store unavailable: {error}"))
        })
    }

    pub async fn has_credentials(&self) -> Result<bool, AuthError> {
        Ok(self.load().await?.is_some())
    }
}

#[async_trait]
impl CredentialStore for WindowsCredentialStore {
    async fn load(&self) -> Result<Option<StoredCredentials>, AuthError> {
        tokio::task::spawn_blocking(|| match Self::entry()?.get_password() {
            Ok(serialized) => serde_json::from_str(&serialized).map(Some).map_err(|_| {
                AuthError::InternalError("stored OAuth credentials are invalid".into())
            }),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(AuthError::InternalError(format!(
                "credential store read failed: {error}"
            ))),
        })
        .await
        .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
    }

    async fn save(&self, credentials: StoredCredentials) -> Result<(), AuthError> {
        let serialized = serde_json::to_string(&credentials).map_err(|_| {
            AuthError::InternalError("OAuth credentials could not be encoded".into())
        })?;

        tokio::task::spawn_blocking(move || {
            Self::entry()?.set_password(&serialized).map_err(|error| {
                AuthError::InternalError(format!("credential store write failed: {error}"))
            })
        })
        .await
        .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
    }

    async fn clear(&self) -> Result<(), AuthError> {
        tokio::task::spawn_blocking(|| match Self::entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(AuthError::InternalError(format!(
                "credential store clear failed: {error}"
            ))),
        })
        .await
        .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
    }
}

#[cfg(test)]
mod tests {
    use rmcp::transport::auth::StoredCredentials;

    #[test]
    fn stored_registration_metadata_round_trips_without_frontend_storage() {
        let credentials = StoredCredentials::new(
            "registered-client".to_string(),
            None,
            vec!["projects:read".to_string()],
            None,
        )
        .with_issuer(Some("https://api.supabase.com".to_string()));

        let serialized = serde_json::to_string(&credentials).unwrap();
        let decoded: StoredCredentials = serde_json::from_str(&serialized).unwrap();

        assert_eq!(decoded.client_id, "registered-client");
        assert_eq!(decoded.granted_scopes, vec!["projects:read"]);
        assert_eq!(decoded.issuer.as_deref(), Some("https://api.supabase.com"));
        assert!(decoded.token_response.is_none());
    }
}
