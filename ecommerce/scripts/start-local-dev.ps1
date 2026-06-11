$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $repoRoot 'docker-compose.yml'
$dockerDesktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$dockerCliPath = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$ensureReplicaSetScript = Join-Path $PSScriptRoot 'ensure-local-replica-set.cjs'
$replicaSetName = 'rs0'
$replicaSetMember = '127.0.0.1:27017'
$mongoRootUsername = if ($env:MONGO_ROOT_USERNAME) { $env:MONGO_ROOT_USERNAME } else { 'njstore' }
$mongoRootPassword = if ($env:MONGO_ROOT_PASSWORD) { $env:MONGO_ROOT_PASSWORD } else { 'njstore-dev-mongo-password' }
$mongoConfigVolumeName = 'njstore_mongo_config'
$redisPassword = if ($env:REDIS_PASSWORD) { $env:REDIS_PASSWORD } else { 'njstore-dev-redis-password' }
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$logDirectory = Join-Path $env:LOCALAPPDATA 'NJStore'
$startupLog = Join-Path $logDirectory 'local-dev-startup.log'
$dockerLog = Join-Path $logDirectory 'docker-startup.log'
$seedLog = Join-Path $logDirectory 'local-dev-seed.log'
$serverLog = Join-Path $logDirectory 'server-dev.log'
$storeLog = Join-Path $logDirectory 'store-dev.log'
$adminLog = Join-Path $logDirectory 'admin-dev.log'
$serverDir = Join-Path $repoRoot 'apps\server'
$storeDir = Join-Path $repoRoot 'apps\store-client'
$adminDir = Join-Path $repoRoot 'apps\admin-client'
$tsxCli = Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs'
$viteCli = Join-Path $repoRoot 'node_modules\vite\bin\vite.js'

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $startupLog -Value "[$timestamp] $Message"
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

function Get-LocalMongoAppUri {
  $encodedUser = [System.Uri]::EscapeDataString($mongoRootUsername)
  $encodedPassword = [System.Uri]::EscapeDataString($mongoRootPassword)
  return "mongodb://${encodedUser}:${encodedPassword}@127.0.0.1:27017/njstore?authSource=admin&replicaSet=$replicaSetName"
}

function Get-LocalRedisUri {
  $encodedPassword = [System.Uri]::EscapeDataString($redisPassword)
  return "redis://:${encodedPassword}@127.0.0.1:6379"
}

function Ensure-LocalMongoKeyFile {
  $keyFileCommand = @'
if [ ! -f /config/dev-mongo-keyfile ]; then
  umask 077
  head -c 756 /dev/urandom | base64 > /config/dev-mongo-keyfile
fi
chown 999:999 /config/dev-mongo-keyfile
chmod 400 /config/dev-mongo-keyfile
'@

  $dockerArgs = @(
    'run',
    '--rm',
    '-v',
    ('{0}:/config' -f $mongoConfigVolumeName),
    'mongo:7.0',
    'sh',
    '-c',
    $keyFileCommand
  )

  [void](& $dockerCliPath @dockerArgs)

  if ($LASTEXITCODE -ne 0) {
    throw "Could not prepare the local Mongo keyfile in volume '$mongoConfigVolumeName'."
  }
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Get-ListeningProcessId {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $listener) {
    return $null
  }

  return [int]$listener.OwningProcess
}

function Test-ProcessMatchesRepo {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $process) {
    return $false
  }

  $commandLine = if ($null -ne $process.CommandLine) { $process.CommandLine } else { '' }
  return $commandLine -like "*$repoRoot*"
}

function Get-AvailableLogPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PreferredPath
  )

  if (-not (Test-Path $PreferredPath)) {
    return $PreferredPath
  }

  try {
    Remove-Item $PreferredPath -Force -ErrorAction Stop
    return $PreferredPath
  } catch {
    $directory = Split-Path -Parent $PreferredPath
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($PreferredPath)
    $extension = [System.IO.Path]::GetExtension($PreferredPath)
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return Join-Path $directory "$fileName-$timestamp$extension"
  }
}

