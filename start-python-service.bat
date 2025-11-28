@echo off
echo ========================================
echo PDF Table Extraction - Python Backend
echo ========================================
echo.

cd python-backend

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo.
echo Checking virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo Starting PDF Extraction Service...
echo ========================================
echo.
echo Service will run on: http://localhost:5001
echo.
echo Press Ctrl+C to stop the service
echo.

python pdf_service.py

pause
