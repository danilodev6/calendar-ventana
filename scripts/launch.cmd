@echo off
rem Reservas Casa launcher for Windows. Double-click via the shortcut.
rem Keep this console open while using the app; Ctrl+C stops it correctly.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instalalo desde https://nodejs.org e intenta de nuevo.
  pause
  exit /b 1
)
echo Reservas Casa - No cerrar esta ventana mientras usa la aplicacion.
node launch.mjs %*
