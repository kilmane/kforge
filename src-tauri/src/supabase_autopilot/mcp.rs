use rmcp::{
    model::{CallToolRequestParams, CallToolResult, ClientInfo},
    service::RunningService,
    transport::{
        auth::{AuthClient, AuthError, AuthorizationManager},
        streamable_http_client::StreamableHttpClientTransportConfig,
        StreamableHttpClientTransport,
    },
    RoleClient, ServiceExt,
};
use serde::{de::DeserializeOwned, Deserialize};
use serde_json::Value;
use url::Url;

use super::{OrganizationSummary, ProjectSummary, SelectedProject};
use crate::supabase_autopilot::token_store::WindowsCredentialStore;

const HOSTED_MCP_ENDPOINT: &str = "https://mcp.supabase.com/mcp";
const ACCOUNT_TOOLS: &[&str] = &["list_organizations", "list_projects"];
const PROJECT_TOOLS: &[&str] = &["get_project_url"];

type McpClient = RunningService<RoleClient, ClientInfo>;

#[derive(Debug)]
pub enum RestoreError {
    AuthorizationRequired,
    Failed(String),
}

#[derive(Debug, Deserialize)]
struct OrganizationList {
    organizations: Vec<OrganizationSummary>,
}

#[derive(Debug, Deserialize)]
struct ProjectList {
    projects: Vec<ProjectSummary>,
}

#[derive(Debug, Deserialize)]
struct ProjectUrl {
    url: String,
}

pub fn account_url() -> Result<String, String> {
    build_url(None, "account")
}

pub fn project_url(project_ref: &str) -> Result<String, String> {
    build_url(Some(project_ref), "development")
}

fn build_url(project_ref: Option<&str>, features: &str) -> Result<String, String> {
    let mut url = Url::parse(HOSTED_MCP_ENDPOINT)
        .map_err(|_| "the hosted Supabase MCP endpoint is invalid".to_string())?;
    {
        let mut query = url.query_pairs_mut();
        if let Some(project_ref) = project_ref {
            let trimmed = project_ref.trim();
            if trimmed.is_empty() {
                return Err("a Supabase project reference is required".into());
            }
            query.append_pair("project_ref", trimmed);
        }
        query.append_pair("read_only", "true");
        query.append_pair("features", features);
    }
    Ok(url.into())
}

pub async fn capture_auth_challenge(server_url: &str) -> Result<String, String> {
    let transport = StreamableHttpClientTransport::with_client(
        reqwest::Client::default(),
        StreamableHttpClientTransportConfig::with_uri(server_url),
    );

    match ClientInfo::default().serve(transport).await {
        Ok(_client) => {
            Err("hosted Supabase MCP unexpectedly accepted an unauthenticated session".to_string())
        }
        Err(error) => error
            .auth_challenge()
            .map(str::to_string)
            .ok_or_else(|| format!("hosted MCP authorization challenge failed: {error}")),
    }
}

pub async fn restore_account(
    store: WindowsCredentialStore,
) -> Result<(Vec<OrganizationSummary>, Vec<ProjectSummary>), RestoreError> {
    let server_url = account_url().map_err(RestoreError::Failed)?;
    let client = connect_from_store(&server_url, store).await?;
    inspect_account(client).await.map_err(RestoreError::Failed)
}

pub async fn inspect_account_with_manager(
    server_url: &str,
    manager: AuthorizationManager,
) -> Result<(Vec<OrganizationSummary>, Vec<ProjectSummary>), String> {
    let client = connect_with_manager(server_url, manager).await?;
    inspect_account(client).await
}

