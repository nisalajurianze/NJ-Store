$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logDirectory = Join-Path $env:LOCALAPPDATA 'NJStore'
$shutdownLog = Join-Path $logDirectory 'local-dev-stop.log'
$ports = @(5000, 5173, 5174)

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $shutdownLog -Value "[$timestamp] $Message"
}

function Stop-RepoProcess {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId,
    [Parameter(Mandatory = $true)]
    [string]$Reason
  )

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $process) {
    return
  }

  $commandLine = if ($null -ne $process.CommandLine) { $process.CommandLine } else { '' }
  if ($commandLine -notlike "*$repoRoot*") {
    return
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  Write-Log "Stopped PID $ProcessId ($Reason)."
}

if (Test-Path $shutdownLog) {
  Remove-Item $shutdownLog -Force
}

foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-RepoProcess -ProcessId $listener.OwningProcess -Reason "listener on port $port"
  }
}

$wrapperProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like "*$repoRoot*" -and (
    $_.CommandLine -like '*vite.js*' -or
    $_.CommandLine -like '*tsx*' -or
    $_.CommandLine -like '*devServer.ts*'
  )
}

foreach ($process in $wrapperProcesses) {
  Stop-RepoProcess -ProcessId $process.ProcessId -Reason 'lingering dev wrapper'
}

Write-Log 'Local development processes have been stopped.'
Write-Host 'NJ Store local dev processes have been stopped.'
