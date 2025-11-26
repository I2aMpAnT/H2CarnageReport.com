@echo off
title Carnage Report - Run All Scripts
color 0B

echo ============================================
echo    CARNAGE REPORT - MAINTENANCE SCRIPTS
echo ============================================
echo.

echo [1/2] Updating Game Data JSONs...
echo.
if exist "update_data.ps1" (
    powershell -ExecutionPolicy Bypass -File update_data.ps1
    echo.
    echo Game data update complete.
) else (
    echo WARNING: update_data.ps1 not found. Skipping...
)

echo.
echo ============================================
echo.

echo [2/2] Downloading Medal ^& Weapon Assets...
echo.
if exist "download_assets.ps1" (
    powershell -ExecutionPolicy Bypass -File download_assets.ps1
    echo.
    echo Asset download complete.
) else (
    echo WARNING: download_assets.ps1 not found. Skipping...
)

echo.
echo ============================================
echo    ALL SCRIPTS COMPLETED
echo ============================================
echo.
echo Press any key to close...
pause > nul
