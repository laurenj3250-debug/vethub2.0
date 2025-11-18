# Environment Configuration Fix

**Date**: 2025-11-18
**Issue**: Browser making API calls to broken Railway production instead of working localhost
**Status**: ✅ FIXED

---

## Problem

Users were experiencing cascade of 500 errors:
- "Anthropic API Key status: Missing" (misleading error)
- All API endpoints returning 500
- VetRadar sync failing
- No patients loading
- Database queries failing

**Root Cause**: `.env.local` had wrong port configuration causing browser to fall back to Railway production URL which has Prisma generation failures.

---

## Solution

### For Local Development

Update your `.env.local` file:

```bash
# WRONG (causes fallback to Railway)
NEXT_PUBLIC_API_URL=http://localhost:3001

# CORRECT
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Steps to Fix

1. **Edit `.env.local`**: Change port from 3001 → 3000
2. **Restart dev server**: `npm run dev`
3. **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
4. **Verify**: Browser should now call `http://localhost:3000/api/*` instead of Railway URLs

---

## How API URL Selection Works

In `src/lib/api-client.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://empathetic-clarity-production.up.railway.app';
```

**Priority**:
1. If `NEXT_PUBLIC_API_URL` is set → use it
2. Otherwise → fall back to Railway production

**Why This Matters**:
- Railway production has Prisma generation failures (see Dockerfile issues)
- Local development works perfectly
- Without correct `NEXT_PUBLIC_API_URL`, browser uses broken Railway

---

## Verification

After fix, check browser DevTools Network tab:

✅ **Should see**:
```
GET http://localhost:3000/api/patients - 200 OK
GET http://localhost:3000/api/tasks/general - 200 OK
```

❌ **Should NOT see**:
```
GET https://empathetic-clarity-production.up.railway.app/api/patients - 500
```

---

## Railway Production Issue (Separate)

Railway deployment still has issues:
- Prisma client not generating at runtime
- Multi-stage Dockerfile with runtime generation not working
- Need to check Railway Deploy Logs (not Build Logs)

**Recommendation**: Use localhost for development until Railway Prisma issue is resolved.

---

## Related Files

- `.env.local` - Local environment configuration (gitignored)
- `.env` - Default environment template
- `src/lib/api-client.ts` - API URL selection logic
- `Dockerfile` - Railway deployment configuration (needs Prisma fix)

---

## Prevention

To prevent this in future:

1. **Document port expectations**: Dev server runs on 3000 by default
2. **Add validation**: Check `NEXT_PUBLIC_API_URL` matches actual dev server port
3. **Better error messages**: Show which API URL is being used in browser console
4. **Health check endpoint**: Add `/api/health` that returns environment info

---

**Generated**: 2025-11-18
**Resolved By**: Claude Code systematic debugging workflow
