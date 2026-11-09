@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js。请安装 Node.js 20 或以上版本，或直接打开 site 目录下的 index.html。
  pause
  exit /b 1
)
echo 浏览器打开 http://127.0.0.1:4173 即可预览；关闭本窗口会停止预览服务。
node scripts/serve.mjs
pause
