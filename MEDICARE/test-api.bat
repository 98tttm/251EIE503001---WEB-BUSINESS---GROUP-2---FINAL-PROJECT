@echo off
echo Testing MediCare API Endpoints...

echo.
echo ========================================
echo   Testing API Endpoints
echo ========================================
echo.

echo [1/4] Testing health endpoint...
curl -s http://localhost:5000/health
echo.
echo.

echo [2/4] Testing categories endpoint...
curl -s http://localhost:5000/api/categories
echo.
echo.

echo [3/4] Testing specific category (Sinh lý - Nội tiết tố)...
curl -s http://localhost:5000/api/categories/9bed0236c5b87c043200fb11
echo.
echo.

echo [4/4] Testing products by category...
curl -s "http://localhost:5000/api/products/category/9bed0236c5b87c043200fb11?limit=5"
echo.
echo.

echo ========================================
echo   API Testing Complete
echo ========================================
echo.

pause
