@echo off
echo Testing READ endpoint for maintenance-report
echo Reading payload from payload/read.json
echo.
type payload\read.json
echo.

curl -X POST http://localhost:3000/api/facility-helpdesk/maintenance-report/read ^
  -H "Content-Type: application/json" ^
  -d @payload/read.json

echo.
echo Demo READ completed.
pause
