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
use serde_json::{Map, Value};
use url::Url;

use super::{
    inspection::{
        PlanningColumn, PlanningForeignKey, PlanningMigration, PlanningRemoteInspection,
        PlanningTable,
    },
    OrganizationSummary, ProjectSummary, SelectedProject,
};
use crate::supabase_autopilot::token_store::WindowsCredentialStore;

const HOSTED_MCP_ENDPOINT: &str = "https://mcp.supabase.com/mcp";
const ACCOUNT_TOOLS: &[&str] = &["list_organizations", "list_projects"];
const PROJECT_IDENTITY_TOOLS: &[&str] = &["get_project_url"];
const PROJECT_PLANNING_TOOLS: &[&str] = &["get_project_url", "list_tables", "list_migrations"];
const MAX_TABLES: usize = 120;
const MAX_COLUMNS_PER_TABLE: usize = 120;
const MAX_FOREIGN_KEYS_PER_TABLE: usize = 40;
const MAX_MIGRATIONS: usize = 200;
const MAX_TOOL_JSON_BYTES: usize = 1_000_000;

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

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ApplyMigrationResult {
    success: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TableList {
    tables: Vec<RawTable>,
    #[serde(default)]
    advisory: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawTable {
    name: String,
    rls_enabled: bool,
    rows: Option<f64>,
    #[serde(default)]
    comment: Option<String>,
    #[serde(default)]
    columns: Option<Vec<RawColumn>>,
    #[serde(default)]
    primary_keys: Option<Vec<String>>,
    #[serde(default)]
    foreign_key_constraints: Vec<RawForeignKey>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawColumn {
    name: String,
    data_type: String,
    format: String,
    options: Vec<String>,
    #[serde(default)]
    default_value: Option<Value>,
    #[serde(default)]
    identity_generation: Option<String>,
    #[serde(default)]
    enums: Vec<String>,
    #[serde(default)]
    check: Option<String>,
    #[serde(default)]
    comment: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawForeignKey {
    name: String,
    source_table: String,
    source_columns: Vec<String>,
    target_table: String,
    target_columns: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct MigrationList {
    migrations: Vec<RawMigration>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawMigration {
    version: String,
    #[serde(default)]
    name: Option<String>,
}

pub fn account_url() -> Result<String, String> {
    build_url(None, "account", true)
}

pub fn project_url(project_ref: &str) -> Result<String, String> {
    build_url(Some(project_ref), "development,database", true)
}

pub(super) fn project_mutation_url(project_ref: &str) -> Result<String, String> {
    build_url(Some(project_ref), "development,database", false)
}

fn build_url(project_ref: Option<&str>, features: &str, read_only: bool) -> Result<String, String> {
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
        if read_only {
            query.append_pair("read_only", "true");
        }
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
    ensure_required_read_only_tools(&client, PROJECT_IDENTITY_TOOLS)
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

pub async fn inspect_project_for_planning(
    project: &SelectedProject,
    store: WindowsCredentialStore,
) -> Result<PlanningRemoteInspection, RestoreError> {
    let server_url = project_url(&project.reference).map_err(RestoreError::Failed)?;
    let client = connect_from_store(&server_url, store).await?;
    ensure_required_read_only_tools(&client, PROJECT_PLANNING_TOOLS)
        .await
        .map_err(RestoreError::Failed)?;

    let project_url: ProjectUrl = call_validated_tool(&client, "get_project_url")
        .await
        .map_err(RestoreError::Failed)?;
    verify_project_identity(&project.reference, &project_url.url).map_err(RestoreError::Failed)?;

    let mut table_arguments = Map::new();
    table_arguments.insert(
        "schemas".into(),
        Value::Array(vec![Value::String("public".into())]),
    );
    table_arguments.insert("verbose".into(), Value::Bool(true));
    let tables: TableList =
        call_validated_tool_with_arguments(&client, "list_tables", Some(table_arguments))
            .await
            .map_err(RestoreError::Failed)?;
    let migrations: MigrationList = call_validated_tool(&client, "list_migrations")
        .await
        .map_err(RestoreError::Failed)?;

    normalize_project_metadata(project, &project_url.url, tables, migrations)
        .map_err(RestoreError::Failed)
}

pub async fn apply_approved_migration(
    project: &SelectedProject,
    migration_name: &str,
    sql: &str,
    store: WindowsCredentialStore,
) -> Result<(), RestoreError> {
    let server_url = project_mutation_url(&project.reference).map_err(RestoreError::Failed)?;
    let client = connect_from_store(&server_url, store).await?;
    ensure_required_mutation_tools(&client)
        .await
        .map_err(RestoreError::Failed)?;

    let project_url: ProjectUrl = call_validated_tool(&client, "get_project_url")
        .await
        .map_err(RestoreError::Failed)?;
    verify_project_identity(&project.reference, &project_url.url).map_err(RestoreError::Failed)?;

    let arguments = approved_migration_arguments(migration_name, sql);
    let request =
        CallToolRequestParams::new("apply_migration".to_string()).with_arguments(arguments);
    let result = client
        .peer()
        .call_tool(request)
        .await
        .map_err(|error| format!("Supabase approved migration failed: {error}"))
        .and_then(|result| decode_tool_result::<ApplyMigrationResult>(result, "apply_migration"))
        .map_err(RestoreError::Failed)?;
    if !result.success {
        return Err(RestoreError::Failed(
            "Supabase did not confirm the approved migration".into(),
        ));
    }
    Ok(())
}

fn approved_migration_arguments(migration_name: &str, sql: &str) -> Map<String, Value> {
    let mut arguments = Map::new();
    arguments.insert("name".into(), Value::String(migration_name.to_string()));
    arguments.insert("query".into(), Value::String(sql.to_string()));
    arguments
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

async fn ensure_required_mutation_tools(client: &McpClient) -> Result<(), String> {
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
    validate_mutation_tool_advertisements(&advertised)
}

async fn call_validated_tool<T>(client: &McpClient, name: &str) -> Result<T, String>
where
    T: DeserializeOwned,
{
    call_validated_tool_with_arguments(client, name, None).await
}

async fn call_validated_tool_with_arguments<T>(
    client: &McpClient,
    name: &str,
    arguments: Option<Map<String, Value>>,
) -> Result<T, String>
where
    T: DeserializeOwned,
{
    ensure_approved_tool_call(name)?;
    let mut request = CallToolRequestParams::new(name.to_string());
    if let Some(arguments) = arguments {
        request = request.with_arguments(arguments);
    }
    let result = client
        .peer()
        .call_tool(request)
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
            let text = content
                .as_text()
                .ok_or_else(|| format!("Supabase MCP tool '{name}' returned a non-text result"))?;
            serde_json::from_str(&text.text)
                .map_err(|_| format!("Supabase MCP tool '{name}' returned malformed JSON"))?
        }
    };

    validate_tool_value(&value)?;
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

fn validate_mutation_tool_advertisements(advertised: &[Value]) -> Result<(), String> {
    validate_required_tool_advertisements(advertised, PROJECT_IDENTITY_TOOLS)?;
    let tool = advertised
        .iter()
        .find(|tool| tool.get("name").and_then(Value::as_str) == Some("apply_migration"))
        .ok_or_else(|| "required approved migration tool is unavailable".to_string())?;
    if tool
        .pointer("/annotations/readOnlyHint")
        .and_then(Value::as_bool)
        != Some(false)
        || tool
            .pointer("/annotations/destructiveHint")
            .and_then(Value::as_bool)
            != Some(true)
    {
        return Err("approved migration tool metadata was unsafe or ambiguous".into());
    }
    Ok(())
}

fn ensure_approved_tool_call(name: &str) -> Result<(), String> {
    if ACCOUNT_TOOLS.contains(&name) || PROJECT_PLANNING_TOOLS.contains(&name) {
        Ok(())
    } else {
        Err(format!(
            "KForge blocked unapproved Supabase MCP tool invocation '{name}'"
        ))
    }
}

fn normalize_project_metadata(
    project: &SelectedProject,
    api_url: &str,
    raw_tables: TableList,
    raw_migrations: MigrationList,
) -> Result<PlanningRemoteInspection, String> {
    verify_project_identity(&project.reference, api_url)?;
    if raw_tables.tables.len() > MAX_TABLES {
        return Err("Supabase returned too many tables for a bounded planning snapshot".into());
    }
    if raw_migrations.migrations.len() > MAX_MIGRATIONS {
        return Err("Supabase returned too many migrations for a bounded planning snapshot".into());
    }

    let mut tables = Vec::with_capacity(raw_tables.tables.len());
    for table in raw_tables.tables {
        let columns = table.columns.unwrap_or_default();
        if columns.len() > MAX_COLUMNS_PER_TABLE {
            return Err(format!(
                "Supabase table '{}' returned too many columns",
                bounded_database_name(&table.name)?
            ));
        }
        if table.foreign_key_constraints.len() > MAX_FOREIGN_KEYS_PER_TABLE {
            return Err(format!(
                "Supabase table '{}' returned too many foreign keys",
                bounded_database_name(&table.name)?
            ));
        }

        tables.push(PlanningTable {
            name: bounded_database_name(&table.name)?,
            rls_enabled: table.rls_enabled,
            columns: columns
                .into_iter()
                .map(|column| {
                    let _discarded_metadata = (
                        column.format,
                        column.default_value,
                        column.identity_generation,
                        column.enums,
                        column.check,
                        column.comment,
                    );
                    Ok(PlanningColumn {
                        name: bounded_identifier(&column.name, 100)?,
                        data_type: bounded_text(&column.data_type, 120)?,
                        nullable: column.options.iter().any(|value| value == "nullable"),
                        unique: column.options.iter().any(|value| value == "unique"),
                    })
                })
                .collect::<Result<Vec<_>, String>>()?,
            primary_keys: table
                .primary_keys
                .unwrap_or_default()
                .into_iter()
                .map(|value| bounded_identifier(&value, 100))
                .collect::<Result<Vec<_>, _>>()?,
            foreign_keys: table
                .foreign_key_constraints
                .into_iter()
                .map(|foreign_key| {
                    let _source_table = bounded_database_name(&foreign_key.source_table)?;
                    Ok(PlanningForeignKey {
                        name: bounded_identifier(&foreign_key.name, 120)?,
                        source_columns: foreign_key
                            .source_columns
                            .into_iter()
                            .map(|value| bounded_identifier(&value, 100))
                            .collect::<Result<Vec<_>, _>>()?,
                        target_table: bounded_database_name(&foreign_key.target_table)?,
                        target_columns: foreign_key
                            .target_columns
                            .into_iter()
                            .map(|value| bounded_identifier(&value, 100))
                            .collect::<Result<Vec<_>, _>>()?,
                    })
                })
                .collect::<Result<Vec<_>, String>>()?,
        });
        let _discarded_table_metadata = (table.rows, table.comment);
    }

    let migrations = raw_migrations
        .migrations
        .into_iter()
        .map(|migration| {
            Ok(PlanningMigration {
                version: bounded_identifier(&migration.version, 120)?,
                name: migration
                    .name
                    .map(|value| bounded_text(&value, 160))
                    .transpose()?
                    .unwrap_or_default(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let _discarded_advisory = raw_tables.advisory;

    Ok(PlanningRemoteInspection {
        project_name: bounded_text(&project.name, 160)?,
        project_reference: bounded_identifier(&project.reference, 80)?,
        project_api_url: api_url.to_string(),
        tables,
        migrations,
        warnings: Vec::new(),
    })
}

fn validate_tool_value(value: &Value) -> Result<(), String> {
    let encoded = serde_json::to_vec(value)
        .map_err(|_| "Supabase MCP result could not be bounded".to_string())?;
    if encoded.len() > MAX_TOOL_JSON_BYTES {
        return Err("Supabase MCP result exceeded the planning size limit".into());
    }
    inspect_tool_value(value, 0)
}

fn inspect_tool_value(value: &Value, depth: usize) -> Result<(), String> {
    if depth > 14 {
        return Err("Supabase MCP result exceeded the nesting limit".into());
    }
    match value {
        Value::Object(object) => {
            if object.len() > 300 {
                return Err("Supabase MCP result contained an unbounded object".into());
            }
            for (key, nested) in object {
                if is_secret_field_name(key) {
                    return Err(format!(
                        "Supabase MCP result contained blocked secret-bearing field '{key}'"
                    ));
                }
                inspect_tool_value(nested, depth + 1)?;
            }
        }
        Value::Array(items) => {
            if items.len() > 500 {
                return Err("Supabase MCP result contained an unbounded array".into());
            }
            for item in items {
                inspect_tool_value(item, depth + 1)?;
            }
        }
        Value::String(text) if looks_like_secret(text) => {
            return Err("Supabase MCP result contained a secret-like value".into());
        }
        _ => {}
    }
    Ok(())
}

fn is_secret_field_name(value: &str) -> bool {
    let normalized = value.to_ascii_lowercase().replace('-', "_");
    matches!(
        normalized.as_str(),
        "access_token"
            | "refresh_token"
            | "password"
            | "secret"
            | "service_role"
            | "service_role_key"
            | "database_url"
            | "private_key"
            | "api_key"
    )
}

fn looks_like_secret(value: &str) -> bool {
    let text = value.trim();
    if text.starts_with("sb_secret_") {
        return true;
    }
    let jwt_parts = text.split('.').collect::<Vec<_>>();
    if jwt_parts.len() == 3 && jwt_parts.iter().all(|part| part.len() >= 12) {
        return true;
    }
    let lower = text.to_ascii_lowercase();
    (lower.starts_with("postgres://") || lower.starts_with("postgresql://"))
        && lower
            .split_once("://")
            .map(|(_, authority)| authority.contains('@') && authority.contains(':'))
            .unwrap_or(false)
}

fn bounded_identifier(value: &str, max_length: usize) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.len() > max_length
        || !trimmed
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "_.-$".contains(character))
    {
        return Err("Supabase returned invalid identifier metadata".into());
    }
    Ok(trimmed.to_string())
}

fn bounded_database_name(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.len() > 180
        || !trimmed
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "_.$-".contains(character))
    {
        return Err("Supabase returned an invalid database object name".into());
    }
    Ok(trimmed.to_string())
}

fn bounded_text(value: &str, max_length: usize) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > max_length || trimmed.contains('\0') {
        return Err("Supabase returned invalid bounded text metadata".into());
    }
    Ok(trimmed.to_string())
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
        account_url, approved_migration_arguments, decode_tool_result, ensure_approved_tool_call,
        normalize_project_metadata, project_mutation_url, project_url,
        validate_mutation_tool_advertisements, validate_required_tool_advertisements,
        verify_project_identity, MigrationList, OrganizationList, ProjectList, TableList,
        ACCOUNT_TOOLS,
    };
    use crate::supabase_autopilot::SelectedProject;

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
            Some("development,database")
        );
    }

    #[test]
    fn approved_mutation_url_is_project_scoped_without_weakening_read_only_urls() {
        let mutation =
            url::Url::parse(&project_mutation_url("abcdefghijklmnopqrst").unwrap()).unwrap();
        let mutation_query: std::collections::HashMap<_, _> =
            mutation.query_pairs().into_owned().collect();
        let inspection = url::Url::parse(&project_url("abcdefghijklmnopqrst").unwrap()).unwrap();
        let inspection_query: std::collections::HashMap<_, _> =
            inspection.query_pairs().into_owned().collect();

        assert_eq!(
            mutation_query.get("project_ref").map(String::as_str),
            Some("abcdefghijklmnopqrst")
        );
        assert_eq!(
            mutation_query.get("features").map(String::as_str),
            Some("development,database")
        );
        assert!(!mutation_query.contains_key("read_only"));
        assert_eq!(
            inspection_query.get("read_only").map(String::as_str),
            Some("true")
        );
    }

    #[test]
    fn narrow_mutation_discovery_requires_exact_safe_tool_annotations() {
        let safe = vec![
            json!({
                "name": "get_project_url",
                "annotations": { "readOnlyHint": true }
            }),
            json!({
                "name": "apply_migration",
                "annotations": {
                    "readOnlyHint": false,
                    "destructiveHint": true
                }
            }),
            json!({
                "name": "execute_sql",
                "annotations": {
                    "readOnlyHint": false,
                    "destructiveHint": true
                }
            }),
        ];
        let ambiguous = vec![
            safe[0].clone(),
            json!({
                "name": "apply_migration",
                "annotations": { "readOnlyHint": false }
            }),
        ];

        assert!(validate_mutation_tool_advertisements(&safe).is_ok());
        assert!(validate_mutation_tool_advertisements(&ambiguous).is_err());
        assert!(ensure_approved_tool_call("apply_migration").is_err());
        assert!(ensure_approved_tool_call("execute_sql").is_err());
    }

    #[test]
    fn approved_mutation_arguments_send_managed_name_and_query_without_planning_version() {
        let arguments = approved_migration_arguments(
            "supabase_autopilot_111122222222",
            "CREATE TABLE approved();",
        );

        assert_eq!(arguments.len(), 2);
        assert_eq!(
            arguments.get("name").and_then(serde_json::Value::as_str),
            Some("supabase_autopilot_111122222222")
        );
        assert_eq!(
            arguments.get("query").and_then(serde_json::Value::as_str),
            Some("CREATE TABLE approved();")
        );
        assert!(!arguments.contains_key("version"));
        assert!(!arguments.contains_key("project_id"));
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
        assert!(ensure_approved_tool_call("list_tables").is_ok());
        assert!(ensure_approved_tool_call("list_migrations").is_ok());
        assert!(ensure_approved_tool_call("execute_sql").is_err());
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

        let decoded: OrganizationList = decode_tool_result(result, "list_organizations").unwrap();

        assert_eq!(decoded.organizations.len(), 1);
        assert_eq!(decoded.organizations[0].id, "org-id");
    }

    #[test]
    fn decoder_accepts_content_array_text_containing_valid_json() {
        let result = CallToolResult::success(vec![ContentBlock::text(
            r#"{"organizations":[{"id":"org-id","slug":"org-slug","name":"Organization"}]}"#,
        )]);

        let decoded: OrganizationList = decode_tool_result(result, "list_organizations").unwrap();

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
            frontend
                .get("reference")
                .and_then(serde_json::Value::as_str),
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

    #[test]
    fn secret_bearing_fields_are_rejected_before_schema_decoding() {
        let result = CallToolResult::structured(json!({
            "organizations": [],
            "access_token": "must-not-cross"
        }));

        let error =
            decode_tool_result::<OrganizationList>(result, "list_organizations").unwrap_err();
        assert!(error.contains("secret-bearing field"));
    }

    #[test]
    fn table_row_content_is_rejected_as_an_invalid_metadata_shape() {
        let result = CallToolResult::structured(json!({
            "tables": [{
                "name": "public.progress",
                "rls_enabled": true,
                "rows": [{"private_note": "must-not-cross"}]
            }]
        }));

        assert!(decode_tool_result::<TableList>(result, "list_tables").is_err());
    }

    #[test]
    fn normalized_project_metadata_discards_row_counts_defaults_and_comments() {
        let tables: TableList = decode_tool_result(
            CallToolResult::structured(json!({
                "tables": [{
                    "name": "public.progress",
                    "rls_enabled": true,
                    "rows": 14,
                    "comment": "metadata only",
                    "columns": [{
                        "name": "user_id",
                        "data_type": "uuid",
                        "format": "uuid",
                        "options": ["nullable", "unique"],
                        "default_value": "auth.uid()"
                    }],
                    "primary_keys": ["user_id"],
                    "foreign_key_constraints": []
                }]
            })),
            "list_tables",
        )
        .unwrap();
        let migrations: MigrationList = decode_tool_result(
            CallToolResult::structured(json!({
                "migrations": [{"version": "20260806000000", "name": "progress"}]
            })),
            "list_migrations",
        )
        .unwrap();
        let project = SelectedProject {
            name: "Development".into(),
            reference: "abcdefghijklmnopqrst".into(),
            api_url: "https://abcdefghijklmnopqrst.supabase.co".into(),
        };

        let normalized = normalize_project_metadata(
            &project,
            "https://abcdefghijklmnopqrst.supabase.co",
            tables,
            migrations,
        )
        .unwrap();
        let frontend = serde_json::to_value(normalized).unwrap();

        assert_eq!(frontend["tables"][0]["rlsEnabled"], true);
        assert_eq!(frontend["tables"][0]["columns"][0]["nullable"], true);
        assert_eq!(frontend["tables"][0]["columns"][0]["unique"], true);
        assert!(frontend["tables"][0].get("rows").is_none());
        assert!(frontend["tables"][0]["columns"][0]
            .get("defaultValue")
            .is_none());
        assert!(frontend["tables"][0].get("comment").is_none());
    }

    #[test]
    fn normalized_project_metadata_rechecks_selected_project_identity() {
        let tables: TableList = decode_tool_result(
            CallToolResult::structured(json!({"tables": []})),
            "list_tables",
        )
        .unwrap();
        let migrations: MigrationList = decode_tool_result(
            CallToolResult::structured(json!({"migrations": []})),
            "list_migrations",
        )
        .unwrap();
        let project = SelectedProject {
            name: "Development".into(),
            reference: "abcdefghijklmnopqrst".into(),
            api_url: "https://abcdefghijklmnopqrst.supabase.co".into(),
        };

        assert!(normalize_project_metadata(
            &project,
            "https://different.supabase.co",
            tables,
            migrations,
        )
        .is_err());
    }
}