function Wait-ForPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-RepoProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $existingProcessId = Get-ListeningProcessId -Port $Port
  if ($null -ne $existingProcessId) {
    if (-not (Test-ProcessMatchesRepo -ProcessId $existingProcessId)) {
      throw "$Name could not start because port $Port is already in use by a non-repo process (PID $existingProcessId)."
    }

    Write-Log "$Name is already listening on port $Port (PID $existingProcessId)."
    return
  }

  $resolvedLogPath = Get-AvailableLogPath -PreferredPath $LogPath
  if ($resolvedLogPath -ne $LogPath) {
    Write-Log "$Name log file was locked; redirecting output to '$resolvedLogPath'."
  }

  $cmd = 'cd /d "{0}" && {1} > "{2}" 2>&1' -f $WorkingDirectory, $Command, $resolvedLogPath
  $process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -PassThru -WindowStyle Hidden

  if (-not (Wait-ForPort -Port $Port)) {
    throw "$Name did not open port $Port. Check '$resolvedLogPath'."
  }

  Write-Log "$Name started on port $Port (PID $($process.Id)). Log: '$resolvedLogPath'."
}

function Ensure-MongoReplicaSetReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$NodeExe,
    [int]$TimeoutSeconds = 90
  )

  $initUri = Get-MongoAdminUri
  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $quotedScriptPath = '"{0}"' -f $ensureReplicaSetScript
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
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath

    $stdout = if (Test-Path $stdoutPath) { [string](Get-Content $stdoutPath -Raw -ErrorAction SilentlyContinue) } else { '' }
    $stderr = if (Test-Path $stderrPath) { [string](Get-Content $stderrPath -Raw -ErrorAction SilentlyContinue) } else { '' }
    $output = @($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    if ($process.ExitCode -eq 0) {
      Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Replica set '$replicaSetName' is ready on '$replicaSetMember'."
      return $true
    }

    if ($output.Count -gt 0) {
      Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($output -join [Environment]::NewLine)"
    }

    return $false
  } finally {
    Remove-Item $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-LocalMongo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$NodeExe
  )

  foreach ($requiredPath in @($composeFile, $dockerDesktopPath, $dockerCliPath, $ensureReplicaSetScript)) {
    if (-not (Test-Path $requiredPath)) {
      throw "Required Mongo bootstrap file was not found: $requiredPath"
    }
  }

  Write-Log 'Ensuring local Mongo replica set is ready.'

  if (Test-PortListening -Port 27017) {
    Write-Log 'Mongo port 27017 is already listening. Verifying replica set state.'
    if (Ensure-MongoReplicaSetReady -NodeExe $NodeExe -TimeoutSeconds 20) {
      Write-Log 'Local Mongo replica set is ready.'
      return
    }

    Write-Log 'Mongo port 27017 is listening but the replica set is not writable yet. Falling back to Docker bootstrap.'
  }

  $mongoReady = $false
  $legacyContainersHandled = $false
  $dockerLaunchAttempted = $false

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Write-Log "Mongo bootstrap attempt $attempt started."
    try {
      if (-not (Test-DockerDaemonReady)) {
        Write-Log "Docker daemon not ready on attempt $attempt."
        if (-not $dockerLaunchAttempted) {
          Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Launching Docker Desktop."
          Start-Process -FilePath $dockerDesktopPath | Out-Null
          $dockerLaunchAttempted = $true
        }

        Start-Sleep -Seconds 5
        continue
      }

      Write-Log "Docker daemon responded on attempt $attempt."

      Ensure-LocalMongoKeyFile

      if (-not $legacyContainersHandled) {
        $existingContainerNames = @(& $dockerCliPath ps -a --format '{{.Names}}' 2>$null)
        foreach ($legacyContainerName in @('ecommerce-mongo-1')) {
          if ($existingContainerNames -notcontains $legacyContainerName) {
            continue
          }

          [void](& $dockerCliPath stop $legacyContainerName *> $null)
          if ($?) {
            Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Stopped legacy Mongo container '$legacyContainerName' before starting 'njstore-mongo'."
          }
        }

        $legacyContainersHandled = $true
        Write-Log 'Legacy Mongo container cleanup completed.'
      }

      $composeCommand = '"{0}" compose -f "{1}" up -d --remove-orphans mongo mongo-setup redis' -f $dockerCliPath, $composeFile
      $composeOutput = @(& cmd.exe /d /s /c $composeCommand 2>$null)
      $composeExitCode = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
      Write-Log "docker compose exited with code $composeExitCode on attempt $attempt."

      if ($composeExitCode -eq 0 -and (Test-PortListening -Port 27017)) {
        Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Docker daemon became ready on attempt $attempt."
        $mongoReady = $true
        Write-Log "Mongo port 27017 is listening after compose on attempt $attempt."
        break
      }

      if ($composeExitCode -ne 0 -and $composeOutput.Count -gt 0) {
        Add-Content -Path $dockerLog -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($composeOutput -join [Environment]::NewLine)"
      }
    } catch {
      Write-Log "Mongo bootstrap attempt $attempt hit: $($_.Exception.Message)"

      if (Test-PortListening -Port 27017) {
        Write-Log "Mongo port 27017 is listening after bootstrap noise on attempt $attempt. Verifying replica set state."
        if (Ensure-MongoReplicaSetReady -NodeExe $NodeExe -TimeoutSeconds 20) {
          $mongoReady = $true
          Write-Log 'Local Mongo replica set is ready after recovering from bootstrap noise.'
          break
        }
      }

      # Ignore and retry until Docker Desktop finishes starting.
    }

    Start-Sleep -Seconds 5
  }

  if (-not $mongoReady) {
    throw "Docker Mongo did not become ready within 150 seconds. Check '$dockerLog'."
  }

  if (-not (Ensure-MongoReplicaSetReady -NodeExe $NodeExe)) {
    throw "Replica set '$replicaSetName' did not become writable. Check '$dockerLog'."
  }

  Write-Log 'Local Mongo replica set is ready.'
}

