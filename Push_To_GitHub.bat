@echo off
title Push To GitHub - Hope50034/nexus-quant
color 0b
echo ========================================================
echo   PUSHING ALL 29 COMMITS TO Hope50034/nexus-quant
echo ========================================================
echo.

set "PATH=C:\Program Files\Microsoft SQL Server Management Studio 22\Release\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd;C:\Program Files\Microsoft SQL Server Management Studio 22\Release\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\mingw64\bin;%PATH%"

cd /d "C:\Users\itintern\Desktop\Projects"

git add viral_shorts_output/
git commit -m "feat: add sample 45s viral short audio and subtitle package"
echo Pushing to origin main...
git push origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    color 0a
    echo   SUCCESS! All commits pushed to GitHub successfully!
    echo   You can now run 'git pull' on your Mac!
) else (
    color 0c
    echo   Push encountered an error. See above for details.
)
echo ========================================================
echo.
pause
