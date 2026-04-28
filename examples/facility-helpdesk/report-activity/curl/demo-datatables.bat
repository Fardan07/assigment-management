@echo off
echo Testing DATATABLES endpoint for report-activity
echo Reading payload from payload/datatables.json
echo.
type payload\datatables.json
echo.

curl -X POST http://localhost:3000/api/facility-helpdesk/report-activity/datatables ^
  -H "Content-Type: application/json" ^
  -d @payload/datatables.json

echo.
echo Demo DATATABLES completed.
pause
