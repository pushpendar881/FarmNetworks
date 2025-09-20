@echo off
@echo off
echo ========================================
echo  FarmNetworks Dual Portal System
echo ========================================
echo.

echo Installing dependencies for Seller Portal...
cd seller
call npm install
if %errorlevel% neq 0 (
    echo Failed to install seller dependencies
    pause
    exit /b 1
)

echo.
echo Installing dependencies for Admin Portal...
cd ..\admin
call npm install
if %errorlevel% neq 0 (
    echo Failed to install admin dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Starting Development Servers
echo ========================================
echo.
echo Seller Portal: http://localhost:5174
echo   - Login: http://localhost:5174/auth/login
echo   - Test Login: http://localhost:5174/test-login
echo.
echo Admin Portal: http://localhost:5175  
echo   - Login: http://localhost:5175/auth/login
echo   - Test Login: http://localhost:5175/test-login
echo.
echo Press Ctrl+C in each terminal to stop servers
echo ========================================
echo.

start "Seller Portal" cmd /k "cd /d %~dp0seller && echo Starting Seller Portal... && npm run dev"
start "Admin Portal" cmd /k "cd /d %~dp0admin && echo Starting Admin Portal... && npm run dev"

echo Both portals are starting...
echo Check the opened terminal windows for any errors
echo.
echo Press any key to exit this window
pause > nul