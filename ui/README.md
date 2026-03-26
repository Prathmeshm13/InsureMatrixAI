# InsureMatrix AI - FREE Vercel Deployment

Production-ready React dashboard for InsureMatrixAI agent monitoring with MongoDB backend.

## Quick Deploy (FREE)

### Option 1: Automated Script
```bash
.\vercel-deploy.bat
```

### Option 2: Manual Steps
```bash
npm install -g vercel
vercel login
vercel --prod
```

## Features
- ✅ **100% FREE** hosting on Vercel
- ✅ Serverless MongoDB API
- ✅ React dashboard with real-time data
- ✅ Automatic deployments on git push

## URLs After Deploy
- **Dashboard**: `https://your-project.vercel.app`
- **API**: `https://your-project.vercel.app/mongo-api/health`

## Environment
- **Frontend**: Vercel static hosting
- **Backend**: Vercel serverless functions
- **Database**: MongoDB Atlas (free tier)

## Upload Data
```bash
npm run upload
```

## Stack
- React 19 + TypeScript + Vite
- TailwindCSS + Radix UI
- MongoDB Atlas
- Vercel (free tier)