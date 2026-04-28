@echo off
echo Testing LOOKUP endpoint for category
echo Reading payload from payload/lookup.json
echo.
type payload\lookup.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/category/lookup ^
  -H "Content-Type: application/json" ^
  -H "x-request-mode: static" ^
  -d @payload/lookup.json

echo.
echo Demo LOOKUP completed.
pause
