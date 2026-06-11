$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $repoRoot 'docker-compose.yml'
$logDirectory = Join-Path $env:LOCALAPPDATA 'NJStore'
$logFile = Join-Path $logDirectory 'docker-startup.log'
$dockerDesktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$dockerCliPath = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$ensureReplicaSetScript = Join-Path $PSScriptRoot 'ensure-local-replica-set.cjs'
$containerName = 'njstore-mongo'
$legacyContainerNames = @('ecommerce-mongo-1')
$replicaSetName = 'rs0'
$replicaSetMember = '127.0.0.1:27017'
$mongoRootUsername = if ($env:MONGO_ROOT_USERNAME) { $env:MONGO_ROOT_USERNAME } else { 'njstore' }
$mongoRootPassword = if ($env:MONGO_ROOT_PASSWORD) { $env:MONGO_ROOT_PASSWORD } else { 'njstore-dev-mongo-password' }

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $logFile -Value "[$timestamp] $Message"
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Resolve-NodeExe {
  $candidates = @(
    'C:\Program Files\nodejs\node.exe',
    (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
  ) | Where-Object { $_ -and (Test-Path $_) }

  return $candidates | Select-Object -First 1
}

function Test-DockerDaemonReady {
  try {
    [void](& $dockerCliPath info --format '{{json .ServerVersion}}' *> $null)
    return $true
  } catch {
    return $false
  }
}

function Get-MongoAdminUri {
  $encodedUser = [System.Uri]::EscapeDataString($mongoRootUsername)
  $encodedPassword = [System.Uri]::EscapeDataString($mongoRootPassword)
  return "mongodb://${encodedUser}:${encodedPassword}@127.0.0.1:27017/admin?authSource=admin&directConnection=true"
}

function Ensure-MongoReplicaSetReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$NodeExe,
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [int]$TimeoutSeconds = 90
  )

  $initUri = Get-MongoAdminUri
  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $quotedScriptPath = '"{0}"' -f $ScriptPath
    $process = Start-Process `
      -FilePath $NodeExe `
      -ArgumentList @(
        $quotedScriptPath,
        '--uri', $initUri,
        '--set-name', $replicaSetName,
        '--member', $replicaSetMember,
        '--timeout-seconds', "$TimeoutSeconds"
      ) `
      -Wait `
      -PassThru `
      -NoNewWindow `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath

    $stdout = ''
    if (Test-Path $stdoutPath) {
      $stdoutContent = Get-Content $stdoutPath -Raw -ErrorAction SilentlyContinue
      if ($null -ne $stdoutContent) {
        $stdout = [string]$stdoutContent
      }
    }

    $stderr = ''
    if (Test-Path $stderrPath) {
      $stderrContent = Get-Content $stderrPath -Raw -ErrorAction SilentlyContinue
      if ($null -ne $stderrContent) {
        $stderr = [string]$stderrContent
      }
    }

    $outputParts = @()
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
      $outputParts += $stdout
    }

    if (-not [string]::IsNullOrWhiteSpace($stderr)) {
      $outputParts += $stderr
    }

    $output = $outputParts -join [Environment]::NewLine

    if ($process.ExitCode -eq 0) {
      Write-Log "Replica set '$replicaSetName' is ready on '$replicaSetMember'."
      return $true
    }

    if (-not [string]::IsNullOrWhiteSpace($output)) {
      Write-Log $output
    }

    return $false
  } finally {
    Remove-Item $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  }
}

try {
  if (-not (Test-Path $composeFile)) {
    Write-Log "Compose file was not found at '$composeFile'. Startup action skipped."
    exit 1
  }

  if (-not (Test-Path $dockerDesktopPath)) {
    Write-Log 'Docker Desktop executable was not found. Startup action skipped.'
    exit 1
  }

  if (-not (Test-Path $dockerCliPath)) {
    Write-Log 'Docker CLI executable was not found. Startup action skipped.'
    exit 1
  }

  if (-not (Test-Path $ensureReplicaSetScript)) {
    Write-Log "Replica set helper script was not found at '$ensureReplicaSetScript'."
    exit 1
  }

  $nodeExe = Resolve-NodeExe
  if (-not $nodeExe) {
    Write-Log 'Node.js was not found. Startup action skipped.'
    exit 1
  }

  $mongoReady = $false
  $legacyContainersHandled = $false
  $dockerLaunchAttempted = $false
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
      if (-not (Test-DockerDaemonReady)) {
        if (-not $dockerLaunchAttempted) {
          Write-Log 'Launching Docker Desktop.'
          Start-Process -FilePath $dockerDesktopPath | Out-Null
          $dockerLaunchAttempted = $true
        }

        Start-Sleep -Seconds 5
        continue
      }

      if (-not $legacyContainersHandled) {
        $existingContainerNames = @(& $dockerCliPath ps -a --format '{{.Names}}' 2>$null)
        foreach ($legacyContainerName in $legacyContainerNames) {
          if ($existingContainerNames -notcontains $legacyContainerName) {
            continue
          }

          [void](& $dockerCliPath stop $legacyContainerName *> $null)
          if ($?) {
            Write-Log "Stopped legacy Mongo container '$legacyContainerName' before starting '$containerName'."
          }
        }

        $legacyContainersHandled = $true
      }

      $composeCommand = '"{0}" compose -f "{1}" up -d --remove-orphans mongo mongo-setup redis' -f $dockerCliPath, $composeFile
      $composeOutput = @(& cmd.exe /d /s /c $composeCommand 2>$null)
      $composeExitCode = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }

      if ($composeExitCode -eq 0 -and (Test-PortListening -Port 27017)) {
        $mongoReady = $true
        Write-Log "Docker daemon became ready on attempt $attempt."
        break
      }

      if ($composeExitCode -ne 0 -and $composeOutput.Count -gt 0) {
        Write-Log ($composeOutput -join [Environment]::NewLine)
      }
    } catch {
      # Ignore and retry until Docker Desktop finishes starting.
    }

    Start-Sleep -Seconds 5
  }

  if (-not $mongoReady) {
    Write-Log "Docker Mongo did not become ready within 150 seconds. If Docker Desktop is paused, unpause it from the Whale menu or Dashboard."
    exit 1
  }

  if (-not (Ensure-MongoReplicaSetReady -NodeExe $nodeExe -ScriptPath $ensureReplicaSetScript)) {
    Write-Log "Replica set '$replicaSetName' did not become writable within the expected time window."
    exit 1
  }

  Write-Log "Container '$containerName' is serving on port 27017 from compose file '$composeFile'."
  exit 0
} catch {
  $position = if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) { $_.InvocationInfo.PositionMessage.Trim() } else { 'Unknown position' }
  Write-Log "Startup action failed: $($_.Exception.Message) @ $position"
  exit 1
}
