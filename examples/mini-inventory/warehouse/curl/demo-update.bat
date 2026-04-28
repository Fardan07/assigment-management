@echo off
echo Testing UPDATE endpoint for warehouse
echo Reading payload from payload/update.json
echo.
type payload\update.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/warehouse/update ^
  -H "Content-Type: application/json" ^
  -d @payload/update.json

echo.
echo Demo UPDATE completed.
pause
