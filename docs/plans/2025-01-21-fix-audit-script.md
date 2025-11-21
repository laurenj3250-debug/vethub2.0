# Fix Audit Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the comprehensive audit script to test correct API endpoints instead of wrong URLs that caused false alarms.

**Architecture:** Update audit script test URLs to match actual API routes. Change PUT to PATCH for patient updates, fix task creation endpoint path.

**Tech Stack:** TypeScript, Node.js fetch API

---

## Task 1: Fix Patient Update Endpoint Test

**Files:**
- Modify: `.claude/skills/vethub-comprehensive-audit/scripts/run-audit.ts` (search for "PUT /api/patients")

**Problem:** Audit script tests `PUT /api/patients/:id` but the actual route is `PATCH /api/patients/:id`

**Step 1: Find the patient update test**

Search in `run-audit.ts` for "PUT /api/patients" or "test.*update.*patient"

**Step 2: Change PUT to PATCH**

Find code like:
```typescript
const result = await testAPIEndpoint('PUT', `/api/patients/${patientId}`, {
  status: 'Hospitalized'
});
```

Change to:
```typescript
const result = await testAPIEndpoint('PATCH', `/api/patients/${patientId}`, {
  status: 'Hospitalized'
});
```

**Step 3: Update test name/description**

Change:
```typescript
log(category, 'PUT /api/patients/:id', ...
```

To:
```typescript
log(category, 'PATCH /api/patients/:id', ...
```

**Step 4: Verify compilation**

Run: `npx tsx .claude/skills/vethub-comprehensive-audit/scripts/run-audit.ts --help`
Expected: Script compiles, shows usage

---

## Task 2: Fix Task Creation Endpoint Test

**Files:**
- Modify: `.claude/skills/vethub-comprehensive-audit/scripts/run-audit.ts` (search for task creation test)

**Problem:** Audit script tests `POST /api/patients/:id/tasks` but actual route is `POST /api/tasks/patients/:id/tasks`

**Step 1: Find task creation test**

Search for "POST /api/patients" and "tasks" in run-audit.ts

**Step 2: Fix the URL path**

Find code like:
```typescript
const result = await testAPIEndpoint('POST', `/api/patients/${patientId}/tasks`, {
  title: 'Test Task'
});
```

Change to:
```typescript
const result = await testAPIEndpoint('POST', `/api/tasks/patients/${patientId}/tasks`, {
  title: 'Test Task'
});
```

**Step 3: Update test description**

Change:
```typescript
log(category, 'POST /api/patients/:id/tasks', ...
```

To:
```typescript
log(category, 'POST /api/tasks/patients/:id/tasks', ...
```

---

## Task 3: Update Connection Audit Script (if needed)

**Files:**
- Check: `scripts/audit-connections.ts`

**Step 1: Verify task creation URL in connection audit**

Search for "POST" and "tasks" in audit-connections.ts (around line 72-92)

**If found, ensure it uses correct path:**
```typescript
const toggleRes = await apiCall('PATCH', `/api/tasks/patients/${patientId}/tasks/${taskId}`, {
  completed: !task.completed
});
```

**Step 2: Verify no PUT calls**

Search for 'PUT' in audit-connections.ts - should find none.

If found, change to PATCH.

---

## Task 4: Add API Route Reference Documentation

**Files:**
- Create: `docs/api-routes-reference.md`

**Step 1: Document all actual API routes**

Create a new file documenting the correct endpoints:

