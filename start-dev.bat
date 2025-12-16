@echo off
REM Start npm dev server in a new window with a title
start "Dev Server" cmd /k "npm run dev"

REM Wait a few seconds for the server to start (adjust if needed)
timeout /t 5 /nobreak >nul

REM Open the dev server in the default browser
start http://localhost:3000