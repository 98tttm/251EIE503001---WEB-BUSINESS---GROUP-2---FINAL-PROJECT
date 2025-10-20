@echo off
echo Testing MediCare Server...

echo.
echo ========================================
echo   Server Test
echo ========================================
echo.

echo [1/3] Checking if server is running...
curl -s http://localhost:5000/health > nul
if %errorlevel% neq 0 (
    echo ❌ Server is not running
    echo Please start the server first with: start-server.bat
    pause
    exit /b 1
)
echo ✅ Server is running

echo.
echo [2/3] Testing health endpoint...
curl -s http://localhost:5000/health
echo.
echo.

echo [3/3] Testing API endpoints...
echo.
echo Testing categories endpoint:
curl -s http://localhost:5000/api/categories | head -c 200
echo ...
echo.

echo Testing products endpoint:
curl -s "http://localhost:5000/api/products?limit=2" | head -c 200
echo ...
echo.

echo ========================================
echo   Server Test Complete
echo ========================================
echo.

pause
