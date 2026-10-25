@echo off
setlocal
cd /d "%~dp0"
if not exist data\familyguard.json (
  echo No saved FamilyGuard data found yet.
  pause
  exit /b 1
)
if not exist backups mkdir backups
set "STAMP=%DATE:/=-%_%TIME::=-%"
set "STAMP=%STAMP: =0%"
copy /Y "data\familyguard.json" "backups\familyguard_%STAMP%.json" >nul
if errorlevel 1 (
 echo Backup failed.
) else (
 echo Backup created in the backups folder.
 echo Keep backups private: they contain family account and location information.
)
pause
