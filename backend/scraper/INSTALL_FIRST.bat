@echo off
chcp 65001 >nul
cls

echo ════════════════════════════════════════════════════════════════
echo   CÀI ĐẶT DEPENDENCIES
echo ════════════════════════════════════════════════════════════════
echo.
echo Đang cài đặt các thư viện cần thiết...
echo Quá trình này sẽ mất 2-5 phút.
echo.
echo Đang chạy: npm install
echo.

call npm install

echo.
if errorlevel 1 (
    echo ════════════════════════════════════════════════════════════════
    echo   ❌ CÀI ĐẶT THẤT BẠI
    echo ════════════════════════════════════════════════════════════════
    echo.
    echo Vui lòng:
    echo   1. Kiểm tra kết nối internet
    echo   2. Đảm bảo đã cài đặt Node.js
    echo   3. Chạy lại file này
    echo.
    pause
    exit /b 1
) else (
    echo ════════════════════════════════════════════════════════════════
    echo   ✅ CÀI ĐẶT THÀNH CÔNG
    echo ════════════════════════════════════════════════════════════════
    echo.
    echo Các thư viện đã được cài đặt:
    echo   • puppeteer (Browser automation)
    echo   • axios (HTTP client)
    echo   • cheerio (HTML parser)
    echo   • mongoose (MongoDB driver)
    echo.
    echo Bây giờ bạn có thể:
    echo   1. Chạy RUN_SCRAPER.bat
    echo   2. Hoặc chạy: npm run test
    echo.
    pause
)

