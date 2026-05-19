@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
  echo First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting employee daily report server...
echo Your browser will open to http://localhost:3000
call npm start
