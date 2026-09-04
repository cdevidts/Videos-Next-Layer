@echo off
REM Doble clic para prender OmniRoute en Windows. Deja esta ventana abierta.
title OmniRoute

if "%OMNIROUTE_PORT%"=="" set OMNIROUTE_PORT=20128

echo Prendiendo OmniRoute...
echo Panel de control: http://localhost:%OMNIROUTE_PORT%
echo NO CIERRES ESTA VENTANA mientras lo estes usando.
echo.

where omniroute >nul 2>nul
if errorlevel 1 (
  echo [X] OmniRoute no esta instalado.
  echo     Abre PowerShell y corre:  npm install -g omniroute
  echo     Guia completa en docs\omniroute-paso-a-paso.md
  pause
  exit /b 1
)

omniroute
pause
