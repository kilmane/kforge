use std::{
    collections::{HashMap, HashSet},
    sync::atomic::{AtomicU64, Ordering},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::RwLock;

use super::{
    inspection::PlanningRemoteInspection, looks_like_production_project, mcp, oauth,
    token_store::WindowsCredentialStore, SelectedProject, SupabaseAutopilotState,
};

const RECONCILIATION_VERSION: &str = "supabase-autopilot-reconciliation/v1";
const NOTHING_APPLIED_STATEMENT: &str =
    "Planning only: nothing was applied. SQL was not executed and no database or application changes were made.";

#[derive(Default)]
pub struct MutationApprovalState {
    pending: RwLock<HashMap<String, PendingApproval>>,
    sequence: AtomicU64,
}

#[derive(Clone)]
struct PendingApproval {
    project_reference: String,
    project_name: String,
    reconciliation_fingerprint: String,
    migration_name: String,
    sql: String,
    changes: Vec<AdditiveChange>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrepareMigrationApprovalRequest {
    reconciliation: Value,
    confirmed_development_project_reference: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedMigrationApproval {
    approval_token: String,
    project_reference: String,
    migration_name: String,
    reconciliation_fingerprint: String,
}

#[derive(Debug, Serialize)]
pub struct ApplyMigrationResponse {
    status: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "operation", rename_all = "kebab-case", deny_unknown_fields)]
enum AdditiveChange {
    CreateTable {
        table: String,
        columns: Vec<MigrationColumn>,
        #[serde(rename = "primaryKeys")]
        primary_keys: Vec<String>,
        #[serde(rename = "foreignKeys")]
        foreign_keys: Vec<MigrationForeignKey>,
    },
    AddColumn {
        table: String,
        column: MigrationColumn,
    },
    EnableRls {
        table: String,
    },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MigrationColumn {
    name: String,
    data_type: String,
    nullable: bool,
    unique: bool,
    safe_to_add_to_existing: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MigrationForeignKey {
    name: String,
    source_columns: Vec<String>,
    target_table: String,
    target_columns: Vec<String>,
}

struct ValidatedMigration {
    project_reference: String,
    project_name: String,
    reconciliation_fingerprint: String,
    migration_name: String,
    sql: String,
    changes: Vec<AdditiveChange>,
}

impl MutationApprovalState {
    pub async fn clear_pending(&self) {
        self.pending.write().await.clear();
    }

    async fn peek(&self, token: &str) -> Result<PendingApproval, String> {
        self.pending
            .read()
            .await
            .get(token)
            .cloned()
            .ok_or_else(|| "The migration approval is missing, stale, or already consumed".into())
    }

    async fn consume(&self, token: &str) -> Result<PendingApproval, String> {
        self.pending
            .write()
            .await
            .remove(token)
            .ok_or_else(|| "The migration approval is missing, stale, or already consumed".into())
    }
}

#[tauri::command]
pub async fn supabase_autopilot_prepare_migration_approval(
    request: PrepareMigrationApprovalRequest,
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<PreparedMigrationApproval, String> {
    let _operation = state.operation.lock().await;
    let selected = selected_development_project(&state).await?;
    if request.confirmed_development_project_reference != selected.reference {
        return Err(
            "Explicit development-only confirmation must match the selected project".into(),
        );
    }
    let validated = validate_reconciliation(&request.reconciliation, &selected)?;
    let remote = inspect_read_only(&selected).await?;
    ensure_fresh_additive_state(&validated, &remote)?;

    state.mutation.clear_pending().await;
    let sequence = state.mutation.sequence.fetch_add(1, Ordering::Relaxed) + 1;
    let token_material = format!(
        "{}:{}:{}:{}",
        validated.project_reference,
        validated.reconciliation_fingerprint,
        validated.migration_name,
        sequence
    );
    let approval_token = format!(
        "approval-{}-{:016x}",
        sequence,
        fnv1a64(token_material.encode_utf16())
    );
    state.mutation.pending.write().await.insert(
        approval_token.clone(),
        PendingApproval {
            project_reference: validated.project_reference.clone(),
            project_name: validated.project_name,
            reconciliation_fingerprint: validated.reconciliation_fingerprint.clone(),
            migration_name: validated.migration_name.clone(),
            sql: validated.sql,
            changes: validated.changes,
        },
    );

    Ok(PreparedMigrationApproval {
        approval_token,
        project_reference: validated.project_reference,
        migration_name: validated.migration_name,
        reconciliation_fingerprint: validated.reconciliation_fingerprint,
    })
}

#[tauri::command]
pub async fn supabase_autopilot_apply_approved_migration(
    app: tauri::AppHandle,
    approval_token: String,
    state: tauri::State<'_, SupabaseAutopilotState>,
) -> Result<ApplyMigrationResponse, String> {
    let _operation = state.operation.lock().await;
    let token = approval_token.trim();
    if token.is_empty() || token.len() > 160 {
        return Err("A valid approved migration token is required".into());
    }

    let approval = state.mutation.peek(token).await?;

    let selected = selected_development_project(&state).await?;
    if selected.reference != approval.project_reference || selected.name != approval.project_name {
        return Err("The selected project changed after migration approval".into());
    }

    let remote = inspect_read_only(&selected).await?;
    ensure_pending_approval_is_fresh(&approval, &remote)?;

    let mutation_url =
        mcp::project_mutation_url(&selected.reference).map_err(|error| oauth::redact_sensitive(&error))?;
    oauth::authorize_database_write(&app, &mutation_url, WindowsCredentialStore)
        .await
        .map_err(|error| oauth::redact_sensitive(&error))?;

    let remote = inspect_read_only(&selected).await?;
    ensure_pending_approval_is_fresh(&approval, &remote)?;

    let approval = state.mutation.consume(token).await?;

    mcp::apply_approved_migration(
        &selected,
        &approval.migration_name,
        &approval.sql,
        WindowsCredentialStore,
    )
    .await
    .map_err(redact_restore_error)?;

    Ok(ApplyMigrationResponse {
        status: "applied-awaiting-verification".into(),
    })
}

async fn selected_development_project(
    state: &SupabaseAutopilotState,
) -> Result<SelectedProject, String> {
    let selected = state
        .selected
        .read()
        .await
        .clone()
        .ok_or_else(|| "Connect and verify a Supabase project first".to_string())?;
    if looks_like_production_project(&selected.name) {
        return Err("Production or live projects cannot receive mutations".into());
    }
    Ok(selected)
}

async fn inspect_read_only(selected: &SelectedProject) -> Result<PlanningRemoteInspection, String> {
    mcp::inspect_project_for_planning(selected, WindowsCredentialStore)
        .await
        .map_err(redact_restore_error)
}

fn redact_restore_error(error: mcp::RestoreError) -> String {
    match error {
        mcp::RestoreError::AuthorizationRequired => {
            "The Supabase session must be reauthorized before continuing".into()
        }
        mcp::RestoreError::Failed(error) => oauth::redact_sensitive(&error),
    }
}

fn validate_reconciliation(
    value: &Value,
    selected: &SelectedProject,
) -> Result<ValidatedMigration, String> {
    let encoded = serde_json::to_vec(value)
        .map_err(|_| "The reconciliation could not be bounded".to_string())?;
    if encoded.len() > 250_000 {
        return Err("The reconciliation exceeded the mutation size limit".into());
    }
    inspect_unsafe_value(value, 0)?;
    let object = value
        .as_object()
        .ok_or_else(|| "The approved reconciliation must be an object".to_string())?;
    if require_string(object.get("schemaVersion"), 80)? != RECONCILIATION_VERSION {
        return Err("The reconciliation version is unsupported".into());
    }
    if object.get("canApply").and_then(Value::as_bool) != Some(false)
        || object.get("executionStatus").and_then(Value::as_str) != Some("not-applied")
        || object.get("status").and_then(Value::as_str) != Some("additive-proposal")
        || object
            .get("nothingAppliedStatement")
            .and_then(Value::as_str)
            != Some(NOTHING_APPLIED_STATEMENT)
    {
        return Err("Only a planning-only additive reconciliation can be approved".into());
    }
    for field in [
        "findings",
        "warnings",
        "limitations",
        "manualReview",
        "conflicts",
        "proposedAdditiveChanges",
    ] {
        if !object.get(field).is_some_and(Value::is_array) {
            return Err(format!("Reconciliation field '{field}' is malformed"));
        }
    }
    if !object["manualReview"].as_array().unwrap().is_empty()
        || !object["conflicts"].as_array().unwrap().is_empty()
    {
        return Err("Manual-review or conflicting reconciliations cannot be approved".into());
    }

    let fingerprint = require_fingerprint(object.get("fingerprint"))?;
    let _source_fingerprint = require_fingerprint(object.get("sourcePlanFingerprint"))?;
    let mut without_fingerprint = object.clone();
    without_fingerprint.remove("fingerprint");
    if fingerprint_value(&Value::Object(without_fingerprint)) != fingerprint {
        return Err("Reconciliation fingerprint does not match its contents".into());
    }

    let project = object
        .get("selectedProject")
        .and_then(Value::as_object)
        .ok_or_else(|| "Selected project identity is malformed".to_string())?;
    let project_reference = require_identifier(project.get("reference"), 80)?;
    let project_name = require_string(project.get("name"), 160)?;
    if project_reference != selected.reference || project_name != selected.name {
        return Err("The reconciliation does not match the selected project".into());
    }

    let migration = object
        .get("proposedMigration")
        .and_then(Value::as_object)
        .ok_or_else(|| "Managed migration identity is malformed".to_string())?;
    let migration_name = require_identifier(migration.get("name"), 120)?;
    if migration.get("identity").and_then(Value::as_str) != Some(&migration_name)
        || migration.get("status").and_then(Value::as_str) != Some("unused")
        || !migration_name.starts_with("supabase_autopilot_")
        || migration_name.len() != 31
        || !migration_name[19..]
            .chars()
            .all(|character| matches!(character, '0'..='9' | 'a'..='f'))
    {
        return Err("Only an unused deterministic managed migration can be approved".into());
    }
    let planning_version = require_identifier(migration.get("version"), 120)?;
    if planning_version.len() != 14
        || !planning_version
            .chars()
            .all(|character| character.is_ascii_digit())
    {
        return Err("Managed migration planning metadata is malformed".into());
    }

    let changes: Vec<AdditiveChange> = serde_json::from_value(
        object
            .get("proposedAdditiveChanges")
            .cloned()
            .ok_or_else(|| "Proposed additive changes are missing".to_string())?,
    )
    .map_err(|_| "Proposed additive changes are malformed".to_string())?;
    if changes.is_empty() || changes.len() > 400 {
        return Err("At least one bounded additive change is required".into());
    }
    validate_changes(&changes)?;
    let sql = require_string(object.get("sqlDraft"), 30_000)?;
    let expected_sql = render_review_sql(&changes)?;
    if sql != expected_sql {
        return Err("Approved SQL does not exactly match the additive reconciliation".into());
    }

    Ok(ValidatedMigration {
        project_reference,
        project_name,
        reconciliation_fingerprint: fingerprint,
        migration_name,
        sql,
        changes,
    })
}

fn ensure_fresh_additive_state(
    validated: &ValidatedMigration,
    remote: &PlanningRemoteInspection,
) -> Result<(), String> {
    if remote.project_reference != validated.project_reference {
        return Err("Fresh read-only inspection returned a different project".into());
    }
    if remote
        .migrations
        .iter()
        .any(|migration| migration.name == validated.migration_name)
    {
        return Err("The managed migration name is already present remotely".into());
    }
    verify_additive_targets(&validated.changes, remote)
}

fn ensure_pending_approval_is_fresh(
    approval: &PendingApproval,
    remote: &PlanningRemoteInspection,
) -> Result<(), String> {
    if remote.project_reference != approval.project_reference {
        return Err("Fresh read-only inspection returned a different project".into());
    }
    if remote
        .migrations
        .iter()
        .any(|migration| migration.name == approval.migration_name)
    {
        return Err("The managed migration name became present after approval".into());
    }
    if !is_fingerprint(&approval.reconciliation_fingerprint) {
        return Err("The consumed approval fingerprint is invalid".into());
    }
    verify_additive_targets(&approval.changes, remote)
}

fn verify_additive_targets(
    changes: &[AdditiveChange],
    remote: &PlanningRemoteInspection,
) -> Result<(), String> {
    for change in changes {
        match change {
            AdditiveChange::CreateTable { table, .. } => {
                if remote.tables.iter().any(|item| &item.name == table) {
                    return Err(format!(
                        "Approved create-table target '{table}' is no longer absent"
                    ));
                }
            }
            AdditiveChange::AddColumn { table, column } => {
                let remote_table = remote
                    .tables
                    .iter()
                    .find(|item| &item.name == table)
                    .ok_or_else(|| format!("Approved table '{table}' is no longer present"))?;
                if remote_table
                    .columns
                    .iter()
                    .any(|item| item.name == column.name)
                {
                    return Err(format!(
                        "Approved column '{}.{}' is no longer absent",
                        table, column.name
                    ));
                }
            }
            AdditiveChange::EnableRls { table } => {
                let remote_table = remote
                    .tables
                    .iter()
                    .find(|item| &item.name == table)
                    .ok_or_else(|| format!("Approved table '{table}' is no longer present"))?;
                if remote_table.rls_enabled {
                    return Err(format!("RLS is already enabled on '{table}'"));
                }
            }
        }
    }
    Ok(())
}

fn validate_changes(changes: &[AdditiveChange]) -> Result<(), String> {
    for change in changes {
        match change {
            AdditiveChange::CreateTable {
                table,
                columns,
                primary_keys,
                foreign_keys,
            } => {
                quote_database_name(table)?;
                if columns.is_empty()
                    || columns.len() > 80
                    || primary_keys.len() > 20
                    || foreign_keys.len() > 40
                {
                    return Err("Create-table change exceeded bounded limits".into());
                }
                let mut column_names = HashSet::new();
                for column in columns {
                    validate_column(column)?;
                    if !column_names.insert(column.name.as_str()) {
                        return Err("Create-table change contains duplicate columns".into());
                    }
                }
                if primary_keys
                    .iter()
                    .any(|key| !column_names.contains(key.as_str()))
                {
                    return Err("Create-table primary key is invalid".into());
                }
                for foreign_key in foreign_keys {
                    quote_identifier(&foreign_key.name)?;
                    quote_database_name(&foreign_key.target_table)?;
                    if foreign_key.source_columns.is_empty()
                        || foreign_key.source_columns.len() != foreign_key.target_columns.len()
                        || foreign_key
                            .source_columns
                            .iter()
                            .any(|column| !column_names.contains(column.as_str()))
                    {
                        return Err("Create-table foreign key is invalid".into());
                    }
                    for column in &foreign_key.target_columns {
                        quote_identifier(column)?;
                    }
                }
            }
            AdditiveChange::AddColumn { table, column } => {
                quote_database_name(table)?;
                validate_column(column)?;
                if !column.nullable || column.unique || !column.safe_to_add_to_existing {
                    return Err("Only proven-safe nullable column additions are allowed".into());
                }
            }
            AdditiveChange::EnableRls { table } => {
                quote_database_name(table)?;
            }
        }
    }
    Ok(())
}

fn validate_column(column: &MigrationColumn) -> Result<(), String> {
    quote_identifier(&column.name)?;
    render_data_type(&column.data_type)?;
    Ok(())
}

fn render_review_sql(changes: &[AdditiveChange]) -> Result<String, String> {
    let mut statements = vec![
        "-- PLANNING ONLY: review artifact; SQL has not been executed.".to_string(),
        "-- No database or application changes were made by Supabase Autopilot.".to_string(),
    ];
    for change in changes {
        statements.push(match change {
            AdditiveChange::CreateTable {
                table,
                columns,
                primary_keys,
                foreign_keys,
            } => {
                let mut definitions = columns
                    .iter()
                    .map(|column| {
                        Ok(format!(
                            "  {} {}{}{}",
                            quote_identifier(&column.name)?,
                            render_data_type(&column.data_type)?,
                            if column.nullable { "" } else { " NOT NULL" },
                            if column.unique { " UNIQUE" } else { "" }
                        ))
                    })
                    .collect::<Result<Vec<_>, String>>()?;
                if !primary_keys.is_empty() {
                    definitions.push(format!(
                        "  PRIMARY KEY ({})",
                        primary_keys
                            .iter()
                            .map(|value| quote_identifier(value))
                            .collect::<Result<Vec<_>, _>>()?
                            .join(", ")
                    ));
                }
                for foreign_key in foreign_keys {
                    definitions.push(format!(
                        "  CONSTRAINT {} FOREIGN KEY ({}) REFERENCES {} ({})",
                        quote_identifier(&foreign_key.name)?,
                        foreign_key
                            .source_columns
                            .iter()
                            .map(|value| quote_identifier(value))
                            .collect::<Result<Vec<_>, _>>()?
                            .join(", "),
                        quote_database_name(&foreign_key.target_table)?,
                        foreign_key
                            .target_columns
                            .iter()
                            .map(|value| quote_identifier(value))
                            .collect::<Result<Vec<_>, _>>()?
                            .join(", ")
                    ));
                }
                format!(
                    "CREATE TABLE {} (\n{}\n);",
                    quote_database_name(table)?,
                    definitions.join(",\n")
                )
            }
            AdditiveChange::AddColumn { table, column } => format!(
                "ALTER TABLE {} ADD COLUMN {} {};",
                quote_database_name(table)?,
                quote_identifier(&column.name)?,
                render_data_type(&column.data_type)?
            ),
            AdditiveChange::EnableRls { table } => format!(
                "ALTER TABLE {} ENABLE ROW LEVEL SECURITY;",
                quote_database_name(table)?
            ),
        });
    }
    Ok(statements.join("\n\n"))
}

fn quote_database_name(value: &str) -> Result<String, String> {
    let parts = value.split('.').collect::<Vec<_>>();
    if parts.len() != 2 {
        return Err("Database table name must contain one schema and table".into());
    }
    Ok(format!(
        "{}.{}",
        quote_identifier(parts[0])?,
        quote_identifier(parts[1])?
    ))
}

fn quote_identifier(value: &str) -> Result<String, String> {
    if value.is_empty()
        || value.len() > 63
        || value.contains('.')
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "_$-".contains(character))
    {
        return Err("SQL identifier is invalid".into());
    }
    Ok(format!("\"{value}\""))
}

fn render_data_type(value: &str) -> Result<&'static str, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "bigint" | "int8" => Ok("bigint"),
        "bool" | "boolean" => Ok("boolean"),
        "date" => Ok("date"),
        "int4" | "integer" => Ok("integer"),
        "jsonb" => Ok("jsonb"),
        "text" => Ok("text"),
        "timestamp with time zone" | "timestamptz" => Ok("timestamptz"),
        "uuid" => Ok("uuid"),
        "varchar" => Ok("varchar"),
        _ => Err("SQL data type is unsupported".into()),
    }
}

fn require_fingerprint(value: Option<&Value>) -> Result<String, String> {
    let value = require_string(value, 24)?;
    if !is_fingerprint(&value) {
        return Err("Reconciliation fingerprint is invalid".into());
    }
    Ok(value)
}

fn is_fingerprint(value: &str) -> bool {
    value.len() == 24
        && value.starts_with("fnv1a64-")
        && value[8..]
            .chars()
            .all(|character| matches!(character, '0'..='9' | 'a'..='f'))
}

fn require_identifier(value: Option<&Value>, max_length: usize) -> Result<String, String> {
    let value = require_string(value, max_length)?;
    if value.is_empty()
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "_.$-".contains(character))
    {
        return Err("A bounded identifier was invalid".into());
    }
    Ok(value)
}

fn require_string(value: Option<&Value>, max_length: usize) -> Result<String, String> {
    let value = value
        .and_then(Value::as_str)
        .ok_or_else(|| "A required bounded string was missing".to_string())?;
    if value.is_empty() || value.len() > max_length || value.contains('\0') {
        return Err("A required bounded string was invalid".into());
    }
    Ok(value.to_string())
}

fn inspect_unsafe_value(value: &Value, depth: usize) -> Result<(), String> {
    if depth > 16 {
        return Err("Reconciliation nesting exceeded its limit".into());
    }
    match value {
        Value::Object(object) => {
            for (key, nested) in object {
                let normalized = key.to_ascii_lowercase().replace('-', "_");
                if [
                    "access_token",
                    "refresh_token",
                    "password",
                    "secret",
                    "service_role",
                    "service_role_key",
                    "database_url",
                    "private_key",
                    "api_key",
                ]
                .iter()
                .any(|blocked| normalized.contains(blocked))
                {
                    return Err(format!("Secret-bearing field '{key}' is not allowed"));
                }
                if matches!(
                    normalized.as_str(),
                    "row" | "rows" | "rowdata" | "rowcontents" | "records" | "recordcontents"
                ) {
                    return Err(format!("Database row content field '{key}' is not allowed"));
                }
                inspect_unsafe_value(nested, depth + 1)?;
            }
        }
        Value::Array(items) => {
            for item in items {
                inspect_unsafe_value(item, depth + 1)?;
            }
        }
        Value::String(text) if looks_like_secret(text) => {
            return Err("Secret-like content is not allowed in mutation state".into());
        }
        _ => {}
    }
    Ok(())
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
            .is_some_and(|(_, authority)| authority.contains('@') && authority.contains(':'))
}

fn fingerprint_value(value: &Value) -> String {
    let serialized = stable_stringify(value);
    format!(
        "fnv1a64-{:08x}{:08x}",
        fnv1a32(serialized.encode_utf16(), 0x811c9dc5),
        fnv1a32(serialized.encode_utf16(), 0x9e3779b9)
    )
}

fn stable_stringify(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::String(value) => serde_json::to_string(value).unwrap_or_default(),
        Value::Array(items) => format!(
            "[{}]",
            items
                .iter()
                .map(stable_stringify)
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Object(object) => {
            let mut keys = object.keys().collect::<Vec<_>>();
            keys.sort();
            format!(
                "{{{}}}",
                keys.iter()
                    .map(|key| format!(
                        "{}:{}",
                        serde_json::to_string(key).unwrap_or_default(),
                        stable_stringify(object.get(*key).expect("stable object key must exist"),)
                    ))
                    .collect::<Vec<_>>()
                    .join(",")
            )
        }
    }
}

fn fnv1a32<I>(input: I, seed: u32) -> u32
where
    I: IntoIterator<Item = u16>,
{
    input.into_iter().fold(seed, |hash, value| {
        (hash ^ u32::from(value)).wrapping_mul(0x01000193)
    })
}

fn fnv1a64<I>(input: I) -> u64
where
    I: IntoIterator<Item = u16>,
{
    input.into_iter().fold(0xcbf29ce484222325, |hash, value| {
        (hash ^ u64::from(value)).wrapping_mul(0x100000001b3)
    })
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::{
        fingerprint_value, render_review_sql, validate_reconciliation, AdditiveChange,
        MutationApprovalState, PendingApproval, SelectedProject,
    };

    fn reconciliation(sql: &str) -> Value {
        let mut value = json!({
            "schemaVersion": "supabase-autopilot-reconciliation/v1",
            "sourcePlanFingerprint": "fnv1a64-1111111122222222",
            "selectedProject": {
                "name": "Hajj Development",
                "reference": "abcdefghijklmnopqrst"
            },
            "proposedMigration": {
                "version": "31234567890123",
                "name": "supabase_autopilot_111122222222",
                "identity": "supabase_autopilot_111122222222",
                "status": "unused"
            },
            "status": "additive-proposal",
            "findings": [],
            "proposedAdditiveChanges": [{
                "operation": "create-table",
                "table": "public.feature_records",
                "columns": [{
                    "name": "id",
                    "dataType": "uuid",
                    "nullable": false,
                    "unique": false,
                    "safeToAddToExisting": false
                }],
                "primaryKeys": ["id"],
                "foreignKeys": []
            }],
            "manualReview": [],
            "conflicts": [],
            "warnings": [],
            "limitations": [],
            "sqlDraft": sql,
            "canApply": false,
            "executionStatus": "not-applied",
            "nothingAppliedStatement": "Planning only: nothing was applied. SQL was not executed and no database or application changes were made."
        });
        let fingerprint = fingerprint_value(&value);
        value["fingerprint"] = Value::String(fingerprint);
        value
    }

    fn selected() -> SelectedProject {
        SelectedProject {
            name: "Hajj Development".into(),
            reference: "abcdefghijklmnopqrst".into(),
            api_url: "https://abcdefghijklmnopqrst.supabase.co".into(),
        }
    }

    #[test]
    fn approved_reconciliation_requires_exact_derived_additive_sql() {
        let changes: Vec<AdditiveChange> = serde_json::from_value(json!([{
            "operation": "create-table",
            "table": "public.feature_records",
            "columns": [{
                "name": "id",
                "dataType": "uuid",
                "nullable": false,
                "unique": false,
                "safeToAddToExisting": false
            }],
            "primaryKeys": ["id"],
            "foreignKeys": []
        }]))
        .unwrap();
        let sql = render_review_sql(&changes).unwrap();
        assert!(validate_reconciliation(&reconciliation(&sql), &selected()).is_ok());
        assert!(validate_reconciliation(
            &reconciliation("DROP TABLE public.feature_records;"),
            &selected()
        )
        .is_err());
    }

    #[test]
    fn mutation_contract_rejects_secrets_rows_and_changed_fingerprints() {
        let changes: Vec<AdditiveChange> = serde_json::from_value(json!([{
            "operation": "enable-rls",
            "table": "public.feature_records"
        }]))
        .unwrap();
        let sql = render_review_sql(&changes).unwrap();
        let mut secret = reconciliation(&sql);
        secret["access_token"] = json!("must-not-cross");
        let mut rows = reconciliation(&sql);
        rows["rows"] = json!([{"private": "must-not-cross"}]);
        let mut changed = reconciliation(&sql);
        changed["sqlDraft"] = json!("ALTER TABLE public.other ENABLE ROW LEVEL SECURITY;");

        assert!(validate_reconciliation(&secret, &selected()).is_err());
        assert!(validate_reconciliation(&rows, &selected()).is_err());
        assert!(validate_reconciliation(&changed, &selected()).is_err());
    }

    #[tokio::test]
    async fn one_approval_can_be_consumed_at_most_once() {
        let state = MutationApprovalState::default();
        let token = "approval-1-1111111122222222";
        state.pending.write().await.insert(
            token.into(),
            PendingApproval {
                project_reference: "abcdefghijklmnopqrst".into(),
                project_name: "Hajj Development".into(),
                reconciliation_fingerprint: "fnv1a64-1111111122222222".into(),
                migration_name: "supabase_autopilot_111122222222".into(),
                sql: "approved SQL".into(),
                changes: Vec::new(),
            },
        );

        assert!(state.peek(token).await.is_ok());
        assert!(state.peek(token).await.is_ok());
        assert!(state.consume(token).await.is_ok());
        assert!(state.peek(token).await.is_err());
        assert!(state.consume(token).await.is_err());
    }

    #[test]
    fn caller_supplied_planning_version_is_not_remote_mutation_identity() {
        let changes: Vec<AdditiveChange> = serde_json::from_value(json!([{
            "operation": "create-table",
            "table": "public.feature_records",
            "columns": [{
                "name": "id",
                "dataType": "uuid",
                "nullable": false,
                "unique": false,
                "safeToAddToExisting": false
            }],
            "primaryKeys": ["id"],
            "foreignKeys": []
        }]))
        .unwrap();
        let mut value = reconciliation(&render_review_sql(&changes).unwrap());
        value["proposedMigration"]["version"] = json!("39999999999999");
        value.as_object_mut().unwrap().remove("fingerprint");
        let fingerprint = fingerprint_value(&value);
        value["fingerprint"] = Value::String(fingerprint);

        let validated = validate_reconciliation(&value, &selected()).unwrap();
        assert_eq!(validated.migration_name, "supabase_autopilot_111122222222");
    }
}
