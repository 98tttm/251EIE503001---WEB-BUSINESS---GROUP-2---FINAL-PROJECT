@echo off
echo ========================================
echo    MediCare Data Normalization & Import
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
echo [3/4] Normalizing product data...
cd server
node scripts/normalizeData.js
if %errorlevel% neq 0 (
    echo ❌ Data normalization failed
    pause
    exit /b 1
)
echo ✅ Data normalized successfully

echo.
echo [4/4] Importing data to MongoDB...
echo Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB service might already be running
)

echo Importing data...
node scripts/importData.js
if %errorlevel% neq 0 (
    echo ❌ Data import failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Data Processing Completed!
echo ========================================
echo.
echo ✅ Product data normalized
echo ✅ Data imported to MongoDB
echo ✅ Database ready for use
echo.
echo Next steps:
echo 1. Run start.bat to start the server
echo 2. Open src/html/index.html in your browser
echo.
pause

