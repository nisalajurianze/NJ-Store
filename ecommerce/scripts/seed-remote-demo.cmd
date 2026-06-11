@echo off
setlocal

if "%~1"=="" (
  echo Usage: seed-remote-demo.cmd ^<mongo-uri^> [--reset]
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
set "SERVER_ROOT=%REPO_ROOT%\apps\server"
set "NODE_EXE=C:\PROGRA~1\nodejs\node.exe"
set "SEED_SCRIPT=%SERVER_ROOT%\dist\utils\seed.js"

if not exist "%NODE_EXE%" (
  echo Could not find node.exe at "%NODE_EXE%".
  exit /b 1
)

if not exist "%SEED_SCRIPT%" (
  echo Could not find compiled seed script at "%SEED_SCRIPT%". Run npm run build --workspace @njstore/server first.
  exit /b 1
)

set "NODE_ENV=development"
set "JWT_ACCESS_SECRET=njstore-dev-access-secret"
set "JWT_REFRESH_SECRET=njstore-dev-refresh-secret"
set "MONGO_URI=%~1"

if /I "%~2"=="--reset" (
  set "SEED_RESET=true"
) else (
  set "SEED_RESET="
)

echo [seed-remote-demo] Starting demo seed...
echo [seed-remote-demo] Target server workspace: %SERVER_ROOT%
if defined SEED_RESET (
  echo [seed-remote-demo] Reset mode: true
) else (
  echo [seed-remote-demo] Reset mode: false
)

cd /d "%SERVER_ROOT%" || exit /b 1
call "%NODE_EXE%" "%SEED_SCRIPT%"
exit /b %errorlevel%
