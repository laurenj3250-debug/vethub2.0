# Gemini AI Setup (FREE!)

The app now uses Google's Gemini AI for parsing - it's **completely free** and works great with Firebase!

## Quick Setup (2 minutes)

### 1. Get a FREE Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Add the Key to Your App

**Option A: In Firebase Studio**
```bash
echo 'GEMINI_API_KEY=AIza...' >> .env.local
```

**Option B: Manual**
- Open `.env.local` file
- Replace `GEMINI_API_KEY=` with `GEMINI_API_KEY=AIzaYourKeyHere`

### 3. Restart the Server

```bash
pkill -f "next dev"
npm run dev
```

Done! AI parsing should now work.

## Features

### Appointments Page
- Go to `/appointments`
- Check "🤖 Use AI Parsing"
- Paste patient history
- Click "Add to List"

### Rounding Sheet (Main Page)
- Expand any patient's "Rounding Sheet" section
- Check "🤖 Use AI Parsing"
- Paste patient details
- Click "Extract with AI"

## Why Gemini?

✅ **FREE** - No credit card required
✅ **Fast** - Gemini 1.5 Flash is optimized for speed
✅ **Good with Firebase** - Built by Google
✅ **Generous limits** - 15 requests/minute, 1 million tokens/minute free

## Troubleshooting

**"AI service not configured"**
- Make sure `GEMINI_API_KEY=` has your actual key in `.env.local`
- Restart the server after adding the key

**"AI parsing failed"**
- Check your API key is valid at https://aistudio.google.com/app/apikey
- The app will automatically fall back to local regex parsing if AI fails
- Check browser console (F12) for detailed error messages

**Still using Anthropic/Claude?**
- The old Claude routes (`/api/parse-appointment` and `/api/parse-rounding`) still work
- The new Gemini routes are `/api/parse-appointment-gemini` and `/api/parse-rounding-gemini`
- The app now uses Gemini by default

## Cost Comparison

| Service | Cost | Free Tier |
|---------|------|-----------|
| **Gemini** | FREE | 15 req/min, 1M tokens/min |
| Claude (Anthropic) | $3/million input tokens | None - requires credit card |

Gemini is perfect for this use case!
