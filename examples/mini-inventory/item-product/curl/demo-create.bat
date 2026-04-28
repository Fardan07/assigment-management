@echo off
echo Testing CREATE endpoint for item-product
echo Reading payload from payload/create.json
echo.
type payload\create.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/item-product/create ^
  -H "Content-Type: application/json" ^
  -d @payload/create.json

echo.
echo Demo CREATE completed.
pause
