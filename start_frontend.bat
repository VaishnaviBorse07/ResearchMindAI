@echo off
echo Starting ResearchMind AI Frontend...
cd /d "%~dp0frontend"
echo Installing npm packages (if needed)...
npm install
echo Starting Vite dev server on http://localhost:5173
npm run dev
