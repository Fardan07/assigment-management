@echo off
echo Testing READ endpoint for stock-outbound
echo Reading payload from payload/read.json
echo.
type payload\read.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/stock-outbound/read ^
  -H "Content-Type: application/json" ^
  -d @payload/read.json

echo.
echo Demo READ completed.
pause
