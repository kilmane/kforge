use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

const MAX_PACKAGE_JSON_BYTES: u64 = 256_000;
const MAX_ENV_FILE_BYTES: u64 = 64_000;
const MAX_SOURCE_FILE_BYTES: u64 = 160_000;
const MAX_SOURCE_FILES: usize = 180;
const MAX_SOURCE_DEPTH: usize = 6;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningInspectionSnapshot {
    pub local: PlanningLocalInspection,
    pub remote: PlanningRemoteInspection,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningLocalInspection {
    pub application_name: String,
    pub application_root_name: String,
    pub framework: String,
    pub package_manager: String,
    pub source_files: Vec<String>,
    pub environment_variable_names: Vec<String>,
    pub existing_supabase_dependencies: Vec<String>,
    pub existing_supabase_client_files: Vec<String>,
    pub authentication_files: Vec<String>,
    pub persistence_files: Vec<String>,
    pub wiring_findings: PlanningWiringFindings,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningWiringFindings {
    pub entry_files: Vec<String>,
    pub react_state_files: Vec<String>,
    pub effect_files: Vec<String>,
    pub supabase_call_files: Vec<String>,
    pub auth_session_files: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningRemoteInspection {
    pub project_name: String,
    pub project_reference: String,
    pub project_api_url: String,
    pub tables: Vec<PlanningTable>,
    pub migrations: Vec<PlanningMigration>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningTable {
    pub name: String,
    pub rls_enabled: bool,
    pub columns: Vec<PlanningColumn>,
    pub primary_keys: Vec<String>,
    pub foreign_keys: Vec<PlanningForeignKey>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningColumn {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub unique: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningForeignKey {
    pub name: String,
    pub source_columns: Vec<String>,
    pub target_table: String,
    pub target_columns: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningMigration {
    pub version: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
struct PackageManifest {
    name: Option<String>,
    #[serde(rename = "packageManager")]
    package_manager: Option<String>,
    #[serde(default)]
    dependencies: BTreeMap<String, serde_json::Value>,
    #[serde(rename = "devDependencies", default)]
    dev_dependencies: BTreeMap<String, serde_json::Value>,
}

pub fn inspect_local_application(project_path: &str) -> Result<PlanningLocalInspection, String> {
    let root = canonical_project_root(project_path)?;
    let root_name = root
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("open-project")
        .to_string();
    let manifest = read_package_manifest(&root)?;
    let dependencies = manifest
        .dependencies
        .keys()
        .chain(manifest.dev_dependencies.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let root_files = detected_root_files(&root);
    let framework = detect_framework(&dependencies, &root_files);
    let package_manager = detect_package_manager(manifest.package_manager.as_deref(), &root_files);

    let mut warnings = Vec::new();
    if framework != "vite-react" {
        warnings.push(if framework == "ambiguous" {
            "Multiple frontend frameworks were detected; local inspection remained read-only."
                .into()
        } else {
            "The open application is not a clearly detected Vite + React project.".into()
        });
    }
    if package_manager == "unknown" {
        warnings.push(
            "The package manager could not be determined from one unambiguous lockfile.".into(),
        );
    }

    let source_paths = collect_source_paths(&root, &mut warnings)?;
    let mut supabase_files = BTreeSet::new();
    let mut authentication_files = BTreeSet::new();
    let mut persistence_files = BTreeSet::new();
    let mut entry_files = BTreeSet::new();
    let mut react_state_files = BTreeSet::new();
    let mut effect_files = BTreeSet::new();
    let mut supabase_call_files = BTreeSet::new();
    let mut auth_session_files = BTreeSet::new();
    for relative in &source_paths {
        let absolute = root.join(relative.replace('/', std::path::MAIN_SEPARATOR_STR));
        let content = match read_bounded_text(&absolute, MAX_SOURCE_FILE_BYTES) {
            Ok(content) => content,
            Err(error) => {
                warnings.push(format!("{relative}: {error}"));
                continue;
            }
        };
        classify_source_file(
            relative,
            &content,
            &mut supabase_files,
            &mut authentication_files,
            &mut persistence_files,
            &mut entry_files,
            &mut react_state_files,
            &mut effect_files,
            &mut supabase_call_files,
            &mut auth_session_files,
        );
    }

    let environment_variable_names = inspect_environment_variable_names(&root, &mut warnings)?;
    let existing_supabase_dependencies = dependencies
        .iter()
        .filter(|name| name.starts_with("@supabase/"))
        .cloned()
        .collect::<Vec<_>>();
    let application_name = manifest
        .name
        .as_deref()
        .filter(|value| is_bounded_text(value, 160))
        .unwrap_or(&root_name)
        .to_string();

    warnings.sort();
    warnings.dedup();
    Ok(PlanningLocalInspection {
        application_name,
        application_root_name: root_name,
        framework: framework.into(),
        package_manager,
        source_files: source_paths,
        environment_variable_names,
        existing_supabase_dependencies,
        existing_supabase_client_files: supabase_files.into_iter().collect(),
        authentication_files: authentication_files.into_iter().collect(),
        persistence_files: persistence_files.into_iter().collect(),
        wiring_findings: PlanningWiringFindings {
            entry_files: entry_files.into_iter().collect(),
            react_state_files: react_state_files.into_iter().collect(),
            effect_files: effect_files.into_iter().collect(),
            supabase_call_files: supabase_call_files.into_iter().collect(),
            auth_session_files: auth_session_files.into_iter().collect(),
        },
        warnings,
    })
}

fn canonical_project_root(project_path: &str) -> Result<PathBuf, String> {
    let trimmed = project_path.trim();
    if trimmed.is_empty() {
        return Err("An open application path is required for planning".into());
    }
    let root = fs::canonicalize(trimmed)
        .map_err(|_| "The open application path could not be inspected".to_string())?;
    if !root.is_dir() {
        return Err("The open application path is not a directory".into());
    }
    Ok(root)
}

fn read_package_manifest(root: &Path) -> Result<PackageManifest, String> {
    let path = root.join("package.json");
    let content = read_bounded_text(&path, MAX_PACKAGE_JSON_BYTES)
        .map_err(|error| format!("package.json could not be inspected safely: {error}"))?;
    serde_json::from_str(&content)
        .map_err(|_| "package.json is malformed and cannot be used for planning".into())
}

fn detected_root_files(root: &Path) -> BTreeSet<String> {
    const CANDIDATES: &[&str] = &[
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "bun.lock",
        "bun.lockb",
        "vite.config.js",
        "vite.config.jsx",
        "vite.config.ts",
        "vite.config.tsx",
        "vite.config.mjs",
        "vite.config.cjs",
        "next.config.js",
        "next.config.mjs",
        "next.config.ts",
        "nuxt.config.js",
        "nuxt.config.ts",
        "svelte.config.js",
    ];
    CANDIDATES
        .iter()
        .filter(|name| root.join(name).is_file())
        .map(|name| (*name).to_string())
        .collect()
}

fn detect_framework(
    dependencies: &BTreeSet<String>,
    root_files: &BTreeSet<String>,
) -> &'static str {
    let has_react = dependencies.contains("react");
    let has_vite = dependencies.contains("vite")
        || root_files
            .iter()
            .any(|name| name.starts_with("vite.config."));
    let has_other = dependencies.contains("next")
        || dependencies.contains("vue")
        || dependencies.contains("svelte")
        || dependencies.contains("@angular/core")
        || root_files.iter().any(|name| {
            name.starts_with("next.config.")
                || name.starts_with("nuxt.config.")
                || name.starts_with("svelte.config.")
        });

    if has_react && has_vite && !has_other {
        "vite-react"
    } else if has_react && has_vite && has_other {
        "ambiguous"
    } else {
        "unsupported"
    }
}

fn detect_package_manager(declared: Option<&str>, root_files: &BTreeSet<String>) -> String {
    let managers = [
        ("pnpm-lock.yaml", "pnpm"),
        ("package-lock.json", "npm"),
        ("yarn.lock", "yarn"),
        ("bun.lock", "bun"),
        ("bun.lockb", "bun"),
    ]
    .into_iter()
    .filter(|(file, _)| root_files.contains(*file))
    .map(|(_, manager)| manager)
    .collect::<BTreeSet<_>>();

    if managers.len() == 1 {
        return managers.iter().next().unwrap_or(&"unknown").to_string();
    }
    if managers.len() > 1 {
        return "unknown".into();
    }
    let declared_manager = declared
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase()
        .split('@')
        .next()
        .unwrap_or_default()
        .to_string();
    if ["pnpm", "npm", "yarn", "bun"].contains(&declared_manager.as_str()) {
        declared_manager
    } else {
        "unknown".into()
    }
}

fn collect_source_paths(root: &Path, warnings: &mut Vec<String>) -> Result<Vec<String>, String> {
    let source_root = root.join("src");
    if !source_root.is_dir() {
        warnings.push("No src directory was available for local application inspection.".into());
        return Ok(Vec::new());
    }
    let mut paths = Vec::new();
    walk_source_directory(root, &source_root, 0, &mut paths)?;
    paths.sort();
    Ok(paths)
}

fn walk_source_directory(
    root: &Path,
    directory: &Path,
    depth: usize,
    paths: &mut Vec<String>,
) -> Result<(), String> {
    if depth > MAX_SOURCE_DEPTH {
        return Ok(());
    }
    let mut entries = fs::read_dir(directory)
        .map_err(|_| "The source tree could not be inspected safely".to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "The source tree contained an unreadable entry".to_string())?;
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        if paths.len() >= MAX_SOURCE_FILES {
            return Err("The source tree exceeded the bounded planning file limit".into());
        }
        let file_type = entry
            .file_type()
            .map_err(|_| "A source entry type could not be inspected".to_string())?;
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            walk_source_directory(root, &entry.path(), depth + 1, paths)?;
            continue;
        }
        if !file_type.is_file() || !is_relevant_source_extension(&entry.path()) {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|_| "A source path escaped the open application".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        if !is_bounded_application_path(&relative) {
            return Err("A source path was outside the planning boundary".into());
        }
        paths.push(relative);
    }
    Ok(())
}

fn is_relevant_source_extension(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|value| value.to_str()),
        Some("js" | "jsx" | "ts" | "tsx")
    )
}

fn inspect_environment_variable_names(
    root: &Path,
    warnings: &mut Vec<String>,
) -> Result<Vec<String>, String> {
    let mut env_files = fs::read_dir(root)
        .map_err(|_| "The application root could not be inspected".to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "The application root contained an unreadable entry".to_string())?;
    env_files.sort_by_key(|entry| entry.file_name());
    let mut names = BTreeSet::new();

    for entry in env_files {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !(file_name == ".env" || file_name.starts_with(".env.")) {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|_| "An environment file type could not be inspected".to_string())?;
        if !file_type.is_file() || file_type.is_symlink() {
            continue;
        }
        let content = match read_bounded_text(&entry.path(), MAX_ENV_FILE_BYTES) {
            Ok(content) => content,
            Err(error) => {
                warnings.push(format!("{file_name}: {error}"));
                continue;
            }
        };
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            let assignment = trimmed.strip_prefix("export ").unwrap_or(trimmed);
            let Some((name, _value)) = assignment.split_once('=') else {
                continue;
            };
            let name = name.trim();
            if is_environment_variable_name(name) {
                names.insert(name.to_string());
            }
        }
    }
    Ok(names.into_iter().take(80).collect())
}

fn classify_source_file(
    relative: &str,
    content: &str,
    supabase_files: &mut BTreeSet<String>,
    authentication_files: &mut BTreeSet<String>,
    persistence_files: &mut BTreeSet<String>,
    entry_files: &mut BTreeSet<String>,
    react_state_files: &mut BTreeSet<String>,
    effect_files: &mut BTreeSet<String>,
    supabase_call_files: &mut BTreeSet<String>,
    auth_session_files: &mut BTreeSet<String>,
) {
    let path_lower = relative.to_ascii_lowercase();
    let content_lower = content.to_ascii_lowercase();

    if matches!(
        path_lower.as_str(),
        "src/main.js"
            | "src/main.jsx"
            | "src/main.ts"
            | "src/main.tsx"
            | "src/index.js"
            | "src/index.jsx"
            | "src/index.ts"
            | "src/index.tsx"
    ) {
        entry_files.insert(relative.to_string());
    }
    if content_lower.contains("usestate(") || content_lower.contains("usereducer(") {
        react_state_files.insert(relative.to_string());
    }
    if content_lower.contains("useeffect(") {
        effect_files.insert(relative.to_string());
    }

    if path_lower.contains("supabase")
        || content_lower.contains("@supabase/supabase-js")
        || content_lower.contains("createclient(")
    {
        supabase_files.insert(relative.to_string());
    }
    if path_lower.contains("auth")
        || path_lower.contains("login")
        || path_lower.contains("session")
        || content_lower.contains(".auth.")
        || content_lower.contains("signin")
        || content_lower.contains("signout")
    {
        authentication_files.insert(relative.to_string());
    }
    if path_lower.contains("progress")
        || path_lower.contains("persistence")
        || path_lower.contains("store")
        || content_lower.contains("localstorage")
        || content_lower.contains("indexeddb")
        || content_lower.contains(".from(")
    {
        persistence_files.insert(relative.to_string());
    }
    if content_lower.contains(".from(")
        || content_lower.contains(".rpc(")
        || content_lower.contains(".storage.")
        || content_lower.contains(".functions.")
    {
        supabase_call_files.insert(relative.to_string());
    }
    if content_lower.contains(".auth.")
        || content_lower.contains("getsession(")
        || content_lower.contains("onauthstatechange(")
        || content_lower.contains("signin")
        || content_lower.contains("signout")
    {
        auth_session_files.insert(relative.to_string());
    }
}

fn read_bounded_text(path: &Path, max_bytes: u64) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|_| "file is unavailable".to_string())?;
    if !metadata.is_file() || metadata.len() > max_bytes {
        return Err("file exceeded the read-only inspection size limit".into());
    }
    fs::read_to_string(path).map_err(|_| "file is not valid UTF-8 text".into())
}

fn is_bounded_application_path(value: &str) -> bool {
    if value.is_empty()
        || value.len() > 220
        || value.starts_with('/')
        || value.contains('\\')
        || value
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
    {
        return false;
    }
    value.starts_with("src/") || value.starts_with("public/")
}

fn is_environment_variable_name(value: &str) -> bool {
    let mut characters = value.chars();
    matches!(characters.next(), Some(first) if first.is_ascii_uppercase())
        && value.len() <= 100
        && characters.all(|character| {
            character.is_ascii_uppercase() || character.is_ascii_digit() || character == '_'
        })
}

fn is_bounded_text(value: &str, max_length: usize) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty() && trimmed.len() <= max_length && !trimmed.contains('\0')
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::inspect_local_application;

    #[test]
    fn inspects_vite_react_without_exposing_environment_values_or_writing() {
        let project = tempdir().unwrap();
        fs::create_dir_all(project.path().join("src/lib")).unwrap();
        fs::create_dir_all(project.path().join("src/auth")).unwrap();
        fs::write(
            project.path().join("package.json"),
            r#"{
                "name": "hajj-companion",
                "dependencies": {
                    "react": "^18.2.0",
                    "@supabase/supabase-js": "^2.0.0"
                },
                "devDependencies": { "vite": "^7.0.0" }
            }"#,
        )
        .unwrap();
        fs::write(project.path().join("pnpm-lock.yaml"), "lockfileVersion: 9").unwrap();
        fs::write(project.path().join("vite.config.js"), "export default {}").unwrap();
        fs::write(
            project.path().join("src/lib/supabaseClient.js"),
            "import { createClient } from '@supabase/supabase-js';",
        )
        .unwrap();
        fs::write(
            project.path().join("src/main.jsx"),
            "import { createRoot } from 'react-dom/client';",
        )
        .unwrap();
        fs::write(
            project.path().join("src/App.jsx"),
            "import { useEffect, useState } from 'react'; export function App() { const [items, setItems] = useState([]); useEffect(() => { setItems([]); }, []); return items.length; }",
        )
        .unwrap();
        fs::write(
            project.path().join("src/lib/data.js"),
            "export async function loadRows(supabase) { return supabase.from('items').select('*'); }",
        )
        .unwrap();
        fs::write(
            project.path().join("src/auth/session.js"),
            "export async function readSession(supabase) { const { data } = await supabase.auth.getSession(); return data; } export function watchSession(supabase) { return supabase.auth.onAuthStateChange(() => {}); }",
        )
        .unwrap();
        let env_contents =
            "VITE_SUPABASE_URL=https://example.supabase.co\nSUPABASE_PASSWORD=never-return-this\n";
        fs::write(project.path().join(".env.local"), env_contents).unwrap();

        let inspection =
            inspect_local_application(project.path().to_string_lossy().as_ref()).unwrap();

        assert_eq!(inspection.application_name, "hajj-companion");
        assert_eq!(inspection.framework, "vite-react");
        assert_eq!(inspection.package_manager, "pnpm");
        assert_eq!(
            inspection.existing_supabase_dependencies,
            vec!["@supabase/supabase-js"]
        );
        assert_eq!(
            inspection.existing_supabase_client_files,
            vec!["src/lib/supabaseClient.js"]
        );
        assert_eq!(inspection.authentication_files, vec!["src/auth/session.js"]);
        assert_eq!(inspection.persistence_files, vec!["src/lib/data.js"]);
        assert_eq!(inspection.wiring_findings.entry_files, vec!["src/main.jsx"]);
        assert_eq!(
            inspection.wiring_findings.react_state_files,
            vec!["src/App.jsx"]
        );
        assert_eq!(inspection.wiring_findings.effect_files, vec!["src/App.jsx"]);
        assert_eq!(
            inspection.wiring_findings.supabase_call_files,
            vec!["src/lib/data.js"]
        );
        assert_eq!(
            inspection.wiring_findings.auth_session_files,
            vec!["src/auth/session.js"]
        );
        assert_eq!(
            inspection.environment_variable_names,
            vec!["SUPABASE_PASSWORD", "VITE_SUPABASE_URL"]
        );
        assert_eq!(
            fs::read_to_string(project.path().join(".env.local")).unwrap(),
            env_contents
        );
        assert!(!serde_json::to_string(&inspection)
            .unwrap()
            .contains("never-return-this"));
    }

    #[test]
    fn reports_ambiguous_framework_and_package_manager_without_guessing() {
        let project = tempdir().unwrap();
        fs::create_dir(project.path().join("src")).unwrap();
        fs::write(
            project.path().join("package.json"),
            r#"{
                "name": "ambiguous",
                "dependencies": { "react": "1", "next": "1" },
                "devDependencies": { "vite": "1" }
            }"#,
        )
        .unwrap();
        fs::write(project.path().join("pnpm-lock.yaml"), "").unwrap();
        fs::write(project.path().join("package-lock.json"), "{}").unwrap();

        let inspection =
            inspect_local_application(project.path().to_string_lossy().as_ref()).unwrap();

        assert_eq!(inspection.framework, "ambiguous");
        assert_eq!(inspection.package_manager, "unknown");
        assert_eq!(inspection.warnings.len(), 2);
    }

    #[test]
    fn requires_a_directory_with_a_valid_bounded_package_manifest() {
        let project = tempdir().unwrap();
        assert!(inspect_local_application(project.path().to_string_lossy().as_ref()).is_err());

        let file = project.path().join("not-a-directory");
        fs::write(&file, "{}").unwrap();
        assert!(inspect_local_application(file.to_string_lossy().as_ref()).is_err());
    }
}
