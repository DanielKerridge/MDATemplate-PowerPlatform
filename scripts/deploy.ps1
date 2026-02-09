# Deploy Code App to Dataverse
# Usage: .\scripts\deploy.ps1
# Environment: https://org7b63e9d1.crm6.dynamics.com/
# Solution: MDATemplate (friendly name: "MDA Template")

param(
    [string]$Environment = "https://org7b63e9d1.crm6.dynamics.com/",
    [string]$SolutionName = "MDA Template"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Code App Deployment ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment"
Write-Host "Solution: $SolutionName"
Write-Host ""

# Step 1: Verify pac auth
Write-Host "[1/3] Checking pac auth..." -ForegroundColor Yellow
$authList = pac auth list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not authenticated. Run: pac auth create --environment $Environment" -ForegroundColor Red
    exit 1
}
Write-Host "Auth OK" -ForegroundColor Green

# Step 2: Build
Write-Host "[2/3] Building code app..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\code-app"
npx vite build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "Build OK" -ForegroundColor Green

# Step 3: Push to Dataverse
Write-Host "[3/3] Pushing to Dataverse..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\code-app"
pac code push -s "$SolutionName" 2>&1
$pushResult = $LASTEXITCODE
Pop-Location

if ($pushResult -ne 0) {
    Write-Host "ERROR: pac code push failed (exit code: $pushResult)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== DEPLOYMENT SUCCESS ===" -ForegroundColor Green
Write-Host "App deployed to $Environment in solution '$SolutionName'"
Write-Host "Open: https://apps.powerapps.com" -ForegroundColor Cyan
