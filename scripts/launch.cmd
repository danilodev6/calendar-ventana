@echo off
rem Reservas Casa launcher for Windows. Double-click via the shortcut.
rem Keep this console open while using the app; Ctrl+C stops it correctly.
cd /d "%~dp0"
echo Reservas Casa - No cerrar esta ventana mientras usa la aplicacion.
node launch.mjs %*
