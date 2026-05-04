@echo off
title 🐠 Baby Shower · Servidor Web
color 0B
echo.
echo  ============================================
echo   Baby Shower · Abilene Lara Mendieta
echo   Servidor corriendo en puerto 3000
echo  ============================================
echo.
echo  NO cierres esta ventana mientras el evento
echo  este activo. Los invitados necesitan que
echo  esta ventana permanezca abierta.
echo.
echo  Sitio:  http://localhost:3000
echo  Admin:  http://localhost:3000/admin
echo.
echo  Presiona Ctrl+C para detener el servidor.
echo  ============================================
echo.
cd /d "%~dp0"
node server.js
pause
