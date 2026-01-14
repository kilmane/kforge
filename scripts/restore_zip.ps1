param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [Parameter(Mandatory = $false)]
    [string]$DestinationDir = ""
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
    Write-Host "[kforge][restore-zip] ERROR: $Message" -ForegroundColor Red
    exit 1
}

Write-Host "[kforge][restore-zip] Starting restore from ZIP..."

if (-not (Test-Path $ZipPath)) {
    Fail "Zip not found: $ZipPath"
}

$ZipFull = (Resolve-Path $ZipPath).Path

if ([string]::IsNullOrWhiteSpace($DestinationDir)) {
    $DestinationDir = (Get-Location).Path
} else {
    if (-not (Test-Path $DestinationDir)) {
        Write-Host "[kforge][restore-zip] Destination does not exist; creating: $DestinationDir"
        New-Item -ItemType Directory -Path $DestinationDir | Out-Null
    }
    $DestinationDir = (Resolve-Path $DestinationDir).Path
}

Write-Host "[kforge][restore-zip] Zip        : $ZipFull"
Write-Host "[kforge][restore-zip] Destination: $DestinationDir"

$TarCmd = Get-Command tar -ErrorAction SilentlyContinue
if (-not $TarCmd) {
    Fail "tar command not found. Ensure Windows tar (bsdtar) is available."
}

Push-Location $DestinationDir
try {
    Write-Host "[kforge][restore-zip] Extracting..."
    tar -xf $ZipFull
}
finally {
    Pop-Location
}

$ProjectDir = Join-Path $DestinationDir "kforge"
if (-not (Test-Path $ProjectDir)) {
    Write-Host "[kforge][restore-zip] WARNING: Could not find extracted folder 'kforge' at: $ProjectDir" -ForegroundColor Yellow
    Write-Host "[kforge][restore-zip] Open the destination folder and locate the extracted project folder manually."
    Write-Host "[kforge][restore-zip] Then run:"
    Write-Host "  pnpm install"
    Write-Host "  pnpm dlx @tauri-apps/cli dev"
    exit 0
}

Write-Host "[kforge][restore-zip] Extracted project folder: $ProjectDir" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps (run these):"
Write-Host "  cd `"$ProjectDir`""
Write-Host "  pnpm install"
Write-Host "  pnpm dlx @tauri-apps/cli dev"
