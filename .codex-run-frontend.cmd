@echo off
setlocal
cd /d E:\University\Graduted Project\Edu-platform\frontend-web
set VITE_API_BASE=http://127.0.0.1:8002
set VITE_WS_URL=ws://127.0.0.1:8002
npm.cmd run dev -- --host 127.0.0.1 --port 4174
