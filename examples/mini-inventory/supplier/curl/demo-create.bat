@echo off
echo Testing CREATE endpoint for supplier
echo Reading payload from payload/create.json
echo.
type payload\create.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/supplier/create ^
  -H "Content-Type: application/json" ^
  -d @payload/create.json

echo.
echo Demo CREATE completed.
pause
