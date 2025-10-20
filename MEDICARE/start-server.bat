@echo off
echo Starting MediCare Server...

cd /d "%~dp0"

echo.
echo ========================================
echo   MediCare Server Startup Script
echo ========================================
echo.

echo [0/4] Checking MongoDB connection...
mongosh --eval "db.runCommand('ping')" --quiet
if %errorlevel% neq 0 (
    echo.
    echo ❌ MongoDB is not running or not installed!
    echo.
    echo Please:
    echo 1. Install MongoDB Community Server
    echo 2. Start MongoDB service
    echo 3. Run this script again
    echo.
    echo Download MongoDB: https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)
echo ✅ MongoDB is running

echo.
echo [1/4] Checking .env file...
if not exist "server\.env" (
    echo ❌ .env file not found!
    echo.
    echo Please create server\.env file with the following content:
    echo.
    echo NODE_ENV=development
    echo PORT=5000
    echo MONGODB_URI=mongodb://localhost:27017/MediCare_database
    echo JWT_SECRET=medicare_jwt_secret_key_2024_secure
    echo FRONTEND_URL=http://localhost:3000
    echo.
    pause
    exit /b 1
)
echo ✅ .env file found

echo.
echo [2/4] Installing dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

echo.
echo [3/4] Importing data to MongoDB...
call node scripts/importData.js
if %errorlevel% neq 0 (
    echo Error importing data!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting server...
echo.
echo 🚀 Server will start on http://localhost:5000
echo 📊 API endpoints available at http://localhost:5000/api
echo 🌐 Frontend should connect to http://localhost:5000
echo.
call npm start
if %errorlevel% neq 0 (
    echo Error starting server!
    pause
    exit /b 1
)

pause
