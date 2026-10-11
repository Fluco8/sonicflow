@echo off
cd /d "%~dp0"
title SonicFlow Dev Environment
echo =======================================
echo    Lancement de SonicFlow...
echo =======================================
echo Dossier courant : %cd%
echo.

:: Verifier node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas trouve dans le PATH.
    pause
    exit /b 1
)

echo Demarrage du Backend (port 3001)...
start "SonicFlow Backend (3001)" cmd /k "node server.mjs"

echo Demarrage du Frontend Vite (port 5173)...
start "SonicFlow Frontend (5173)" cmd /k "npx vite --host"

echo.
echo =======================================
echo Deux fenetres doivent s'etre ouvertes !
echo Accede a l'application sur : http://localhost:5173
echo =======================================
echo.
pause
