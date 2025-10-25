@echo off
echo Checking MediCare Database Connection...

echo.
echo ========================================
echo   Connection Check
echo ========================================
echo.

echo [1/4] Checking MongoDB...
mongosh --eval "db.runCommand('ping')" --quiet
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not running
    echo Please start MongoDB service
) else (
    echo ✅ MongoDB is running
)

echo.
echo [2/4] Checking .env file...
if not exist "server\.env" (
    echo ❌ .env file not found
    echo Please create server\.env file
) else (
    echo ✅ .env file exists
)

echo.
echo [3/4] Checking server dependencies...
if not exist "server\node_modules" (
    echo ❌ Dependencies not installed
    echo Please run: cd server && npm install
) else (
    echo ✅ Dependencies installed
)

echo.
echo [4/4] Testing API connection...
curl -s http://localhost:5000/health > nul
if %errorlevel% neq 0 (
    echo ❌ Server is not running
    echo Please start the server first
) else (
    echo ✅ Server is running and accessible
)

echo.
echo ========================================
echo   Connection Check Complete
echo ========================================
echo.

pause
