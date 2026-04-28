@echo off
echo Testing CREATE endpoint for stock-inbound
echo Reading payload from payload/create.json
echo.
type payload\create.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/stock-inbound/create ^
  -H "Content-Type: application/json" ^
  -d @payload/create.json

echo.
echo Demo CREATE completed.
pause