```markdown
# VetHub API Routes Reference

## Patient Routes

### GET /api/patients
Fetch all patients with optional status filter

**Query params:** `?status=Active|Discharged`

### GET /api/patients/[id]
Fetch single patient by ID

### POST /api/patients
Create new patient

### PATCH /api/patients/[id]
Update patient (NOT PUT!)

### DELETE /api/patients/[id]
Delete patient

---

## Task Routes

### GET /api/tasks/patients/[id]/tasks
Get all tasks for a patient

### POST /api/tasks/patients/[id]/tasks
Create task for patient

**Body:** `{ title: string, description?: string, category?: string }`

### PATCH /api/tasks/patients/[id]/tasks/[taskId]
Update specific task

**Body:** `{ completed?: boolean, title?: string, ... }`

### DELETE /api/tasks/patients/[id]/tasks/[taskId]
Delete specific task

---

## Notes for Audit Scripts

- Patient updates use **PATCH**, not PUT
- Task routes are under `/api/tasks/patients/...`, not `/api/patients/.../tasks`
- Always test with actual patient IDs from GET /api/patients first

---

## Common Mistakes

❌ `PUT /api/patients/:id` → ✅ `PATCH /api/patients/:id`
❌ `POST /api/patients/:id/tasks` → ✅ `POST /api/tasks/patients/:id/tasks`
```

**Step 2: Save the file**

This serves as reference for future audit script updates.

---

## Task 5: Test the Fixed Audit Script

**Step 1: Run audit on production**

```bash
TEST_URL=https://empathetic-clarity-production.up.railway.app npx tsx .claude/skills/vethub-comprehensive-audit/scripts/run-audit.ts
```

**Expected output:**
```
✅ [2. Patient CRUD Operations] PATCH /api/patients/:id: Updated patient
✅ [3. Task Management] POST /api/tasks/patients/:id/tasks: Created task
```

**Should NOT see:**
```
❌ PUT /api/patients/:id: Status 405
❌ POST /api/patients/:id/tasks: Status 404
```

**Step 2: Run connection audit**

```bash
TEST_URL=https://empathetic-clarity-production.up.railway.app npx tsx scripts/audit-connections.ts
```

**Expected:** No 404/405 errors on task/patient operations

---

## Task 6: Update Audit Reports

**Files:**
- Update: `MASTER-AUDIT-REPORT.md`

**Step 1: Add note about false alarms**

Add section to master report:

```markdown
## Audit Script Issues (Fixed 2025-01-21)

**Previous False Alarms:**
- ❌ PUT /api/patients/:id → 405 (tested wrong method, should be PATCH)
- ❌ POST /api/patients/:id/tasks → 404 (tested wrong URL, should be /api/tasks/patients/:id/tasks)

**Actual Status:**
- ✅ PATCH /api/patients/:id → Works correctly
- ✅ POST /api/tasks/patients/:id/tasks → Works correctly

**Fix:** Updated audit scripts to test correct endpoints (see docs/api-routes-reference.md)
```

---

## Task 7: Commit Changes

```bash
git add .claude/skills/vethub-comprehensive-audit/scripts/run-audit.ts
git add scripts/audit-connections.ts  # if modified
git add docs/api-routes-reference.md
git add MASTER-AUDIT-REPORT.md
git commit -m "fix: correct API endpoints in audit scripts

Change PUT to PATCH for patient updates
Fix task creation URL from /api/patients/:id/tasks to /api/tasks/patients/:id/tasks

Previous audit reported false alarms due to testing wrong endpoints.
All tested endpoints now work correctly.

Added docs/api-routes-reference.md for future reference.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Audit script tests PATCH, not PUT for patient updates
- [ ] Task creation tests correct URL path
- [ ] Connection audit tests correct endpoints
- [ ] docs/api-routes-reference.md created
- [ ] Ran audit on production - no false alarms
- [ ] Updated MASTER-AUDIT-REPORT.md with fix notes

---

## Expected Result

**Before:**
```
❌ PUT /api/patients/:id → 405 Method Not Allowed
❌ POST /api/patients/:id/tasks → 404 Not Found
Health Score: 73% (FALSE ALARMS)
```

**After:**
```
✅ PATCH /api/patients/:id → 200 OK
✅ POST /api/tasks/patients/:id/tasks → 201 Created
Health Score: 100% (ACCURATE)
```

**User Benefit:** Audit scripts now accurately report system health instead of creating false alarms that waste debugging time.
