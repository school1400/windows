@echo off
chcp 65001 >nul
echo === MadrasehYar installer build ===
where node >nul 2>nul || (echo Node.js is not installed. Install Node 18 LTS from nodejs.org and run again. & pause & exit /b 1)
call npm install || (echo npm install failed & pause & exit /b 1)
call npm run dist || (echo build failed & pause & exit /b 1)
echo.
echo Done. The single installer is in the "dist" folder: MadrasehYar-Setup-1.0.0.exe
explorer dist
pause
