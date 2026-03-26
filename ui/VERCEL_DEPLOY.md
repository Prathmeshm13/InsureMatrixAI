# FREE Vercel Deployment Guide

## ✅ What You'll Get (100% FREE)
- **Frontend**: Static React dashboard
- **Backend**: Serverless API functions
- **Database**: MongoDB Atlas (already free tier)
- **Domain**: `your-project.vercel.app`

## 🚀 Quick Deploy Steps

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
- Opens browser for GitHub login
- Authorize Vercel

### Step 3: Deploy
```bash
vercel --prod
```

**That's it!** Vercel will:
- Detect `vercel.json` configuration
- Deploy frontend + backend automatically
- Provide live URLs

---

## 📋 Detailed Steps

### 1. Prerequisites
- GitHub account
- Vercel account (free)
- MongoDB Atlas (already configured)

### 2. Push Code to GitHub
```bash
# Initialize Git (if needed)
git init
git add .
git commit -m "Vercel deployment ready"

# Create GitHub repo and push
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 3. Install Vercel CLI
```bash
npm install -g vercel
```

### 4. Login & Deploy
```bash
vercel login
vercel --prod
```

Vercel will ask:
- Link to existing project? **No**
- Project name: `insurematrix-dashboard` (or any)
- Directory: `./` (press Enter)

### 5. Set Environment Variables
Vercel will prompt for env vars. Use these:

```
VITE_MONGO_URI = mongodb+srv://prathmeshmahakal35_db_user:qeEZjJ9Hsmq0WB9V@clusteraimatrix1.veynb2f.mongodb.net/?appName=ClusterAIMatrix1
VITE_MONGO_DB = instest
VITE_MONGO_COLL = results
```

---

## 🔍 Verify Deployment

After deployment, Vercel provides URLs:
- **Dashboard**: `https://your-project.vercel.app`
- **API Health**: `https://your-project.vercel.app/mongo-api/health`

Test the API:
```bash
curl https://your-project.vercel.app/mongo-api/health
```

Should return: `{"ok":true,"db":"instest","collection":"results"}`

---

## 📊 Upload Data (Optional)

If MongoDB is empty:
```bash
npm run upload
```

---

## 💰 Cost Breakdown

**TOTAL: $0/month**

- **Vercel**: 100GB bandwidth/month FREE
- **MongoDB Atlas**: M0 cluster FREE
- **Domain**: Free `.vercel.app` subdomain

---

## 🔄 Updates

To update your app:
```bash
git add .
git commit -m "Your changes"
git push
```

Vercel auto-deploys on every push! ⚡

---

## 🐛 Troubleshooting

### Build Fails?
```bash
vercel logs
```

### API Not Working?
- Check environment variables in Vercel dashboard
- Verify MongoDB Atlas IP whitelist (add `0.0.0.0/0`)

### Cold Starts?
- Serverless functions may take 1-2 seconds on first request
- This is normal for free tier

---

## 🎯 Architecture

```
User → Vercel Edge Network
       ↓
Frontend (Static React)
       ↓
API Routes (/api/mongo-api.js)
       ↓
MongoDB Atlas
```

**All serverless - scales automatically!**

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Free community support
- No credit card required