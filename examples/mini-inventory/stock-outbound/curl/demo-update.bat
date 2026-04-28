@echo off
echo Testing UPDATE endpoint for stock-outbound
echo Reading payload from payload/update.json
echo.
type payload\update.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/stock-outbound/update ^
  -H "Content-Type: application/json" ^
  -d @payload/update.json

echo.
echo Demo UPDATE completed.
pause
