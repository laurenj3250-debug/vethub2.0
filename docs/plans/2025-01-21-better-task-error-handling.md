# Better Task Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generic "Failed to update task" error messages with specific, actionable error details showing what went wrong and which task was affected.

**Architecture:** Improve error handling in task-related functions (toggle, delete, create) to show task ID, patient name, and specific error messages instead of generic failures.

**Tech Stack:** React, TypeScript, Toast notifications

---

## Task 1: Improve handleToggleTask Error Handling

**Files:**
- Modify: `src/app/page.tsx:576-583`

**Current Code (line 576-583):**
```typescript
const handleToggleTask = async (patientId: number, taskId: number, currentStatus: boolean) => {
  try {
    await apiClient.updateTask(String(patientId), String(taskId), { completed: !currentStatus });
    refetch();
  } catch (error) {
    toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
  }
};
```

**Step 1: Add detailed error context**

Replace the function with:

```typescript
const handleToggleTask = async (patientId: number, taskId: number, currentStatus: boolean) => {
  try {
    await apiClient.updateTask(String(patientId), String(taskId), { completed: !currentStatus });
    refetch();
  } catch (error: any) {
    // Find patient and task for detailed error message
    const patient = patients.find(p => p.id === patientId);
    const task = patient?.tasks?.find((t: any) => t.id === taskId);

    const patientName = patient?.demographics?.name || patient?.name || `Patient ${patientId}`;
    const taskTitle = task?.title || `Task ${taskId}`;

    console.error(`Task toggle error for ${patientName} - ${taskTitle}:`, error);

    toast({
      variant: 'destructive',
      title: 'Failed to update task',
      description: `Could not toggle "${taskTitle}" for ${patientName}. ${error.message || 'Check console for details.'}`
    });
  }
};
```

**Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No TypeScript errors

---

## Task 2: Improve handleDeleteTask Error Handling

**Files:**
- Modify: `src/app/page.tsx:585-592`

**Current Code (line 585-592):**
```typescript
const handleDeleteTask = async (patientId: number, taskId: number) => {
  try {
    await apiClient.deleteTask(String(patientId), String(taskId));
    refetch();
  } catch (error) {
    toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' });
  }
};
```

**Step 1: Add detailed error context**

Replace with:

```typescript
const handleDeleteTask = async (patientId: number, taskId: number) => {
  try {
    await apiClient.deleteTask(String(patientId), String(taskId));
    refetch();
  } catch (error: any) {
    // Find patient and task for detailed error message
    const patient = patients.find(p => p.id === patientId);
    const task = patient?.tasks?.find((t: any) => t.id === taskId);

    const patientName = patient?.demographics?.name || patient?.name || `Patient ${patientId}`;
    const taskTitle = task?.title || `Task ${taskId}`;

    console.error(`Task delete error for ${patientName} - ${taskTitle}:`, error);

    toast({
      variant: 'destructive',
      title: 'Failed to delete task',
      description: `Could not delete "${taskTitle}" for ${patientName}. ${error.message || 'Check console for details.'}`
    });
  }
};
```

**Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No TypeScript errors

---

## Task 3: Improve Task Creation Error Handling

**Files:**
- Modify: `src/app/page.tsx` (search for apiClient.createTask calls)

**Find all createTask calls** and ensure they have detailed error handling.

**Common locations to check:**
1. `handleAddPatient` (line ~557-562)
2. `handleAddPatientTaskFromOverview` (line ~1093+)
3. Any batch task creation functions

**Example improvement for handleAddPatient section (line 568-570):**

**Current:**
```typescript
} catch (error: any) {
  console.error('Add patient error:', error);
  toast({ variant: 'destructive', title: 'Failed to add patient', description: error.message || 'Try again' });
}
```

**Improved (already good, but verify it shows error.message):**

This one is already showing `error.message`, so it's fine. Just verify other task creation locations do the same.

**Step 1: Search for all createTask calls**

Run in terminal:
```bash
grep -n "createTask" src/app/page.tsx
```

**Step 2: For each createTask call, verify error handling shows:**
- Task title being created
- Patient name
- Specific error message (error.message)

**Step 3: If any are missing detailed errors, add similar pattern as above**

---

## Task 4: Test Error Scenarios

**Step 1: Test with network disconnected**

1. Run: `npm run dev`
2. Open browser to http://localhost:3000
3. Open DevTools → Network tab → Set to "Offline"
4. Try to toggle a task
5. **Expected:** Toast shows: "Failed to update task - Could not toggle 'Task Name' for Patient Name. Failed to fetch."

**Step 2: Test with invalid task ID**

1. Open DevTools Console
2. Find a patient and call: `handleToggleTask(88, 999999, false)`
3. **Expected:** Toast shows specific error about task 999999 not found

**Step 3: Test delete error**

1. Disconnect network
2. Try to delete a task
3. **Expected:** Toast shows: "Failed to delete task - Could not delete 'Task Name' for Patient Name. [error details]"

---

## Task 5: Commit Changes

```bash
git add src/app/page.tsx
git commit -m "feat: improve task error handling with detailed messages

Replace generic 'Failed to update task' with specific errors showing:
- Task title
- Patient name
- Actual error message

Affected functions:
- handleToggleTask (line 576-583)
- handleDeleteTask (line 585-592)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] handleToggleTask shows patient name and task title in error
- [ ] handleDeleteTask shows patient name and task title in error
- [ ] All createTask calls have error.message in toast
- [ ] Console logs include full error details
- [ ] Tested with network offline
- [ ] Tested with invalid task IDs
- [ ] Error messages are user-friendly and actionable

---

## Expected Result

**Before:**
```
❌ Error
Failed to update task
```

**After:**
```
❌ Failed to update task
Could not toggle "NPO" for Stewie McNair. Network request failed.
```

**User Benefit:** Users know WHICH task failed and WHY, making debugging and troubleshooting much easier.
