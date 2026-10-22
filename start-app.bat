@echo off
title ChargeWise AI - Starter Script
echo ========================================================
echo   Starting ChargeWise AI Full-Stack EV Charging Platform
echo ========================================================
echo.

cd /d "%~dp0backend"
echo [1/2] Starting Python FastAPI Backend on http://localhost:8000...
start "ChargeWise Backend" cmd /k "if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) & python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"
echo [2/2] Starting React Vite Frontend on http://localhost:5173...
start "ChargeWise Frontend" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo ========================================================
echo   Services are starting!
echo   - Web Application: http://localhost:5173
echo   - Backend Swagger API: http://localhost:8000/docs
echo ========================================================
timeout /t 5
