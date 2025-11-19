# Google Docs Sticker Template Setup Guide

This guide will help you create perfectly sized sticker templates in Google Docs for VetHub patient labels.

## Big Patient Labels (70mm × 45mm)

### Step 1: Create New Google Doc

1. Go to https://docs.google.com/
2. Click **Blank document**
3. Name it "VetHub Big Patient Label Template"

### Step 2: Set Page Size

1. Click **File** → **Page setup**
2. Set the following:
   - **Width**: 2.76 inches (70mm)
   - **Height**: 1.77 inches (45mm)
   - **Orientation**: Landscape
   - **Margins**: Top/Bottom/Left/Right = 0.12 inches
3. Click **OK**

### Step 3: Add Content with Placeholders

Copy and paste this EXACT text into your document (including the curly braces):

```
{{PatientName}} {{ClientID}} {{PatientID}}
{{OwnerName}} {{OwnerPhone}}
Species: ({{Species}})
Breed: {{Breed}}  Color: {{Color}}
Sex: {{Sex}}  Weight: {{Weight}}
DOB: {{DOB}}  Age: {{Age}}
```

### Step 4: Format the Text

**Line 1 (Patient Name + IDs):**
- Select `{{PatientName}}` and the space after it
- Font: Arial
- Size: 11pt
- Bold: Yes

- Select `{{ClientID}}`
- Font: Arial
- Size: 9pt
- Bold: No

- Select `{{PatientID}}`
- Font: Arial
- Size: 11pt
- Bold: Yes

**Line 2 (Owner Info):**
- Select `{{OwnerName}}`
- Font: Arial
- Size: 11pt
- Bold: Yes

- Select `{{OwnerPhone}}`
- Font: Arial
- Size: 9pt
- Bold: No

**Lines 3-6 (All remaining lines):**
- Select all text from "Species:" to end
- Font: Arial
- Size: 9pt
- Bold labels only (Species:, Breed:, Color:, Sex:, Weight:, DOB:, Age:)

### Step 5: Adjust Line Spacing

1. Select all text
2. Click **Format** → **Line & paragraph spacing** → **Custom spacing**
3. Set:
   - Line spacing: 1.15
   - Before paragraph: 0
   - After paragraph: 2pt

### Step 6: Get the Document ID

1. Look at the URL of your document
2. Copy the document ID from:
   `https://docs.google.com/document/d/DOCUMENT_ID_HERE/edit`
3. Save this ID - you'll need it for environment variables

### Step 7: Share the Document

1. Click **Share** button
2. Under "General access", select **Anyone with the link** → **Editor**
3. Click **Done**

---

## Tiny Diagnostic Labels (32mm × 21mm / 1.26" × 0.83")

### Step 1: Create New Google Doc

1. Go to https://docs.google.com/
2. Click **Blank document**
3. Name it "VetHub Tiny Diagnostic Label Template"

### Step 2: Set Page Size

1. Click **File** → **Page setup**
2. Set the following:
   - **Width**: 1.26 inches (32mm)
   - **Height**: 0.83 inches (21mm)
   - **Orientation**: Landscape
   - **Margins**: All = 0.05 inches
3. Click **OK**

### Step 3: Add Content

Copy and paste this text:

```
{{Date}} {{PatientName}}
MRN: {{MRN}}
Owner: {{OwnerName}}
{{Species}} / {{Breed}}
{{Sex}} / {{Age}}
ID: _______________
```

### Step 4: Format the Text

**Line 1 (Date + Name):**
- Select `{{Date}}`
- Font: Arial
- Size: 5pt
- Bold: Yes

- Select `{{PatientName}}`
- Font: Arial
- Size: 7pt
- Bold: Yes
- Transform: UPPERCASE

**Lines 2-5:**
- Font: Arial
- Size: 6pt
- Bold: No

**Line 6 (ID line):**
- Select "ID:"
- Font: Arial
- Size: 5pt
- Bold: Yes

### Step 5: Adjust Line Spacing

1. Select all text
2. Click **Format** → **Line & paragraph spacing** → **Custom spacing**
3. Set:
   - Line spacing: 1.0
   - Before paragraph: 0
   - After paragraph: 1pt

### Step 6: Get the Document ID

1. Copy the document ID from the URL
2. Save this ID for environment variables

### Step 7: Share the Document

1. Click **Share** → **Anyone with the link** → **Editor**

---

## Environment Variables to Add to Railway

After creating both templates, you'll need to add these environment variables to Railway:

```env
# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://empathetic-clarity-production.up.railway.app/api/auth/google/callback

# Template IDs (from Google Docs URLs)
GOOGLE_DOCS_BIG_LABEL_TEMPLATE_ID=your-big-label-doc-id
GOOGLE_DOCS_TINY_LABEL_TEMPLATE_ID=your-tiny-label-doc-id

# Google Refresh Token (you'll get this after first OAuth)
GOOGLE_REFRESH_TOKEN=
```

---

## Alternative: Quick PDF Stickers (No Setup Required)

The PDF sticker system already works! You can:

1. Go to your patient list on https://empathetic-clarity-production.up.railway.app/
2. Click on any patient
3. Look for sticker/label buttons
4. Click to download PDF stickers that print on standard Avery labels

The PDF system uses:
- **Big Labels**: Avery 5163 (2" x 4" shipping labels)
- **Tiny Labels**: Avery 5160 (1" x 2.625" address labels)

No Google setup needed - just print!

---

## Troubleshooting

**Q: The text doesn't fit on one label**
A: Reduce font sizes by 1pt across the board

**Q: There's too much white space**
A: Reduce margins to 0.08 inches

**Q: I can't set custom page size**
A: Make sure you're in Google Docs (not Google Sheets or Slides)

**Q: How do I print multiple labels?**
A: The system automatically duplicates the label based on patient type (Surgery, MRI, Medical)
