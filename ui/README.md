# InsureMatrix AI - Production Dashboard

Production-ready React dashboard for InsureMatrixAI agent monitoring with MongoDB backend.

## Quick Start

### Local Development
```bash
npm install
npm run dev          # Frontend only
npm start           # Backend API only
```

### Production Build
```bash
npm run build
```

### Deploy to Render
1. Push code to GitHub
2. Go to render.com/dashboard
3. New Blueprint → Connect your repo
4. Render will auto-deploy both services from render.yaml

## Services
- **Backend API**: Express server connected to MongoDB Atlas
- **Frontend**: Static React app (Vite)

## Environment Variables
See `.env.example` for required variables.

## Upload Data
```bash
npm run upload
```

## Stack
- React 19 + TypeScript
- Vite 8
- TailwindCSS
- MongoDB Atlas
- Express.js
