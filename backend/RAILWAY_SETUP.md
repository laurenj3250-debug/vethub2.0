# Railway Deployment Guide

## Quick Setup (5 minutes)

### 1. Get Your Database URL

In your Railway dashboard:
1. Click on your PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` value (starts with `postgresql://`)

### 2. Set Environment Variables

In Railway, click on your backend service → Variables → Add these:

```
DATABASE_URL=<paste_the_postgres_url_here>
JWT_SECRET=<generate_random_32_character_string>
NODE_ENV=production
```

**Generate JWT_SECRET:**
```bash
# Run this in your terminal to generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy

#### Option A: From Git (Recommended)

1. Push your code to GitHub
2. In Railway, connect your GitHub repo
3. Select the `backend` directory as root
4. Railway will auto-deploy on every push

#### Option B: Railway CLI

```bash
cd backend
npm install -g @railway/cli
railway login
railway link  # Select your project
railway up
```

### 4. Get Your API URL

After deployment, Railway will give you a URL like:
```
https://your-app.railway.app
```

Copy this URL - you'll need it for the frontend!

### 5. Test It

```bash
curl https://your-app.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Troubleshooting

**"Migration failed"**
- Check DATABASE_URL is correct
- Make sure PostgreSQL service is running
- Check logs in Railway dashboard

**"JWT_SECRET not configured"**
- Make sure you added JWT_SECRET to environment variables

**"Cannot connect to database"**
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Check PostgreSQL service is running in Railway
