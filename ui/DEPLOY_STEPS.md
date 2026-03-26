# Step-by-Step Deployment Guide

## ✅ Pre-Deployment Checklist (Already Done)
- [x] Cleaned up unnecessary files
- [x] Configured production environment
- [x] Built production bundle (dist/ folder)
- [x] Fixed security vulnerabilities

---

## 📦 Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - Repository name: `insurematrix-dashboard` (or any name)
   - Make it **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license
3. Copy the repository URL (e.g., `https://github.com/yourusername/insurematrix-dashboard.git`)

---

## 💻 Step 2: Push Code to GitHub

Open PowerShell in the `ui` folder and run:

```powershell
# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Production ready: InsureMatrix Dashboard"

# Add your GitHub repository
git remote add origin YOUR_GITHUB_REPO_URL

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_GITHUB_REPO_URL` with the URL from Step 1.

---

## 🚀 Step 3: Deploy on Render

### 3.1 Sign Up / Login to Render
1. Go to https://render.com
2. Sign up or login (use GitHub for easy connection)

### 3.2 Deploy Using Blueprint
1. Click **"New +"** button (top right)
2. Select **"Blueprint"**
3. Click **"Connect account"** to link your GitHub
4. Select the repository you created in Step 1
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### 3.3 What Happens Next
Render will create TWO services:
- **insurematrix-api** (Backend - MongoDB API)
- **insurematrix-ui** (Frontend - React Dashboard)

Both will deploy automatically!

---

## ⚙️ Step 4: Configure Environment Variables (Auto-configured)

The `render.yaml` already includes:
- MongoDB connection string
- Database name: `instest`
- Collection name: `results`

**No manual configuration needed!** ✅

---

## 🔍 Step 5: Verify Deployment

### Check Backend API
1. Go to Render Dashboard → **insurematrix-api**
2. Wait for status to show **"Live"** (takes 2-5 minutes)
3. Copy the service URL (e.g., `https://insurematrix-api.onrender.com`)
4. Test health: `https://insurematrix-api.onrender.com/mongo-api/health`
   - Should return: `{"ok":true,"db":"instest","collection":"results"}`

### Check Frontend UI
1. Go to Render Dashboard → **insurematrix-ui**
2. Wait for status to show **"Live"** (takes 2-3 minutes)
3. Copy the service URL (e.g., `https://insurematrix-ui.onrender.com`)
4. Open in browser - you should see the dashboard!

---

## 📊 Step 6: Upload Data to MongoDB (If Needed)

If MongoDB is empty, upload data locally:

```powershell
npm run upload
```

This uploads `public/evaluation_results.jsonl` to MongoDB Atlas.

---

## 🎉 Done! Your URLs:

After deployment completes:
- **Dashboard**: `https://insurematrix-ui.onrender.com`
- **API**: `https://insurematrix-api.onrender.com`

---

## 🐛 Troubleshooting

### Deployment Failed?
1. Check Render logs (click on service → Logs tab)
2. Verify MongoDB connection string is correct
3. Ensure GitHub repo has all files

### Can't Connect to MongoDB?
1. Go to MongoDB Atlas → Network Access
2. Add **"0.0.0.0/0"** to IP whitelist (allows Render to connect)
3. Redeploy on Render

### UI Not Loading?
1. Check if backend is live first
2. Verify CORS is enabled (already configured in mongo-api.cjs)
3. Check browser console for errors

---

## 💰 Cost

**100% FREE!**
- Render Free Tier: 750 hours/month (enough for both services)
- MongoDB Atlas: M0 cluster free tier (already in use)

**Note**: Free tier services may spin down after 15 minutes of inactivity.
First request after spin-down takes ~30 seconds to wake up.

---

## 🔄 Future Updates

To update your deployment:

```powershell
git add .
git commit -m "Your update message"
git push
```

Render auto-deploys on every push! 🚀

---

## 📞 Support

If you encounter issues:
1. Check Render logs
2. Check MongoDB Atlas connection
3. Verify environment variables in render.yaml
