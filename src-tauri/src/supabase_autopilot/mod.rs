mod mcp;
mod oauth;
mod token_store;

use rmcp::transport::auth::CredentialStore;
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, RwLock};

use self::{mcp::RestoreError, token_store::WindowsCredentialStore};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct OrganizationSummary {
    pub id: String,
    pub slug: String,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ProjectSummary {
    pub id: String,
    #[serde(rename(deserialize = "ref"))]
    pub reference: String,
    pub organization_id: String,
    pub organization_slug: String,
    pub name: String,
    pub status: String,
    pub region: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct SelectedProject {
    pub name: String,
    pub reference: String,
    pub api_url: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct ConnectionSnapshot {
    pub status: String,
    pub message: String,
    pub organizations: Vec<OrganizationSummary>,
    pub projects: Vec<ProjectSummary>,
    pub project: Option<SelectedProject>,
}

#[derive(Default)]
pub struct SupabaseAutopilotState {
    operation: Mutex<()>,
    organizations: RwLock<Vec<OrganizationSummary>>,
    projects: RwLock<Vec<ProjectSummary>>,
    selected: RwLock<Option<SelectedProject>>,
}

impl ConnectionSnapshot {
    fn disconnected() -> Self {
        Self {
            status: "disconnected".into(),
            message: "Not connected. This milestone does not modify the database or application."
                .into(),
            organizations: Vec::new(),
            projects: Vec::new(),
            project: None,
        }
    }

    fn choose_project(
        organizations: Vec<OrganizationSummary>,
        projects: Vec<ProjectSummary>,
        recovered: bool,
    ) -> Self {
        Self {
            status: "choose_project".into(),
            message: if recovered {
                "Supabase credentials recovered securely. Choose a development project; no database or application changes will be made."
            } else {
                "Connected to Supabase. Choose a development project; no database or application changes will be made."
            }
            .into(),
            organizations,
            projects,
            project: None,
        }
    }

    fn connected_read_only(project: SelectedProject) -> Self {
        Self {
            status: "connected_read_only".into(),
            message:
                "Read-only inspection connection verified. The database and application were not modified."
                    .into(),
            organizations: Vec::new(),
            projects: Vec::new(),
            project: Some(project),
        }
    }

    fn reconnect_required(message: String) -> Self {
        Self {
            status: "reconnect_required".into(),
            message,
            organizations: Vec::new(),
            projects: Vec::new(),
            project: None,
        }
    }
}

#[tauri::command]
pub async fn supabase_autopilot_status(
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<ConnectionSnapshot, String> {
    let _operation = state.operation.lock().await;
    if let Some(project) = state.selected.read().await.clone() {
        return Ok(ConnectionSnapshot::connected_read_only(project));
    }

    let store = WindowsCredentialStore;
    if !store
        .has_credentials()
        .await
        .map_err(|error| oauth::redact_sensitive(&error.to_string()))?
    {
        return Ok(ConnectionSnapshot::disconnected());
    }

    match mcp::restore_account(store).await {
        Ok((organizations, projects)) => {
            remember_projects(&state, &organizations, &projects).await;
            Ok(ConnectionSnapshot::choose_project(
                organizations,
                projects,
                true,
            ))
        }
        Err(RestoreError::AuthorizationRequired) => Ok(ConnectionSnapshot::reconnect_required(
            "The stored Supabase session can no longer be refreshed. Disconnect, then connect again."
                .into(),
        )),
        Err(RestoreError::Failed(error)) => Ok(ConnectionSnapshot::reconnect_required(format!(
            "Stored Supabase session recovery failed: {}. Reconnect when the service is available.",
            oauth::redact_sensitive(&error)
        ))),
    }
}

#[tauri::command]
pub async fn supabase_autopilot_connect(
    app: tauri::AppHandle,
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<ConnectionSnapshot, String> {
    let _operation = state.operation.lock().await;
    let store = WindowsCredentialStore;

    if store
        .has_credentials()
        .await
        .map_err(|error| oauth::redact_sensitive(&error.to_string()))?
    {
        match mcp::restore_account(store.clone()).await {
            Ok((organizations, projects)) => {
                remember_projects(&state, &organizations, &projects).await;
                return Ok(ConnectionSnapshot::choose_project(
                    organizations,
                    projects,
                    true,
                ));
            }
            Err(RestoreError::AuthorizationRequired) => {
                store
                    .clear()
                    .await
                    .map_err(|error| oauth::redact_sensitive(&error.to_string()))?;
            }
            Err(RestoreError::Failed(error)) => {
                return Err(oauth::redact_sensitive(&error));
            }
        }
    }

    let server_url = mcp::account_url()?;
    let manager = oauth::authorize(&app, &server_url, store.clone()).await?;
    let (organizations, projects) = mcp::inspect_account_with_manager(&server_url, manager).await?;
    remember_projects(&state, &organizations, &projects).await;
    *state.selected.write().await = None;

    Ok(ConnectionSnapshot::choose_project(
        organizations,
        projects,
        false,
    ))
}

#[tauri::command]
pub async fn supabase_autopilot_select_project(
    project_ref: String,
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<ConnectionSnapshot, String> {
    let _operation = state.operation.lock().await;
    let project = state
        .projects
        .read()
        .await
        .iter()
        .find(|project| project.reference == project_ref)
        .cloned()
        .ok_or_else(|| {
            "Select a project returned by the current Supabase connection".to_string()
        })?;

    match mcp::verify_project(&project, WindowsCredentialStore).await {
        Ok(selected) => {
            *state.selected.write().await = Some(selected.clone());
            Ok(ConnectionSnapshot::connected_read_only(selected))
        }
        Err(RestoreError::AuthorizationRequired) => Err(
            "The Supabase session expired and could not be refreshed. Disconnect, then reconnect."
                .into(),
        ),
        Err(RestoreError::Failed(error)) => Err(oauth::redact_sensitive(&error)),
    }
}

#[tauri::command]
pub async fn supabase_autopilot_disconnect(
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<ConnectionSnapshot, String> {
    let _operation = state.operation.lock().await;
    WindowsCredentialStore
        .clear()
        .await
        .map_err(|error| oauth::redact_sensitive(&error.to_string()))?;
    state.organizations.write().await.clear();
    state.projects.write().await.clear();
    *state.selected.write().await = None;
    Ok(ConnectionSnapshot::disconnected())
}

async fn remember_projects(
    state: &SupabaseAutopilotState,
    organizations: &[OrganizationSummary],
    projects: &[ProjectSummary],
) {
    *state.organizations.write().await = organizations.to_vec();
    *state.projects.write().await = projects.to_vec();
}