pub async fn verify_project(
    project: &ProjectSummary,
    store: WindowsCredentialStore,
) -> Result<SelectedProject, RestoreError> {
    let server_url = project_url(&project.reference).map_err(RestoreError::Failed)?;
    let client = connect_from_store(&server_url, store).await?;
    ensure_required_read_only_tools(&client, PROJECT_TOOLS)
        .await
        .map_err(RestoreError::Failed)?;

    let project_url: ProjectUrl = call_validated_tool(&client, "get_project_url")
        .await
        .map_err(RestoreError::Failed)?;
    verify_project_identity(&project.reference, &project_url.url).map_err(RestoreError::Failed)?;

    Ok(SelectedProject {
        name: project.name.clone(),
        reference: project.reference.clone(),
        api_url: project_url.url,
    })
}

async fn connect_from_store(
    server_url: &str,
    store: WindowsCredentialStore,
) -> Result<McpClient, RestoreError> {
    let mut manager = AuthorizationManager::new(server_url)
        .await
        .map_err(|error| RestoreError::Failed(format!("OAuth discovery failed: {error}")))?;
    manager.set_credential_store(store);

    let restored = manager
        .initialize_from_store()
        .await
        .map_err(classify_auth_error)?;
    if !restored {
        return Err(RestoreError::AuthorizationRequired);
    }

    manager
        .get_access_token()
        .await
        .map_err(classify_auth_error)?;
    connect_with_manager(server_url, manager)
        .await
        .map_err(|error| {
            if error.contains("authorization required") {
                RestoreError::AuthorizationRequired
            } else {
                RestoreError::Failed(error)
            }
        })
}

async fn connect_with_manager(
    server_url: &str,
    manager: AuthorizationManager,
) -> Result<McpClient, String> {
    let auth_client = AuthClient::new(reqwest::Client::default(), manager);
    let transport = StreamableHttpClientTransport::with_client(
        auth_client,
        StreamableHttpClientTransportConfig::with_uri(server_url),
    );
    ClientInfo::default()
        .serve(transport)
        .await
        .map_err(|error| format!("authorized MCP connection failed: {error}"))
}

async fn inspect_account(
    client: McpClient,
) -> Result<(Vec<OrganizationSummary>, Vec<ProjectSummary>), String> {
    ensure_required_read_only_tools(&client, ACCOUNT_TOOLS).await?;

    let organizations: OrganizationList =
        call_validated_tool(&client, "list_organizations").await?;
    let projects: ProjectList = call_validated_tool(&client, "list_projects").await?;

    Ok((organizations.organizations, projects.projects))
}

async fn ensure_required_read_only_tools(
    client: &McpClient,
    required: &[&str],
) -> Result<(), String> {
    let tools = client
        .peer()
        .list_all_tools()
        .await
        .map_err(|error| format!("MCP tool discovery failed: {error}"))?;
    let advertised = tools
        .iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "MCP tool metadata could not be validated".to_string())?;
    validate_required_tool_advertisements(&advertised, required)
}

async fn call_validated_tool<T>(client: &McpClient, name: &str) -> Result<T, String>
where
    T: DeserializeOwned,
{
    ensure_approved_tool_call(name)?;
    let result = client
        .peer()
        .call_tool(CallToolRequestParams::new(name.to_string()))
        .await
        .map_err(|error| format!("Supabase MCP tool '{name}' failed: {error}"))?;

    decode_tool_result(result, name)
}

fn decode_tool_result<T>(result: CallToolResult, name: &str) -> Result<T, String>
where
    T: DeserializeOwned,
{
    if result.is_error == Some(true) {
        return Err(format!("Supabase MCP tool '{name}' returned an error"));
    }

    let value = match result.structured_content {
        Some(value) => value,
        None => {
            let [content] = result.content.as_slice() else {
                return Err(format!(
                    "Supabase MCP tool '{name}' returned no unambiguous JSON result"
                ));
            };
            let text = content.as_text().ok_or_else(|| {
                format!("Supabase MCP tool '{name}' returned a non-text result")
            })?;
            serde_json::from_str(&text.text)
                .map_err(|_| format!("Supabase MCP tool '{name}' returned malformed JSON"))?
        }
    };

    serde_json::from_value(value)
        .map_err(|_| format!("Supabase MCP tool '{name}' returned an invalid result schema"))
}

