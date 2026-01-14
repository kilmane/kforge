param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl,

    [Parameter(Mandatory = $false)]
    [string]$DestinationDir = "",

    [Parameter(Mandatory = $false)]
    [string]$FolderName = "kforge"
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
    Write-Host "[kforge][restore-github] ERROR: $Message" -ForegroundColor Red
    exit 1
}

Write-Host "[kforge][restore-github] Starting restore from GitHub..."

$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $GitCmd) {
    Fail "git not found. Install Git for Windows and try again."
}

if ([string]::IsNullOrWhiteSpace($DestinationDir)) {
    $DestinationDir = (Get-Location).Path
} else {
    if (-not (Test-Path $DestinationDir)) {
        Write-Host "[kforge][restore-github] Destination does not exist; creating: $DestinationDir"
        New-Item -ItemType Directory -Path $DestinationDir | Out-Null
    }
    $DestinationDir = (Resolve-Path $DestinationDir).Path
}

$TargetPath = Join-Path $DestinationDir $FolderName

Write-Host "[kforge][restore-github] Repo URL    : $RepoUrl"
Write-Host "[kforge][restore-github] Destination : $TargetPath"

if (Test-Path $TargetPath) {
    Fail "Target folder already exists: $TargetPath (choose a different DestinationDir or FolderName)"
}

Push-Location $DestinationDir
try {
    Write-Host "[kforge][restore-github] Cloning..."
    git clone $RepoUrl $FolderName
}
finally {
    Pop-Location
}

if (-not (Test-Path $TargetPath)) {
    Fail "Clone completed but folder not found: $TargetPath"
}

Write-Host "[kforge][restore-github] Clone complete." -ForegroundColor Green

Write-Host ""
Write-Host "Next steps (run these):"
Write-Host "  cd `"$TargetPath`""
Write-Host "  pnpm install"
Write-Host "  pnpm dlx @tauri-apps/cli dev"
