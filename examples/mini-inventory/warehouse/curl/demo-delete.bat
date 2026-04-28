@echo off
echo Testing DELETE endpoint for warehouse
echo Reading payload from payload/delete.json
echo.
type payload\delete.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/warehouse/delete ^
  -H "Content-Type: application/json" ^
  -d @payload/delete.json

echo.
echo Demo DELETE completed.
pause
