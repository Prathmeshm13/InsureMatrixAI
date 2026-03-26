@echo off
echo ============================================
echo  InsureMatrix Dashboard - Quick Deploy
echo ============================================
echo.

echo Step 1: Creating GitHub repository...
echo Please create a new repository at: https://github.com/new
echo.
set /p REPO_URL="Enter your GitHub repository URL: "

echo.
echo Step 2: Initializing Git and pushing code...
if not exist ".git" (
    git init
    echo Git initialized.
) else (
    echo Git already initialized.
)

echo.
echo Adding files...
git add .

echo.
echo Committing...
git commit -m "Production ready: InsureMatrix Dashboard"

echo.
echo Adding remote repository...
git remote add origin %REPO_URL% 2>nul
if errorlevel 1 (
    echo Remote already exists, updating...
    git remote set-url origin %REPO_URL%
)

echo.
echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ============================================
echo  SUCCESS! Code pushed to GitHub
echo ============================================
echo.
echo Next Steps:
echo 1. Go to https://render.com/dashboard
echo 2. Click "New +" -^> "Blueprint"
echo 3. Connect your GitHub repository
echo 4. Render will auto-deploy both services!
echo.
echo Your services will be:
echo - Backend API: insurematrix-api
echo - Frontend UI: insurematrix-ui
echo.
echo Deployment takes 2-5 minutes.
echo.
pause
