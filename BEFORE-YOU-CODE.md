# ⚠️ READ THIS BEFORE MAKING ANY CHANGES ⚠️

## REQUIRED PRE-FLIGHT CHECKS
Before writing ANY code:
1. ✅ Read the actual error message in full
2. ✅ Check what the API endpoint ACTUALLY expects (read the route file)
3. ✅ Check what the frontend ACTUALLY sends (search for the API call)
4. ✅ Verify field names match (title vs name, etc)
5. ✅ Check database schema matches the code

## REQUIRED POST-CHANGE VERIFICATION
After every change:
1. ✅ Actually test the endpoint with curl/Postman
2. ✅ Check server logs for the actual error
3. ✅ Verify the fix before saying "done"
4. ✅ Don't assume - prove it works

## COMMON MISTAKES TO AVOID
- ❌ Don't guess at field names - READ THE CODE
- ❌ Don't assume validation - CHECK THE SCHEMA
- ❌ Don't skip testing - VERIFY IT WORKS
- ❌ Don't use internal Railway URLs locally - USE PUBLIC URLs

## DATABASE URLS
Local: postgresql://postgres:ncpDrcYGcGWwKSufirFOiHbOzLTZHbrq@shinkansen.proxy.rlwy.net:40506/railway?sslmode=require
Railway: postgresql://postgres:ncpDrcYGcGWwKSufirFOiHbOzLTZHbrq@postgres.railway.internal:5432/railway

## TASK SYSTEM FIELD NAMES
- API expects: `title` (NOT `name`)
- Frontend should send: `title`
- Database schema: `title String`
