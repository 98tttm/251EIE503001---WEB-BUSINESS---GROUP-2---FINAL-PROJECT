@echo off
chcp 65001 >nul
title Test Scraper Long Chau - Chay Thu 5 Bai Viet

echo ════════════════════════════════════════════════════════════════
echo   📌 HUONG DAN CHAY THU SCRAPER LONG CHAU
echo ════════════════════════════════════════════════════════════════
echo.
echo 📂 Vi tri file du lieu:
echo    D:\MEDICARE\MEDICARE_FINAL\backend\data\longchau-articles-final.json
echo.
echo ════════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo 🔍 Kiem tra node_modules...
if not exist "node_modules" (
    echo ❌ Chua co node_modules!
    echo 📥 Dang cai dat dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ LOI: Khong the cai dat npm packages
        echo 💡 Thu chay: npm install
        pause
        exit /b 1
    )
    echo ✅ Da cai dat xong!
) else (
    echo ✅ Da co node_modules
)

echo.
echo ════════════════════════════════════════════════════════════════
echo   🚀 BAT DAU SCRAPE TEST (5 BAI VIET)
echo ════════════════════════════════════════════════════════════════
echo.
echo ⏳ Thoi gian uoc tinh: 2-3 phut
echo.
pause

call npm run scrape:final:test

echo.
echo ════════════════════════════════════════════════════════════════
echo   ✅ HOAN THANH!
echo ════════════════════════════════════════════════════════════════
echo.
echo 📂 Mo file ket qua:
echo    D:\MEDICARE\MEDICARE_FINAL\backend\data\longchau-articles-final.json
echo.
pause

