@echo off
cd /d "%~dp0"

if not exist "config.js" (
  echo config.js not found.
  echo Copy config.example.js to config.js and add your Supabase URL and anon key.
  pause
  exit /b 1
)

echo Starting local preview at http://localhost:3000
echo Data is stored in Supabase, not on this machine.
start "" "http://localhost:3000"
call npx serve . -l 3000
