@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "INEX_BACKEND_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined INEX_BACKEND_NODE set "INEX_BACKEND_NODE=%%N"
if not defined INEX_BACKEND_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "INEX_BACKEND_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined INEX_BACKEND_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "INEX_BACKEND_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined INEX_BACKEND_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "INEX_BACKEND_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined INEX_BACKEND_NODE (
  echo Node.js 20 or later is required. See README.md.
  pause
  exit /b 1
)
"%INEX_BACKEND_NODE%" -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
  echo Node.js 20 or later is required. Please update Node.js.
  pause
  exit /b 1
)
for %%N in ("%INEX_BACKEND_NODE%") do set "PATH=%%~dpN;%PATH%"
if not exist ".venv-backend\Scripts\python.exe" (
  echo Backend environment not found.
  echo Follow the first-time setup in backend\README.md.
  echo Install Python 3.12, then run:
  echo py -3.12 -m venv .venv-backend
  echo .venv-backend\Scripts\python.exe -m pip install -r backend/requirements.lock
  pause
  exit /b 1
)
echo Starting NEW website + backend preview...
echo Open http://127.0.0.1:9000/ after the server starts.
echo The about page includes the laboratory introduction.
echo Keep this window open. Press Ctrl+C to stop.
"%INEX_BACKEND_NODE%" scripts/backend-task.mjs preview %*
if errorlevel 1 (
  echo Preview failed. Read the error above.
  echo If port 9000 is occupied, close the earlier backend preview window.
  pause
  exit /b 1
)
endlocal
