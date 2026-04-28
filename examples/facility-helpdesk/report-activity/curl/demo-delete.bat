@echo off
echo Testing DELETE endpoint for report-activity
echo Reading payload from payload/delete.json
echo.
type payload\delete.json
echo.

curl -X POST http://localhost:3000/api/facility-helpdesk/report-activity/delete ^
  -H "Content-Type: application/json" ^
  -d @payload/delete.json

echo.
echo Demo DELETE completed.
pause
