@echo off
title INVERT - Terminal Bursatil en Tiempo Real
echo ========================================================
echo   INVERT - Terminal Bursatil Profesional y Noticias
echo ========================================================
echo Iniciando servidor en tiempo real...
start http://localhost:8000
python server.py
pause
