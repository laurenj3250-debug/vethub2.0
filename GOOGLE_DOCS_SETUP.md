# Google Docs Label Template Setup Guide

This guide will help you set up Google Docs templates for generating perfectly formatted patient labels.

## Why Google Docs?

✅ **WYSIWYG** - Design the exact format you want visually
✅ **No HTML/CSS headaches** - Google handles all the layout
✅ **Easy to adjust** - Change fonts, spacing, alignment anytime
✅ **Consistent output** - Same format every time
✅ **Built-in Avery templates** - Use actual label templates

## Step 1: Create Your Label Template

### 1.1 Create a New Google Doc
1. Go to https://docs.google.com/
2. Click "+ Blank document"
3. Name it "VetHub Big Label Template"

### 1.2 Set Up the Page
1. Go to **File > Page setup**
2. Set paper size to **Custom: 3.5" x 2"** (or use Avery 5163 template)
3. Set all margins to **0.1"**
4. Click **OK**

### 1.3 Design Your Label
Use this format as a starting point:

```
{{PatientName}}  TF_{{ClientID}}  {{PatientID}}

{{OwnerName}}  {{OwnerPhone}}

Species: ({{Species}})
Breed: {{Breed}}
Color: {{Color}}

Sex: {{Sex}}     Weight: {{Weight}}
DOB: {{DOB}}     Age: {{Age}}
```

**Formatting tips:**
- Use **Arial or Helvetica** font
- Patient name: **Bold, 14pt**
- TF number: **Regular, 8pt**
- Patient ID: **Bold, 14pt**
- Everything else: **9-12pt**
- Add spacing between sections using Enter key

### 1.4 Add Bold/Formatting
- Make labels like "Species:", "Breed:", "Sex:" bold
- Make patient name and patient ID bold
- Keep TF number regular weight

## Step 2: Get Your Template ID

1. With your template document open, look at the URL
2. Copy the document ID from the URL:
   ```
   https://docs.google.com/document/d/1abc123XYZ456.../edit
                                    ^^^^^^^^^^^^^^^^^
                                    This is your template ID
   ```
3. Save this ID - you'll need it in Step 4

## Step 3: Set Up Google Cloud Project

### 3.1 Create a Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click **Select a project** → **New Project**
3. Name it "VetHub Labels"
4. Click **Create**

### 3.2 Enable Required APIs
1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for and enable:
   - **Google Docs API**
   - **Google Drive API**

### 3.3 Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User type: **External**
   - App name: **VetHub**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Skip for now
   - Test users: Add your email
   - Click **Save and Continue**
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: **VetHub Labels**
   - Authorized redirect URIs:
     - `https://empathetic-clarity-production.up.railway.app/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (for local testing)
   - Click **Create**
5. **Download the JSON** file (client_secret_xxx.json)

## Step 4: Configure VetHub

### 4.1 Add Environment Variables
In your Railway dashboard (or `.env.local` for local testing), add:

```bash
# Google Docs Template IDs
GOOGLE_DOCS_BIG_LABEL_TEMPLATE_ID=your_template_id_from_step_2

# Google OAuth Credentials (from the JSON file you downloaded)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://empathetic-clarity-production.up.railway.app/api/auth/google/callback
```

### 4.2 Authorize VetHub to Access Your Google Docs
1. Go to your VetHub dashboard
2. Click **Settings** (we'll add this button)
3. Click **Connect Google Docs**
4. Sign in with your Google account
5. Click **Allow** to grant permissions

## Step 5: Test It!

1. Go to your patient list
2. Click **Print > Big Labels**
3. VetHub will:
   - Copy your template
   - Fill in patient data
   - Generate a PDF
   - Open the print dialog
4. Print your perfectly formatted labels! 🎉

## Troubleshooting

### "Template ID not configured"
- Make sure you added `GOOGLE_DOCS_BIG_LABEL_TEMPLATE_ID` to your environment variables
- Restart Railway after adding environment variables

### "Failed to copy template"
- Make sure the template document is shared with "Anyone with the link can view"
- Or share it specifically with your VetHub Google account email

### "OAuth error"
- Make sure your redirect URI exactly matches what you configured in Google Cloud Console
- Check that Google Docs API and Google Drive API are enabled

### Labels don't look right
- Edit your Google Docs template directly
- Adjust fonts, spacing, bold formatting
- No need to redeploy - changes take effect immediately!

## Advanced: Multiple Labels per Patient

Want to print 6 labels for a new admission? Update your template:

1. In your Google Docs template, duplicate the label content 6 times
2. Use the same placeholders - they'll all get replaced with the same data
3. Add page breaks between labels if needed

## Need Help?

The beauty of Google Docs templates is that you can adjust them anytime without code changes. Just edit the template document and the next time you print labels, it'll use the new format!