fn validate_required_tool_advertisements(
    advertised: &[Value],
    required: &[&str],
) -> Result<(), String> {
    for required_name in required {
        let tool = advertised
            .iter()
            .find(|tool| tool.get("name").and_then(Value::as_str) == Some(*required_name))
            .ok_or_else(|| {
                format!("required read-only MCP tool '{required_name}' is unavailable")
            })?;
        if tool
            .pointer("/annotations/readOnlyHint")
            .and_then(Value::as_bool)
            != Some(true)
        {
            return Err(format!(
                "required MCP tool '{required_name}' was not marked read-only"
            ));
        }
    }
    Ok(())
}

fn ensure_approved_tool_call(name: &str) -> Result<(), String> {
    if ACCOUNT_TOOLS.contains(&name) || PROJECT_TOOLS.contains(&name) {
        Ok(())
    } else {
        Err(format!(
            "KForge blocked unapproved Supabase MCP tool invocation '{name}'"
        ))
    }
}

fn classify_auth_error(error: AuthError) -> RestoreError {
    match error {
        AuthError::AuthorizationRequired
        | AuthError::TokenExpired
        | AuthError::TokenRefreshRejected(_) => RestoreError::AuthorizationRequired,
        other => RestoreError::Failed(format!("stored OAuth session recovery failed: {other}")),
    }
}

