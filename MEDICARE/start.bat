@echo off
echo ========================================
echo    MediCare Pharmacy E-commerce
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

echo.
echo [2/4] Checking MongoDB installation...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not installed. Please install MongoDB first.
    pause
    exit /b 1
)
echo ✅ MongoDB is installed

echo.
echo [3/4] Installing dependencies...
cd server
if not exist node_modules (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed

echo.
echo [4/4] Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB service might already be running or needs manual start
)

echo.
echo ========================================
echo    Starting MediCare Backend Server
echo ========================================
echo.
echo 🌐 Backend API: http://localhost:5000
echo 📊 Health Check: http://localhost:5000/health
echo 📁 Frontend: Open src/html/index.html in browser
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
