@echo off
REM Start backend in demo-test mode with compressed intervals
REM CHECK_INTERVAL=10s, SNAPSHOT_INTERVAL=10s, MIN_INTERVAL=10s
set WORKER_CHECK_INTERVAL_MS=10000
set WORKER_SNAPSHOT_INTERVAL_MS=10000
set WORKER_MIN_INTERVAL_MS=10000
echo Starting backend in demo-test mode (10s intervals)...
cd /d "%~dp0"
node src/server.js
