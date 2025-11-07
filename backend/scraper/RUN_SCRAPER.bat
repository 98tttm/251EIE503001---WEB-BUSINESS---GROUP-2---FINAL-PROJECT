@echo off
chcp 65001 >nul
cls

REM Check if node_modules exists
if not exist "node_modules\" (
    echo ════════════════════════════════════════════════════════════════
    echo   ⚠️  CHƯA CÀI ĐẶT DEPENDENCIES
    echo ════════════════════════════════════════════════════════════════
    echo.
    echo Đang tự động cài đặt dependencies...
    echo Quá trình này sẽ mất 2-5 phút.
    echo.
    call npm install
    echo.
    if errorlevel 1 (
        echo ❌ Cài đặt thất bại! Vui lòng kiểm tra kết nối internet.
        pause
        exit /b 1
    )
    echo ✅ Cài đặt hoàn tất!
    echo.
    pause
    cls
)

echo ================================================================
echo   LONG CHÂU ARTICLE SCRAPER
echo ================================================================
echo.
echo Chọn phương án:
echo.
echo   1. TEST (2 bài viết - kiểm tra scraper hoạt động)
echo   2. SMALL (20 bài viết - ~3 phút)
echo   3. MEDIUM (100 bài viết - ~15 phút)
echo   4. LARGE (500 bài viết - ~90 phút)
echo   5. ALL - TẤT CẢ BÀI VIẾT (không giới hạn - vài giờ)
echo   6. Cài đặt dependencies (npm install)
echo   7. Import vào MongoDB
echo   0. Thoát
echo.
echo ================================================================
echo.

set /p choice="Nhập số (0-7): "

if "%choice%"=="0" goto :end
if "%choice%"=="1" goto :test
if "%choice%"=="2" goto :small
if "%choice%"=="3" goto :medium
if "%choice%"=="4" goto :large
if "%choice%"=="5" goto :all
if "%choice%"=="6" goto :install
if "%choice%"=="7" goto :import

echo.
echo ❌ Lựa chọn không hợp lệ!
pause
goto :end

:install
echo.
echo 🔧 Đang cài đặt dependencies...
call npm install
echo.
echo ✅ Cài đặt hoàn tất!
pause
goto :end

:test
echo.
echo 🧪 Đang test scraper với 2 bài viết...
call npm run test
pause
goto :end

:small
echo.
echo 🚀 Đang cào 20 bài viết...
call npm run scrape:simple:small
echo.
echo ✅ Hoàn tất! Kiểm tra file: backend\data\longchau-articles-simple.json
pause
goto :end

:medium
echo.
echo 🚀 Đang cào 100 bài viết (có thể mất ~15 phút)...
call npm run scrape:simple:medium
echo.
echo ✅ Hoàn tất! Kiểm tra file: backend\data\longchau-articles-simple.json
pause
goto :end

:large
echo.
echo 🚀 Đang cào 500 bài viết (có thể mất ~90 phút)...
echo    Bạn có thể để máy chạy và đi làm việc khác.
echo.
call npm run scrape:large
echo.
echo ✅ Hoàn tất! Kiểm tra file: backend\data\longchau-articles.json
pause
goto :end

:all
echo.
echo ════════════════════════════════════════════════════════════════
echo   ⚠️  CẢNH BÁO: CÀO TẤT CẢ BÀI VIẾT
echo ════════════════════════════════════════════════════════════════
echo.
echo   • Thời gian: 3-6 giờ (hoặc hơn)
echo   • Số lượng: Tất cả bài viết (có thể 1000+ bài)
echo   • Khuyến nghị: Chạy qua đêm
echo   • File output có thể rất lớn (20-50 MB)
echo.
echo ════════════════════════════════════════════════════════════════
echo.
set /p confirm="Bạn có chắc chắn muốn tiếp tục? (Y/N): "
if /i not "%confirm%"=="Y" goto :end
echo.
echo 🚀 Đang cào TẤT CẢ bài viết...
echo    Phương pháp: Axios + Cheerio (nhanh hơn)
echo    Để máy chạy, đi làm việc khác hoặc ngủ một giấc.
echo.
call npm run scrape:simple:all
echo.
echo ✅ Hoàn tất! Kiểm tra file: backend\data\longchau-articles-simple.json
pause
goto :end

:import
echo.
echo 💾 Đang import dữ liệu vào MongoDB...
call npm run import
echo.
echo ✅ Import hoàn tất!
pause
goto :end

:end

