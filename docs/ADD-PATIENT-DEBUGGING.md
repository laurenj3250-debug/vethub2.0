# Add Patient Debugging Guide

## Issue: "Not creating anything" when pasting patient data

### Systematic Debugging Steps

#### 1. **Open Browser Console** (CRITICAL)
1. Go to https://empathetic-clarity-production.up.railway.app/
2. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
3. Click "Console" tab
4. Keep this open while testing

#### 2. **Paste Patient Data and Watch Console**

When you paste data and click "Add Patient", look for:

**✅ Expected Success Messages:**
```
Anthropic API Key status: Present (sk-ant-api...)
[API Client] Creating patient...
✨ Patient Added! Donut Rivera created with AI-parsed data
```

**❌ Possible Error Messages:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Anthropic API not available` | API key not set in Railway | Add `ANTHROPIC_API_KEY` environment variable |
| `AI parsing error: ...` | Claude API failed | Check API key is valid, check quota |
| `Add patient error: Network request failed` | API route `/api/patients` failing | Check Railway logs with `railway logs` |
| `Add patient error: Failed to create patient` | Database error | Check DATABASE_URL is set correctly |
| No error, no success | Frontend not calling API | Check browser console for JS errors |

#### 3. **Check Railway Logs**

```bash
railway logs --service empathetic-clarity-production
```

Look for:
- `POST /api/patients` - Should see the API call
- Database connection errors
- Prisma errors

#### 4. **Verify Environment Variables**

In Railway dashboard, check these are set:
- `ANTHROPIC_API_KEY` - For AI parsing
- `DATABASE_URL` - For PostgreSQL connection
- `NEXT_PUBLIC_ANTHROPIC_API_KEY` - For browser-side parsing

#### 5. **Test Parser Locally**

Run this to verify the parser works:
```bash
cd /Users/laurenjohnston/Documents/vethub2.0
ANTHROPIC_API_KEY="your-key" npx tsx scripts/test-donut-patient.ts
```

Should output:
```
✅ SUCCESS: Would create patient "Donut"
```

### Common Issues & Solutions

#### Issue: "Unnamed Patient" Created

**Cause**: Parser returned empty `patientName`

**Debug**:
1. Check browser console for parsed result
2. Look for: `patientName: ""` or `patientName: null`

**Solution**:
- Parser might be failing due to API key issue
- Or text format is very unusual and confusing the AI

#### Issue: Patient Created But Wrong Data

**Cause**: Parser extracted wrong fields

**Example**: Clinical notes appearing in owner name field

**Debug**:
```typescript
// In browser console after pasting, you'll see:
{
  patientName: "Bruno",
  ownerName: "elected to pursue MRI...",  // ❌ WRONG!
  ...
}
```

**Solution**: The AI parser is mis-identifying text. This can happen with:
- Very short snippets with only partial data
- Clinical notes mixed with demographics
- Unusual formatting

**Fix**: Improve the prompt in `/src/lib/ai-parser.ts` or use structured VetRadar import instead

#### Issue: Stickers Show Wrong Data

**Cause**: Database has contaminated data from previous import

**Solution**:
1. Delete patient and re-import
2. Or manually edit patient demographics to clean data
3. Check VetRadar import isn't mixing clinical notes into demographics

### Verification Checklist

When testing Add Patient:

- [ ] Browser console open
- [ ] No red errors in console
- [ ] See "Anthropic API Key status: Present"
- [ ] Click "Add Patient" button
- [ ] See success toast message
- [ ] Patient appears in list (not "Unnamed")
- [ ] Patient has correct name
- [ ] Patient has correct owner info
- [ ] No clinical notes in demographics fields

### Example: Perfect Add Patient Flow

**1. Paste this test data:**
```
Patient: Donut (MN)
Patient ID: 674724
DOB: 08-08-2022
Age: 3y 3m 11d
Weight: 6.70kg
Canine - mixed
Owner: Rivera, Stacey
Phone: 551-404-5642
Consult # 5878302
Problem: Neck pain
Medications:
Gabapentin 100mg PO q12h
Carprofen 25mg SID AM
```

**2. Expected Console Output:**
```
Anthropic API Key status: Present (sk-ant-api...)
Parsing patient data...
✅ Parsed: Donut Rivera (MN mixed, 6.70kg)
Creating patient via API...
✅ Patient created with ID: 123
✅ Patient Added! Donut Rivera created
```

**3. Expected Result:**
- Patient "Donut Rivera" appears in list
- Type: MRI/Surgery/Medical (whatever you selected)
- Status: New Admit
- Demographics populated correctly
- Tasks auto-created

### Still Not Working?

If you've checked all the above and it's still not working:

1. **Export patient data to file**:
   - Save the text you're pasting to a file
   - Share with Claude for analysis

2. **Check Railway deployment**:
   ```bash
   railway status
   ```
   Make sure deployment succeeded

3. **Test API endpoint directly**:
   ```bash
   curl https://empathetic-clarity-production.up.railway.app/api/patients \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","type":"Medical","status":"New Admit"}'
   ```

4. **Full browser refresh**:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Clears any cached broken JavaScript

---

## Sticker Issues (Separate from Add Patient)

### Stickers showing "elected to pursue MRI..."

This is NOT an Add Patient issue - it's a data contamination issue.

**What happened**:
- Patient was imported (via VetRadar or Add Patient)
- Demographics fields got contaminated with clinical notes
- Stickers display demographics, so they show the contaminated text

**Fix**:
1. **Delete and re-import patient** - OR
2. **Manually edit patient demographics** to remove clinical text

**Prevention**:
- Use proper VetRadar import (not copy/paste)
- Make sure clinical notes stay in `roundingData.problems` / `roundingData.plan`
- Don't put clinical text in demographics fields

---

**Last Updated**: 2025-01-19
**Sticker Format**: ✅ Fixed (deployed)
**Add Patient**: ⚠️ Needs systematic debugging with browser console
