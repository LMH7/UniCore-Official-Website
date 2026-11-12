@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required. See README.md.
  pause
  exit /b 1
)
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
node scripts/backend-task.mjs preview %*
if errorlevel 1 (
  echo Preview failed. Read the error above.
  echo If port 9000 is occupied, close the earlier backend preview window.
  pause
  exit /b 1
)
endlocal
