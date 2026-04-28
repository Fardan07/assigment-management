@echo off
echo Testing LOOKUP endpoint for customer
echo Reading payload from payload/lookup.json
echo.
type payload\lookup.json
echo.

curl -X POST http://localhost:3000/api/mini-inventory/customer/lookup ^
  -H "Content-Type: application/json" ^
  -H "x-request-mode: static" ^
  -d @payload/lookup.json

echo.
echo Demo LOOKUP completed.
pause
