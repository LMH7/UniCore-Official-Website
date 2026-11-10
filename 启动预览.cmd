@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later was not found.
  echo Install Node.js, then reopen this file.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
  echo Node.js 20 or later is required. Please update Node.js.
  pause
  exit /b 1
)
if not exist "scripts\serve.mjs" (
  echo Preview files were not found. Keep this file in the project folder.
  pause
  exit /b 1
)
echo Starting iNEX website preview...
echo Open the address printed below in your browser.
echo Keep this window open while browsing. Press Ctrl+C to stop.
node scripts/serve.mjs %*
if errorlevel 1 (
  echo Preview could not start. Read the error above.
  echo If port 4173 is in use, close the other preview window or use its address.
  pause
  exit /b 1
)
endlocal
