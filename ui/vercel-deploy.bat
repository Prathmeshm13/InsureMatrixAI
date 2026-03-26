@echo off
echo ============================================
echo  InsureMatrix Dashboard - FREE Vercel Deploy
echo ============================================
echo.

echo Step 1: Installing Vercel CLI globally...
call npm install -g vercel

echo.
echo Step 2: Login to Vercel (opens browser)...
call vercel login

echo.
echo Step 3: Deploying to production...
call vercel --prod

echo.
echo ============================================
echo  DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Your app is now live at the URL shown above!
echo.
echo API Health Check:
echo curl YOUR_APP_URL/mongo-api/health
echo.
echo To update: git push
echo Vercel auto-deploys on every push!
echo.
pause
