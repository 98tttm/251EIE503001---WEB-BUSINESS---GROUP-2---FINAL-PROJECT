@echo off
chcp 65001 >nul
title Scraper Long Chau - 20 Bai Viet

echo ════════════════════════════════════════════════════════════════
echo   📌 SCRAPE 20 BAI VIET TU LONG CHAU
echo ════════════════════════════════════════════════════════════════
echo.
echo 📂 Vi tri file du lieu:
echo    D:\MEDICARE\MEDICARE_FINAL\backend\data\longchau-articles-final.json
echo.

cd /d "%~dp0"

echo 🔍 Kiem tra node_modules...
if not exist "node_modules" (
    echo 📥 Cai dat dependencies...
    call npm install
)

echo.
echo ⏳ Thoi gian uoc tinh: 5-7 phut
echo.
echo ⚠️  CANH BAO: Backend server phai dang chay!
echo.
pause

call npm run scrape:final

echo.
echo ✅ HOAN THANH! Mo file ket qua de xem.
echo.
pause

