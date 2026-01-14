param(
    [string]$Milestone = "phase-3.2",
    [string]$ProjectDirName = "kforge"
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
    Write-Host "[kforge][backup] ERROR: $Message" -ForegroundColor Red
    exit 1
}

Write-Host "[kforge][backup] Starting backup (robocopy + Compress-Archive)..."

$CurrentDir = (Get-Location).Path
$ProjectRoot = $null
$OutputDir = $null

# Case 1: running from parent directory (contains \kforge)
if (Test-Path (Join-Path $CurrentDir $ProjectDirName)) {
    $ProjectRoot = Join-Path $CurrentDir $ProjectDirName
    $OutputDir = $CurrentDir
}
# Case 2: running from inside \kforge
elseif ((Split-Path $CurrentDir -Leaf).ToLower() -eq $ProjectDirName.ToLower()) {
    $ProjectRoot = $CurrentDir
    $OutputDir = Split-Path $CurrentDir -Parent
}
else {
    Fail "Run this script from the kforge folder or its parent directory."
}

$ZipName = "$ProjectDirName-$Milestone.zip"
$ZipPath = Join-Path $OutputDir $ZipName

Write-Host "[kforge][backup] Project root: $ProjectRoot"
Write-Host "[kforge][backup] Output zip  : $ZipPath"

if (Test-Path $ZipPath) {
    Fail "Backup already exists: $ZipName (will not overwrite). Delete or rename it first."
}

$StageRoot = Join-Path $OutputDir "_kforge_backup_stage"
$StageProject = Join-Path $StageRoot $ProjectDirName

# Clean any previous stage
if (Test-Path $StageRoot) {
    Write-Host "[kforge][backup] Removing previous staging folder..."
    cmd /c "rmdir /s /q `"$StageRoot`""
}

Write-Host "[kforge][backup] Creating staging folder: $StageProject"
New-Item -ItemType Directory -Path $StageProject | Out-Null

Write-Host "[kforge][backup] Staging with robocopy (fast, excludes applied)..."

# Robocopy excludes:
# /XD excludes directories (relative names are OK and apply anywhere in tree)
# We exclude:
# - node_modules
# - .git
# - target (covers src-tauri\target, and any other target dirs)
$RoboCmd = @(
    "robocopy",
    "`"$ProjectRoot`"",
    "`"$StageProject`"",
    "/E",
    "/XD", "node_modules", ".git", "target",
    "/R:1",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NP"
) -join " "

cmd /c $RoboCmd | Out-Null

# Robocopy exit codes 0-7 are "success with various conditions"
# 8+ indicates failure
$RoboExit = $LASTEXITCODE
if ($RoboExit -ge 8) {
    Fail "robocopy failed with exit code $RoboExit"
}

Write-Host "[kforge][backup] Creating zip from staging folder..."

Compress-Archive -Path $StageProject -DestinationPath $ZipPath -CompressionLevel Optimal -Force:$false

if (-not (Test-Path $ZipPath)) {
    Fail "Backup failed: zip file was not created."
}

$SizeBytes = (Get-Item $ZipPath).Length
$SizeMB = [Math]::Round($SizeBytes / 1MB, 2)

Write-Host "[kforge][backup] Backup complete." -ForegroundColor Green
Write-Host "[kforge][backup] Size: $SizeMB MB"

Write-Host "[kforge][backup] Quick archive structure check (first 20 entries)..."
$TarCmd = Get-Command tar -ErrorAction SilentlyContinue
if ($TarCmd) {
    tar -tf $ZipPath | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "[kforge][backup] (tar not available for listing zip contents)"
}

Write-Host ""
Write-Host "[kforge][backup] Cleaning staging folder..."
cmd /c "rmdir /s /q `"$StageRoot`""

Write-Host "[kforge][backup] Upload this zip to cloud storage for off-disk safety."
