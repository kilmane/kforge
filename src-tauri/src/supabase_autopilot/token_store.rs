use async_trait::async_trait;
use rmcp::transport::auth::{AuthError, CredentialStore, StoredCredentials};

const KEYRING_SERVICE: &str = "com.kforge.kforge.supabase-autopilot";
const READ_ONLY_KEYRING_ACCOUNT: &str = "hosted-mcp-oauth";
const DATABASE_WRITE_KEYRING_ACCOUNT: &str = "hosted-mcp-oauth-database-write";

fn entry(account: &str) -> Result<keyring::Entry, AuthError> {
    keyring::Entry::new(KEYRING_SERVICE, account)
        .map_err(|error| AuthError::InternalError(format!("credential store unavailable: {error}")))
}

async fn load_credentials(
    account: &'static str,
) -> Result<Option<StoredCredentials>, AuthError> {
    tokio::task::spawn_blocking(move || match entry(account)?.get_password() {
        Ok(serialized) => serde_json::from_str(&serialized)
            .map(Some)
            .map_err(|_| AuthError::InternalError("stored OAuth credentials are invalid".into())),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AuthError::InternalError(format!(
            "credential store read failed: {error}"
        ))),
    })
    .await
    .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
}

async fn save_credentials(
    account: &'static str,
    credentials: StoredCredentials,
) -> Result<(), AuthError> {
    let serialized = serde_json::to_string(&credentials)
        .map_err(|_| AuthError::InternalError("OAuth credentials could not be encoded".into()))?;

    tokio::task::spawn_blocking(move || {
        entry(account)?.set_password(&serialized).map_err(|error| {
            AuthError::InternalError(format!("credential store write failed: {error}"))
        })
    })
    .await
    .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
}

async fn clear_credentials(account: &'static str) -> Result<(), AuthError> {
    tokio::task::spawn_blocking(move || match entry(account)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(AuthError::InternalError(format!(
            "credential store clear failed: {error}"
        ))),
    })
    .await
    .map_err(|_| AuthError::InternalError("credential store task failed".into()))?
}

#[derive(Clone, Debug, Default)]
pub struct WindowsCredentialStore;

impl WindowsCredentialStore {
    pub async fn has_credentials(&self) -> Result<bool, AuthError> {
        Ok(self.load().await?.is_some())
    }
}

#[async_trait]
impl CredentialStore for WindowsCredentialStore {
    async fn load(&self) -> Result<Option<StoredCredentials>, AuthError> {
        load_credentials(READ_ONLY_KEYRING_ACCOUNT).await
    }

    async fn save(&self, credentials: StoredCredentials) -> Result<(), AuthError> {
        save_credentials(READ_ONLY_KEYRING_ACCOUNT, credentials).await
    }

    async fn clear(&self) -> Result<(), AuthError> {
        clear_credentials(READ_ONLY_KEYRING_ACCOUNT).await
    }
}

#[derive(Clone, Debug, Default)]
pub struct DatabaseWriteCredentialStore;


#[async_trait]
impl CredentialStore for DatabaseWriteCredentialStore {
    async fn load(&self) -> Result<Option<StoredCredentials>, AuthError> {
        load_credentials(DATABASE_WRITE_KEYRING_ACCOUNT).await
    }

    async fn save(&self, credentials: StoredCredentials) -> Result<(), AuthError> {
        save_credentials(DATABASE_WRITE_KEYRING_ACCOUNT, credentials).await
    }

    async fn clear(&self) -> Result<(), AuthError> {
        clear_credentials(DATABASE_WRITE_KEYRING_ACCOUNT).await
    }
}

#[cfg(test)]
mod tests {
    use rmcp::transport::auth::StoredCredentials;

    use super::{DATABASE_WRITE_KEYRING_ACCOUNT, READ_ONLY_KEYRING_ACCOUNT};

    #[test]
    fn read_only_and_database_write_credentials_use_separate_accounts() {
        assert_ne!(READ_ONLY_KEYRING_ACCOUNT, DATABASE_WRITE_KEYRING_ACCOUNT);
    }

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
        assert_eq!(
            decoded.issuer.as_deref(),
            Some("https://api.supabase.com")
        );
        assert!(decoded.token_response.is_none());
    }
}
