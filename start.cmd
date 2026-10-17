@echo off
cd /d "%~dp0"
start "" /b cmd /c "timeout /t 1 >nul & start http://localhost:8123"
node serve.mjs
