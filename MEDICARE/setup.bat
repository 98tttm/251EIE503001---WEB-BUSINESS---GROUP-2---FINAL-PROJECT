@echo off
echo ========================================
echo    MediCare Setup & Data Import
echo ========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

echo.
echo [2/5] Checking MongoDB installation...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not installed. Please install MongoDB first.
    echo Download from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)
echo ✅ MongoDB is installed

echo.
echo [3/5] Installing backend dependencies...
cd server
if not exist node_modules (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

echo.
echo [4/5] Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB service might already be running
)

echo.
echo [5/5] Importing data to MongoDB...
echo This may take a few minutes for large datasets...
echo.
node scripts/importData.js
if %errorlevel% neq 0 (
    echo ❌ Failed to import data
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Setup Completed Successfully!
echo ========================================
echo.
echo ✅ Backend dependencies installed
echo ✅ MongoDB service started
echo ✅ Data imported successfully
echo.
echo Next steps:
echo 1. Run start.bat to start the server
echo 2. Open src/html/index.html in your browser
echo 3. Visit http://localhost:5000/health to check API
echo.
pause
