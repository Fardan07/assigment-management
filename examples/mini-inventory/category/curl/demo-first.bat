@echo off
echo Testing FIRST endpoint for category
echo Reading payload from payload/first.json
echo.
type payload\first.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/category/first ^
  -H "Content-Type: application/json" ^
  -d @payload/first.json

echo.
echo Demo FIRST completed.
pause
