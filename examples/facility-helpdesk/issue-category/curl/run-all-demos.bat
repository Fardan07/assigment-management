@echo off
echo Running all demo files for issue-category
echo.

echo 1. Testing CREATE...
call demo-create.bat
echo.

echo 2. Testing FIRST...
call demo-first.bat
echo.

echo 3. Testing READ...
call demo-read.bat
echo.

echo 4. Testing LOOKUP...
call demo-lookup.bat
echo.

echo 5. Testing DATATABLES...
call demo-datatables.bat
echo.

echo 6. Testing UPDATE...
call demo-update.bat
echo.

echo 7. Testing DELETE...
call demo-delete.bat
echo.

echo All demos completed!
pause