function Get-ApiProductCount {
  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/v1/products?page=1&limit=1' -TimeoutSec 5
    if ($null -ne $response -and $null -ne $response.pagination -and $null -ne $response.pagination.total) {
      return [int]$response.pagination.total
    }
  } catch {
    return $null
  }

  return $null
}

try {
  if (Test-Path $startupLog) {
    Remove-Item $startupLog -Force
  }

  Write-Log "Starting NJ Store local development from '$repoRoot'."

  $nodeExe = Resolve-NodeExe
  if (-not $nodeExe) {
    throw 'Node.js was not found. Install Node.js 20 LTS before running the local dev bootstrap.'
  }

  foreach ($requiredPath in @($powershellExe, $tsxCli, $viteCli)) {
    if (-not (Test-Path $requiredPath)) {
      throw "Required file was not found: $requiredPath"
    }
  }

  Ensure-LocalMongo -NodeExe $nodeExe

  $env:MONGO_URI = Get-LocalMongoAppUri
  $env:REDIS_URL = ''

  $serverCommand = '"{0}" "{1}" watch src/devServer.ts' -f $nodeExe, $tsxCli
  $storeCommand = '"{0}" "{1}"' -f $nodeExe, $viteCli
  $adminCommand = '"{0}" "{1}" --port 5174' -f $nodeExe, $viteCli

  Start-RepoProcess -Name 'API server' -WorkingDirectory $serverDir -Command $serverCommand -LogPath $serverLog -Port 5000

  $productCount = $null
  for ($attempt = 1; $attempt -le 10; $attempt++) {
    $productCount = Get-ApiProductCount
    if ($null -ne $productCount) {
      break
    }

    Start-Sleep -Seconds 1
  }

  if ($null -eq $productCount) {
    Write-Log 'Could not determine the current product count from the API. Skipping automatic seeding.'
  } elseif ($productCount -eq 0) {
    Write-Log 'The API reports an empty catalog. Seeding demo data before starting the frontends.'
    if (Test-Path $seedLog) {
      Remove-Item $seedLog -Force
    }

    Push-Location $serverDir
    try {
      & $nodeExe $tsxCli 'src/utils/seed.ts' 2>&1 | Tee-Object -FilePath $seedLog -Append | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "Seeding failed. Check '$seedLog'."
      }
    } finally {
      Pop-Location
    }

    Start-Sleep -Seconds 1
  } else {
    Write-Log "The API already reports $productCount products. Skipping seed."
  }

  Start-RepoProcess -Name 'Storefront' -WorkingDirectory $storeDir -Command $storeCommand -LogPath $storeLog -Port 5173
  Start-RepoProcess -Name 'Admin client' -WorkingDirectory $adminDir -Command $adminCommand -LogPath $adminLog -Port 5174

  Write-Log 'Local development stack is ready.'
  Write-Host 'NJ Store local dev is ready.'
  Write-Host 'Storefront: http://localhost:5173'
  Write-Host 'Admin:      http://localhost:5174'
  Write-Host 'API:        http://localhost:5000/api/v1/health'
  Write-Host "Logs:       $logDirectory"
} catch {
  Write-Log "Startup failed: $($_.Exception.Message)"
  throw
}