fn verify_project_identity(project_ref: &str, api_url: &str) -> Result<(), String> {
    let url = Url::parse(api_url)
        .map_err(|_| "Supabase returned an invalid project identity URL".to_string())?;
    let expected_host = format!("{project_ref}.supabase.co");
    if url.scheme() != "https" || url.host_str() != Some(expected_host.as_str()) {
        return Err("project-scoped MCP identity did not match the selected project".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use rmcp::model::{CallToolResult, ContentBlock};
    use serde_json::json;

    use super::{
        account_url, decode_tool_result, ensure_approved_tool_call, project_url,
        validate_required_tool_advertisements, verify_project_identity, OrganizationList,
        ProjectList, ACCOUNT_TOOLS,
    };

    #[test]
    fn account_url_is_read_only_and_account_only() {
        let url = url::Url::parse(&account_url().unwrap()).unwrap();
        let query: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();

        assert_eq!(query.get("read_only").map(String::as_str), Some("true"));
        assert_eq!(query.get("features").map(String::as_str), Some("account"));
        assert!(!query.contains_key("project_ref"));
    }

    #[test]
    fn project_url_encodes_exact_scope_and_read_only_mode() {
        let url = url::Url::parse(&project_url("project ref/unsafe").unwrap()).unwrap();
        let query: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();

        assert_eq!(
            query.get("project_ref").map(String::as_str),
            Some("project ref/unsafe")
        );
        assert_eq!(query.get("read_only").map(String::as_str), Some("true"));
        assert_eq!(
            query.get("features").map(String::as_str),
            Some("development")
        );
    }

    #[test]
    fn project_identity_requires_the_selected_canonical_host() {
        assert!(verify_project_identity(
            "abcdefghijklmnopqrst",
            "https://abcdefghijklmnopqrst.supabase.co"
        )
        .is_ok());
        assert!(
            verify_project_identity("abcdefghijklmnopqrst", "https://different.supabase.co")
                .is_err()
        );
        assert!(verify_project_identity(
            "abcdefghijklmnopqrst",
            "http://abcdefghijklmnopqrst.supabase.co"
        )
        .is_err());
    }

    #[test]
    fn advertised_mutation_tools_do_not_break_required_read_only_discovery() {
        let advertised = vec![
            json!({
                "name": "list_organizations",
                "annotations": { "readOnlyHint": true }
            }),
            json!({
                "name": "list_projects",
                "annotations": { "readOnlyHint": true }
            }),
            json!({
                "name": "create_project",
                "annotations": { "readOnlyHint": false }
            }),
        ];

        assert!(validate_required_tool_advertisements(&advertised, ACCOUNT_TOOLS).is_ok());
    }

    #[test]
    fn local_invocation_allowlist_blocks_advertised_mutation_tools() {
        assert!(ensure_approved_tool_call("list_projects").is_ok());
        assert!(ensure_approved_tool_call("get_project_url").is_ok());
        assert!(ensure_approved_tool_call("create_project").is_err());
        assert!(ensure_approved_tool_call("apply_migration").is_err());
    }

    #[test]
    fn decoder_accepts_structured_content_with_the_expected_schema() {
        let result = CallToolResult::structured(json!({
            "organizations": [{
                "id": "org-id",
                "slug": "org-slug",
                "name": "Organization"
            }]
        }));

        let decoded: OrganizationList =
            decode_tool_result(result, "list_organizations").unwrap();

        assert_eq!(decoded.organizations.len(), 1);
        assert_eq!(decoded.organizations[0].id, "org-id");
    }

    #[test]
    fn decoder_accepts_content_array_text_containing_valid_json() {
        let result = CallToolResult::success(vec![ContentBlock::text(
            r#"{"organizations":[{"id":"org-id","slug":"org-slug","name":"Organization"}]}"#,
        )]);

        let decoded: OrganizationList =
            decode_tool_result(result, "list_organizations").unwrap();

        assert_eq!(decoded.organizations.len(), 1);
        assert_eq!(decoded.organizations[0].slug, "org-slug");
    }

    #[test]
    fn project_reference_decodes_from_supabase_ref_and_serializes_for_the_frontend() {
        let result = CallToolResult::success(vec![ContentBlock::text(
            r#"{"projects":[{"id":"project-id","ref":"project-ref","organization_id":"org-id","organization_slug":"org-slug","name":"Development","status":"ACTIVE_HEALTHY","created_at":"2026-08-05T00:00:00Z","region":"eu-west-2"}]}"#,
        )]);

        let decoded: ProjectList = decode_tool_result(result, "list_projects").unwrap();
        let frontend = serde_json::to_value(&decoded.projects[0]).unwrap();

        assert_eq!(decoded.projects[0].reference, "project-ref");
        assert_eq!(
            frontend.get("reference").and_then(serde_json::Value::as_str),
            Some("project-ref")
        );
        assert!(frontend.get("ref").is_none());
    }

    #[test]
    fn decoder_rejects_malformed_missing_ambiguous_or_invalid_results() {
        let malformed = CallToolResult::success(vec![ContentBlock::text("not JSON")]);
        let missing = CallToolResult::default();
        let ambiguous = CallToolResult::success(vec![
            ContentBlock::text(r#"{"organizations":[]}"#),
            ContentBlock::text(r#"{"organizations":[]}"#),
        ]);
        let invalid_schema = CallToolResult::success(vec![ContentBlock::text(
            r#"{"organizations":[{"id":42,"slug":"org-slug","name":"Organization"}]}"#,
        )]);

        assert!(decode_tool_result::<OrganizationList>(malformed, "list_organizations").is_err());
        assert!(decode_tool_result::<OrganizationList>(missing, "list_organizations").is_err());
        assert!(decode_tool_result::<OrganizationList>(ambiguous, "list_organizations").is_err());
        assert!(
            decode_tool_result::<OrganizationList>(invalid_schema, "list_organizations").is_err()
        );
    }

    #[test]
    fn required_tools_must_explicitly_advertise_read_only_semantics() {
        let advertised = vec![json!({
            "name": "list_projects",
            "annotations": { "readOnlyHint": false }
        })];

        assert!(validate_required_tool_advertisements(&advertised, &["list_projects"]).is_err());
    }
}
