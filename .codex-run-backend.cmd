@echo off
setlocal
cd /d E:\University\Graduted Project\Edu-platform\backend
"E:\University\Graduted Project\Edu-platform\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8002
