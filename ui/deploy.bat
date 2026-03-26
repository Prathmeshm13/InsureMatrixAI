@echo off
echo ========================================
echo InsureMatrix AI - Production Deployment
echo ========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    git add .
    git commit -m "Initial production commit"
) else (
    echo Git repository already initialized
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Building production bundle...
call npm run build

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Create a GitHub repository
echo 2. Run: git remote add origin YOUR_GITHUB_REPO_URL
echo 3. Run: git push -u origin main
echo 4. Go to render.com and deploy using Blueprint (render.yaml)
echo.
echo Or deploy manually:
echo - Backend API: Upload this folder to Render Web Service
echo - Frontend: Deploy dist/ folder to Render Static Site
echo.
pause
