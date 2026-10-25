@echo off
setlocal
cd /d "%~dp0"
echo.
echo =======================================================
echo  FamilyGuard Website - Android, iPhone, Windows browsers
echo =======================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org/
  echo Then run this file again.
  pause
  exit /b 1
)
echo You can open http://localhost:3000 on this PC.
echo To connect your phones, use the PC's IPv4 address: http://YOUR-PC-IP:3000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do echo Example PC address detected: http://%%a:3000
echo.
echo Keep this black window OPEN while using the site.
echo Settings are saved in the data folder.
echo.
node server.js
if errorlevel 1 echo FamilyGuard stopped with an error.
pause
