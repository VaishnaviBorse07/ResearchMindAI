@echo off
echo Starting ResearchMind AI Backend...
cd /d "%~dp0backend"

if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please edit backend\.env with your settings before continuing.
    pause
)

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

echo Downloading spaCy model...
python -m spacy download en_core_web_sm

echo Starting FastAPI server on http://localhost:8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
