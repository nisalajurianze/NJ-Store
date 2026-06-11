param(
  [Parameter(Mandatory = $true)]
  [string]$MongoUri,

  [switch]$Reset
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$serverRoot = Join-Path $repoRoot 'apps/server'
$tsxCli = Join-Path $repoRoot 'node_modules/.bin/tsx.cmd'

if (-not (Test-Path $tsxCli)) {
  throw "Could not find tsx at '$tsxCli'. Run npm install in the ecommerce workspace first."
}

$env:NODE_ENV = 'development'
$env:JWT_ACCESS_SECRET = 'njstore-dev-access-secret'
$env:JWT_REFRESH_SECRET = 'njstore-dev-refresh-secret'
$env:MONGO_URI = $MongoUri

if ($Reset.IsPresent) {
  $env:SEED_RESET = 'true'
} else {
  Remove-Item Env:SEED_RESET -ErrorAction SilentlyContinue
}

Write-Host "[seed-remote-demo] Starting demo seed..."
Write-Host "[seed-remote-demo] Target server workspace: $serverRoot"
Write-Host "[seed-remote-demo] Reset mode: $($Reset.IsPresent)"

Push-Location $serverRoot
try {
  & $tsxCli 'src/utils/seed.ts'
  if ($LASTEXITCODE -ne 0) {
    throw "Seed script failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
