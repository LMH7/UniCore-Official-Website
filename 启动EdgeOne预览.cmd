@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required. Install Node.js first.
  pause
  exit /b 1
)
set DEPLOY_MODE=preview
set SITE_URL=
node scripts/build-site.mjs --edgeone
if errorlevel 1 (
  echo Build failed. Read the message above.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4178/ in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node scripts/serve.mjs --port 4178 --dir artifacts/edgeone-pages --headers edgeone.json
if errorlevel 1 pause
endlocal
