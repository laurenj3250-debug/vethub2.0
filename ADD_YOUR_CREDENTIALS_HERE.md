# 🔑 Add Your Credentials Here

## Quick Setup (2 Minutes)

### Step 1: Create `.env.local`

In your project root (`/Users/laurenjohnston/Documents/vethub2.0/`), create a file called `.env.local`:

```bash
# Copy the existing example
cp .env.example .env.local
```

Or create it manually:
```bash
touch .env.local
```

### Step 2: Add Your Credentials

Open `.env.local` in your editor and add these lines:

```bash
# Copy all existing variables from .env.example first, then add:

# EzyVet Integration
EZYVET_API_KEY=paste_your_ezyvet_api_key_here
EZYVET_PARTNER_ID=paste_your_partner_id_here
EZYVET_BASE_URL=https://api.trial.ezyvet.com/v2

# VetRadar Integration
VETRADAR_USERNAME=paste_your_vetradar_email_here
VETRADAR_PASSWORD=paste_your_vetradar_password_here
VETRADAR_BASE_URL=https://vetradar.com
```

### Step 3: Replace Placeholders

Replace the placeholder text with your actual credentials:

- **EZYVET_API_KEY**: Long token from EzyVet Settings → API Access
- **EZYVET_PARTNER_ID**: Number from EzyVet API settings
- **VETRADAR_USERNAME**: Your VetRadar login email
- **VETRADAR_PASSWORD**: Your VetRadar password

### Step 4: Save and Restart

1. Save `.env.local`
2. Restart your dev server:
   ```bash
   npm run dev
   ```
3. Visit: http://localhost:3000/integrations

### Step 5: Test It!

Click **Test Connection** under EzyVet to verify it works!

---

## Example (with fake credentials)

```bash
# EzyVet Integration
EZYVET_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
EZYVET_PARTNER_ID=12345
EZYVET_BASE_URL=https://api.trial.ezyvet.com/v2

# VetRadar Integration
VETRADAR_USERNAME=drjohnson@acmevet.com
VETRADAR_PASSWORD=MySecurePassword123!
VETRADAR_BASE_URL=https://vetradar.com
```

---

## Security Notes

✅ **Safe:** `.env.local` is in `.gitignore` (won't be committed)
✅ **Private:** Credentials only used on your local machine
✅ **Secure:** Never exposed to browser (server-side only)

❌ **Don't:** Share your `.env.local` file with anyone
❌ **Don't:** Commit it to git (it's ignored by default)
❌ **Don't:** Post credentials in chat/Slack

---

## Where to Get Your Credentials

### EzyVet

1. Go to https://ezyvet.com
2. Log in to your account
3. Click **Settings** (gear icon)
4. Click **API Access** or **Integrations**
5. Click **Generate API Key**
6. Copy the **API Key** and **Partner ID**

### VetRadar

Just use your normal VetRadar login email and password.

**Note:** If you have 2FA enabled, you may need to create a separate account without 2FA for the integration.

---

## Troubleshooting

### "File not found: .env.local"

**You need to create the file first:**
```bash
cd /Users/laurenjohnston/Documents/vethub2.0
touch .env.local
```

Then edit it and add your credentials.

### "Credentials not configured"

**Your .env.local exists but variables are wrong:**
1. Check spelling (EZYVET_API_KEY, not EZYVET_APIKEY)
2. No quotes needed around values
3. No spaces around the `=` sign

**Good:** `EZYVET_API_KEY=abc123`
**Bad:** `EZYVET_API_KEY = "abc123"`

### Still not working?

1. Make sure `.env.local` is in the project root (same folder as `package.json`)
2. Restart your dev server: `npm run dev`
3. Check the terminal for error messages
4. Try testing the API directly:
   ```bash
   curl http://localhost:3000/api/integrations/ezyvet/test
   ```

---

## What Happens Next?

Once your credentials are added:

1. ✅ VetHub can connect to EzyVet
2. ✅ VetHub can scrape VetRadar
3. ✅ You can sync patient data with one click
4. ✅ You eliminate manual data entry
5. ✅ You save hours of time per week

---

**Ready? Create your `.env.local` file and paste your credentials!**

**Need help?** Check `INTEGRATION_SETUP.md` for detailed instructions.

---

*Last Updated: November 14, 2025*
