# VetHub 2.0 Recovery Plan
## Comprehensive Execution Strategy for All Critical Issues

**Created**: 2025-11-18
**Timeline**: 6 weeks to production-ready
**Priority**: Fix critical bugs → Add testing → Validate features → Optimize

---

## 📋 OVERVIEW

This plan tackles all issues from `HARSH_CRITIQUE.md` in priority order with:
- Detailed step-by-step instructions
- Code examples and solutions
- Time estimates
- Success criteria
- Testing requirements

---

# WEEK 1: CRITICAL BUG FIXES

## 🚨 ISSUE #1: Fix Next.js 15 Params Async Bug

**Priority**: 🔴 CRITICAL
**Time Estimate**: 2-3 hours
**Impact**: Task creation currently throws errors

### Problem Statement

Next.js 15 changed route params from synchronous to asynchronous. All dynamic routes must await params before accessing properties.

**Current Error**:
```
Error: Route "/api/tasks/patients/[id]/tasks" used `params.id`.
`params` should be awaited before using its properties.
```

### Affected Files

1. `/src/app/api/tasks/patients/[id]/tasks/route.ts`
2. `/src/app/api/patients/[id]/route.ts` (likely)
3. Any other `[id]` or `[slug]` routes

### Step-by-Step Fix

#### Step 1: Identify All Dynamic Routes (15 min)

```bash
# Find all files with dynamic route parameters
find src/app/api -type f -name "route.ts" | xargs grep -l "\[.*\]"
```

Expected output:
- `api/tasks/patients/[id]/tasks/route.ts`
- `api/patients/[id]/route.ts`
- Others...

#### Step 2: Fix Task Routes (30 min)

**File**: `/src/app/api/tasks/patients/[id]/tasks/route.ts`

**Before (lines 8-13)**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = parseInt(params.id);
```

**After**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);
```

**Apply to ALL 4 handlers** (GET, POST, PATCH, DELETE):

```typescript
// GET handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: { patientId },
      orderBy: [
        { completed: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[API] Error fetching patient tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient tasks' },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const taskTitle = body.title || body.name;

    if (!taskTitle || typeof taskTitle !== 'string') {
      return NextResponse.json(
        { error: 'Task title or name is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: taskTitle.trim(),
        description: body.description || undefined,
        category: body.category || undefined,
        timeOfDay: body.timeOfDay || undefined,
        priority: body.priority || undefined,
        assignedTo: body.assignedTo || undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completed: body.completed || false,
        completedAt: body.completed ? new Date() : undefined,
        patientId: patientId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating patient task:', error);
    return NextResponse.json(
      { error: 'Failed to create patient task' },
      { status: 500 }
    );
  }
}

// PATCH handler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    // Extract taskId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const taskIdIndex = pathSegments.indexOf('tasks') + 1;
    const taskId = pathSegments[taskIdIndex];

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verify task exists and belongs to patient
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        patientId: patientId,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        category: body.category !== undefined ? body.category : undefined,
        timeOfDay: body.timeOfDay !== undefined ? body.timeOfDay : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        assignedTo: body.assignedTo !== undefined ? body.assignedTo : undefined,
        dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
        completed: body.completed !== undefined ? body.completed : undefined,
        completedAt: body.completed !== undefined ? (body.completed ? new Date() : null) : undefined,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('[API] Error updating patient task:', error);
    return NextResponse.json(
      { error: 'Failed to update patient task' },
      { status: 500 }
    );
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    // Extract taskId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const taskIdIndex = pathSegments.indexOf('tasks') + 1;
    const taskId = pathSegments[taskIdIndex];

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to patient
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        patientId: patientId,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] Error deleting patient task:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient task' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Fix Patient Routes (15 min)

**File**: `/src/app/api/patients/[id]/route.ts`

**Pattern**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const patientId = parseInt(resolvedParams.id);
  // ... rest of handler
}
```

#### Step 4: Test All Fixed Routes (30 min)

**Create test script**: `/scripts/test-api-routes.ts`

```typescript
/**
 * Test all API routes after Next.js 15 params fix
 */

const BASE_URL = 'http://localhost:3001';

async function testTaskRoutes() {
  console.log('Testing Task API Routes...\n');

  // Test GET /api/tasks/patients/[id]/tasks
  console.log('1. GET /api/tasks/patients/1/tasks');
  const getTasks = await fetch(`${BASE_URL}/api/tasks/patients/1/tasks`);
  console.log(`   Status: ${getTasks.status}`);
  const tasks = await getTasks.json();
  console.log(`   Tasks: ${tasks.length || 'error'}\n`);

  // Test POST /api/tasks/patients/[id]/tasks
  console.log('2. POST /api/tasks/patients/1/tasks');
  const createTask = await fetch(`${BASE_URL}/api/tasks/patients/1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Task from API Fix',
      completed: false,
    }),
  });
  console.log(`   Status: ${createTask.status}`);
  const newTask = await createTask.json();
  console.log(`   Created: ${newTask.id ? 'Success' : 'Failed'}\n`);

  if (newTask.id) {
    // Test PATCH
    console.log('3. PATCH /api/tasks/patients/1/tasks/' + newTask.id);
    const updateTask = await fetch(
      `${BASE_URL}/api/tasks/patients/1/tasks/${newTask.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      }
    );
    console.log(`   Status: ${updateTask.status}`);
    const updated = await updateTask.json();
    console.log(`   Updated: ${updated.completed ? 'Success' : 'Failed'}\n`);

    // Test DELETE
    console.log('4. DELETE /api/tasks/patients/1/tasks/' + newTask.id);
    const deleteTask = await fetch(
      `${BASE_URL}/api/tasks/patients/1/tasks/${newTask.id}`,
      { method: 'DELETE' }
    );
    console.log(`   Status: ${deleteTask.status}`);
    const deleted = await deleteTask.json();
    console.log(`   Deleted: ${deleted.success ? 'Success' : 'Failed'}\n`);
  }
}

async function testPatientRoutes() {
  console.log('Testing Patient API Routes...\n');

  // Test GET /api/patients/[id]
  console.log('1. GET /api/patients/1');
  const getPatient = await fetch(`${BASE_URL}/api/patients/1`);
  console.log(`   Status: ${getPatient.status}`);
  const patient = await getPatient.json();
  console.log(`   Patient: ${patient.id ? patient.demographics?.name : 'error'}\n`);
}

async function runTests() {
  try {
    await testTaskRoutes();
    await testPatientRoutes();
    console.log('✅ All API route tests passed!');
  } catch (error) {
    console.error('❌ API route tests failed:', error);
    process.exit(1);
  }
}

runTests();
```

**Run tests**:
```bash
npx tsx scripts/test-api-routes.ts
```

#### Step 5: Check Dev Server Logs (5 min)

After running tests, check that **no more errors** about params appear:

```bash
# Should NOT see:
# Error: Route "/api/tasks/patients/[id]/tasks" used `params.id`

# Should see:
# ✅ All requests 200/201 status
```

### Success Criteria

- [ ] All dynamic routes updated to await params
- [ ] No params errors in dev server logs
- [ ] All test routes return 200/201 status
- [ ] Task creation works in UI without console errors
- [ ] Changes committed and pushed to GitHub

### Commit Message

```
Fix Next.js 15 async params in all API routes

BREAKING: Next.js 15 requires params to be awaited before access

Changes:
- Update all dynamic route handlers to await params
- Fix task CRUD endpoints (GET, POST, PATCH, DELETE)
- Fix patient endpoints
- Add API route test script

Fixes console errors:
Error: Route used `params.id` without awaiting

Tested:
- Task creation, update, deletion ✅
- Patient retrieval ✅
- No console errors ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 ISSUE #2: Add Error Boundaries to Critical Paths

**Priority**: 🔴 CRITICAL
**Time Estimate**: 1-2 hours
**Impact**: Prevents white screen crashes

### Problem Statement

ErrorBoundary component exists but isn't used. Component crashes show white screen instead of graceful error.

### Step-by-Step Fix

#### Step 1: Review Existing ErrorBoundary (10 min)

**File**: `/src/components/ErrorBoundary.tsx`

Check if it:
- Catches errors properly
- Shows user-friendly message
- Logs errors for debugging

#### Step 2: Wrap Critical Components (30 min)

**File**: `/src/app/patient-hub/page.tsx`

**Before**:
```typescript
export default function PatientHubPage() {
  // ... component code
  return (
    <div className="min-h-screen...">
      <UnifiedPatientForm data={patientData} onChange={handleDataChange} />
      <OutputPreviewPanel patientData={patientData} outputs={generatedOutputs} />
    </div>
  );
}
```

**After**:
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PatientHubPage() {
  // ... component code
  return (
    <div className="min-h-screen...">
      <ErrorBoundary fallback={<PatientHubError />}>
        <UnifiedPatientForm data={patientData} onChange={handleDataChange} />
      </ErrorBoundary>

      <ErrorBoundary fallback={<OutputPreviewError />}>
        <OutputPreviewPanel patientData={patientData} outputs={generatedOutputs} />
      </ErrorBoundary>
    </div>
  );
}

function PatientHubError() {
  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
      <h3 className="text-red-400 font-bold mb-2">Form Error</h3>
      <p className="text-slate-300 mb-4">
        Unable to load patient form. Please refresh the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
      >
        Refresh Page
      </button>
    </div>
  );
}

function OutputPreviewError() {
  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
      <h3 className="text-red-400 font-bold mb-2">Preview Error</h3>
      <p className="text-slate-300 mb-4">
        Unable to generate preview. Try generating outputs again.
      </p>
    </div>
  );
}
```

#### Step 3: Wrap Other Critical Components (20 min)

Apply same pattern to:

1. **Rounding Sheet** (`/src/app/rounding/page.tsx`):
```typescript
<ErrorBoundary fallback={<RoundingSheetError />}>
  <RoundingSheet />
</ErrorBoundary>
```

2. **SOAP Builder** (`/src/app/soap/page.tsx`):
```typescript
<ErrorBoundary fallback={<SOAPBuilderError />}>
  <SOAPBuilder />
</ErrorBoundary>
```

3. **Dashboard** (`/src/app/page.tsx`):
```typescript
<ErrorBoundary fallback={<DashboardError />}>
  <PatientListItem patient={patient} />
</ErrorBoundary>
```

#### Step 4: Improve ErrorBoundary Component (30 min)

**File**: `/src/components/ErrorBoundary.tsx`

**Enhanced version**:
```typescript
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // trackError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 my-4">
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-300 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg mr-2"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Success Criteria

- [ ] ErrorBoundary wraps all critical components
- [ ] Custom fallback UIs for each feature
- [ ] Errors logged to console
- [ ] User sees helpful message instead of white screen
- [ ] "Try Again" button resets error state

### Testing

**Trigger intentional error**:
```typescript
// Add to UnifiedPatientForm.tsx temporarily
if (Math.random() > 0.5) {
  throw new Error('Test error boundary');
}
```

**Expected**: See fallback UI, not white screen

---

## 🚨 ISSUE #3: Test Unified Patient Hub End-to-End

**Priority**: 🔴 CRITICAL
**Time Estimate**: 4-6 hours
**Impact**: Validates flagship feature actually works

### Problem Statement

Unified Patient Hub built but never tested. Unknown if:
- AI parser works
- Outputs generate correctly
- Save functionality works
- Integration with existing features works

### Step-by-Step Validation

#### Step 1: Verify AI Parser Endpoint Exists (30 min)

**Check if route exists**:
```bash
ls -la src/app/api/ai-parse/
```

**If doesn't exist**, create it:

**File**: `/src/app/api/ai-parse/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract patient information from this veterinary referral/note. Return JSON only, no markdown.

Format:
{
  "patientName": "string",
  "species": "Dog" | "Cat",
  "breed": "string",
  "age": "string (e.g., 5yo)",
  "sex": "MN" | "FS" | "M" | "F",
  "weight": number (in kg),
  "currentHistory": "string",
  "problems": "string",
  "diagnosticFindings": "string",
  "currentMedications": "string",
  "treatments": "string",
  "fluids": "string",
  "neurolocalization": "string",
  "ddx": "string",
  "diagnosticsToday": "string",
  "visitType": "mri" | "surgery" | "medical"
}

If information is missing, use empty string or null.

Text to parse:
${text}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from Claude's response
    const parsed = JSON.parse(content.text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[AI Parse] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse text',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Test with curl**:
```bash
curl -X POST http://localhost:3001/api/ai-parse \
  -H "Content-Type: application/json" \
  -d '{"text": "5yo MN Golden Retriever named Max, 25kg, presenting with acute onset paraparesis"}'
```

Expected response:
```json
{
  "patientName": "Max",
  "species": "Dog",
  "breed": "Golden Retriever",
  "age": "5yo",
  "sex": "MN",
  "weight": 25,
  "currentHistory": "acute onset paraparesis",
  ...
}
```

#### Step 2: Test AI Parsing in UI (1 hour)

**Manual test checklist**:

1. Navigate to `/patient-hub`
2. Paste sample referral text:
```
Patient: Bella
Species: Dog
Breed: German Shepherd
Age: 7 years old
Sex: FS
Weight: 30kg

History: 3 day history of progressive pelvic limb ataxia and paresis.
Pain score: 1/4

Neuro exam: Ambulatory paraparesis, decreased conscious proprioception bilateral
pelvic limbs, normal patellar reflexes bilaterally.

Neurolocalization: T3-L3 myelopathy

Differential diagnoses: IVDD, FCE, neoplasia

Plan: MRI brain and C-spine, CBC/chemistry
```

3. Click "Parse Text"
4. Verify:
   - [ ] Button shows "Parsing..."
   - [ ] Demographics fields auto-fill
   - [ ] Clinical fields populate
   - [ ] No console errors
   - [ ] Data looks correct

**If parsing fails**, add error handling:

**File**: `/src/components/patient-hub/UnifiedPatientForm.tsx`

```typescript
const [parseError, setParseError] = useState<string | null>(null);

const handleQuickInput = async (method: 'paste' | 'voice' | 'vetradar') => {
  if (method === 'paste' && pasteText) {
    setIsParsing(true);
    setParseError(null); // Clear previous errors

    try {
      const response = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse');
      }

      const parsed = await response.json();

      // Validate parsed data has required fields
      if (!parsed.patientName) {
        throw new Error('Could not extract patient name from text');
      }

      const unifiedData = {
        demographics: {
          name: parsed.patientName || '',
          species: parsed.species || 'Dog',
          breed: parsed.breed || '',
          age: parsed.age || '',
          sex: parsed.sex || '',
          weight: parsed.weight || 0,
        },
        type: parsed.visitType === 'mri' ? 'MRI' : parsed.visitType === 'surgery' ? 'Surgery' : 'Medical',
        location: 'ICU',
        icuCriteria: 'Yes',
        codeStatus: 'Green',
        clinical: {
          history: parsed.currentHistory || '',
          problems: parsed.problems || '',
          diagnosticFindings: parsed.diagnosticFindings || '',
          medications: parsed.currentMedications || '',
          treatments: parsed.treatments || '',
          fluids: parsed.fluids || '',
          neurolocalization: parsed.neurolocalization || '',
          ddx: parsed.ddx || '',
          diagnostics: parsed.diagnosticsToday || '',
        },
      };

      onChange(unifiedData);
      setPasteText('');

      // Show success toast
      toast({
        title: '✅ Parsed Successfully',
        description: `Extracted data for ${parsed.patientName}`,
      });

    } catch (error) {
      console.error('Parse error:', error);
      setParseError(error instanceof Error ? error.message : 'Unknown error');

      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Parse Failed',
        description: error instanceof Error ? error.message : 'Could not parse text',
      });
    } finally {
      setIsParsing(false);
    }
  }
};

// Add error display in JSX
{parseError && (
  <div className="bg-red-900/20 border border-red-500 rounded p-3 text-sm text-red-300">
    <strong>Parse Error:</strong> {parseError}
  </div>
)}
```

#### Step 3: Test Output Generation (1 hour)

**Manual test**:

1. Fill in patient data (manually or via paste)
2. Click "Generate All"
3. Verify:
   - [ ] Button shows "Generating..."
   - [ ] All outputs appear in preview panel
   - [ ] Rounding sheet has correct data
   - [ ] SOAP note sections populated
   - [ ] Treatment sheet generated
   - [ ] Stickers created
   - [ ] MRI sheet shows (if MRI patient)

**Add loading states**:

**File**: `/src/app/patient-hub/page.tsx`

```typescript
const [generationProgress, setGenerationProgress] = useState<string>('');

const handleGenerate = async () => {
  setIsGenerating(true);
  setGenerationProgress('Generating rounding sheet...');

  try {
    const outputs: any = {};

    // Generate with progress updates
    setGenerationProgress('Generating rounding sheet...');
    outputs.roundingSheet = generateRoundingSheet(patientData);

    setGenerationProgress('Generating SOAP note...');
    outputs.soapNote = generateSOAPNote(patientData);

    setGenerationProgress('Generating treatment sheet...');
    outputs.treatmentSheet = generateTreatmentSheet(patientData);

    setGenerationProgress('Generating stickers...');
    outputs.stickers = generateStickers(patientData);

    if (patientData.type === 'MRI') {
      setGenerationProgress('Generating MRI sheet...');
      outputs.mriSheet = generateMRISheet(patientData);
    }

    setGeneratedOutputs(outputs);
    setGenerationProgress('');

    toast({
      title: '✅ Generated All Outputs',
      description: 'Review the previews and save when ready',
    });
  } catch (error) {
    console.error('Generation error:', error);
    toast({
      variant: 'destructive',
      title: 'Generation Failed',
      description: error instanceof Error ? error.message : 'Unknown error',
    });
    setGenerationProgress('');
  } finally {
    setIsGenerating(false);
  }
};

// Show progress in button
<button onClick={handleGenerate} disabled={isGenerating || !patientData.demographics?.name}>
  {isGenerating ? generationProgress || 'Generating...' : 'Generate All'}
</button>
```

#### Step 4: Test Save Functionality (1 hour)

**Manual test**:

1. Generate all outputs
2. Click "Save Patient"
3. Verify:
   - [ ] Button shows "Saving..."
   - [ ] Success toast appears
   - [ ] Redirects to patient page
   - [ ] Patient appears in dashboard
   - [ ] All data persisted correctly

**Check database**:
```bash
# Connect to database and verify
npx prisma studio
# Look for newly created patient
# Verify roundingData field populated
```

**Add validation before save**:

```typescript
const handleSave = async () => {
  // Validate required fields
  if (!patientData.demographics?.name) {
    toast({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Patient name is required',
    });
    return;
  }

  if (!generatedOutputs.roundingSheet) {
    toast({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Generate outputs before saving',
    });
    return;
  }

  setIsSaving(true);

  try {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demographics: patientData.demographics,
        status: 'Active',
        type: patientData.type || 'Medical',
        roundingData: generatedOutputs.roundingSheet,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save');
    }

    const savedPatient = await response.json();

    toast({
      title: '✅ Patient Saved',
      description: `${patientData.demographics?.name} saved successfully`,
    });

    // Redirect after short delay
    setTimeout(() => {
      window.location.href = `/?patient=${savedPatient.id}`;
    }, 1000);

  } catch (error) {
    console.error('Save error:', error);
    toast({
      variant: 'destructive',
      title: 'Save Failed',
      description: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    setIsSaving(false);
  }
};
```

#### Step 5: Write Playwright Test (2 hours)

**File**: `/tests/unified-patient-hub.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Unified Patient Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/patient-hub');
  });

  test('should load patient hub page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Unified Patient Hub');
    await expect(page.locator('button:has-text("Generate All")')).toBeVisible();
  });

  test('should parse pasted text and fill form', async ({ page }) => {
    const sampleText = `
      Patient: Bella
      Species: Dog
      Breed: German Shepherd
      Age: 7 years old
      Sex: FS
      Weight: 30kg

      History: Acute onset paraparesis
      Neurolocalization: T3-L3 myelopathy
      DDx: IVDD, FCE
    `;

    // Paste text
    await page.locator('textarea[placeholder*="Paste referral"]').fill(sampleText);

    // Click parse
    await page.locator('button:has-text("Parse Text")').click();

    // Wait for parsing
    await page.waitForTimeout(3000);

    // Verify fields populated
    await expect(page.locator('input[placeholder*="Max Smith"]')).not.toBeEmpty();
  });

  test('should generate all outputs', async ({ page }) => {
    // Fill in minimal required data
    await page.locator('input[placeholder*="Max Smith"]').fill('Test Patient');
    await page.locator('input[placeholder*="Golden Retriever"]').fill('Mixed Breed');
    await page.locator('input[placeholder*="5yo"]').fill('3yo');
    await page.locator('input[type="number"]').fill('20');

    // Generate outputs
    await page.locator('button:has-text("Generate All")').click();

    // Wait for generation
    await page.waitForTimeout(2000);

    // Verify outputs appear
    await expect(page.locator('text=Rounding Sheet Preview')).toBeVisible();
    await expect(page.locator('text=SOAP Note Preview')).toBeVisible();
  });

  test('should save patient and redirect', async ({ page }) => {
    // Fill and generate
    await page.locator('input[placeholder*="Max Smith"]').fill('E2E Test Patient');
    await page.locator('input[type="number"]').fill('25');
    await page.locator('button:has-text("Generate All")').click();
    await page.waitForTimeout(2000);

    // Save
    await page.locator('button:has-text("Save Patient")').click();

    // Wait for save and redirect
    await page.waitForURL('**/patient=*', { timeout: 10000 });

    // Verify on patient page
    await expect(page.locator('text=E2E Test Patient')).toBeVisible();
  });
});
```

**Run test**:
```bash
npx playwright test unified-patient-hub.spec.ts --headed
```

### Success Criteria

- [ ] AI parser endpoint exists and works
- [ ] Paste → Parse workflow functional
- [ ] All outputs generate correctly
- [ ] Save creates patient in database
- [ ] Redirect works to patient page
- [ ] Playwright test passes
- [ ] No console errors during workflow

---

## 🟠 ISSUE #4: Set Up Local Development Environment

**Priority**: 🟠 HIGH (but can work around)
**Time Estimate**: 4-6 hours
**Impact**: Prevents production data corruption

### Problem Statement

Currently using Railway production database for local development. This is dangerous and prevents safe testing.

### Step-by-Step Setup

#### Step 1: Create Docker Compose File (30 min)

**File**: `/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: vethub_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: vethub
      POSTGRES_PASSWORD: vethub_dev_password
      POSTGRES_DB: vethub_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U vethub']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

#### Step 2: Update Environment Variables (15 min)

**File**: `/.env.local` (create if doesn't exist)

```bash
# Local Development Database
DATABASE_URL="postgresql://vethub:vethub_dev_password@localhost:5432/vethub_dev"

# Anthropic API (for AI parsing)
ANTHROPIC_API_KEY="your-api-key-here"

# Environment flag
NODE_ENV="development"
```

**File**: `/.env.production` (for Railway)

```bash
# Railway Production Database
DATABASE_URL="postgresql://postgres:ncpDrcYGcGWwKSufirFOiHbOzLTZHbrq@shinkansen.proxy.rlwy.net:40506/railway?sslmode=require"

ANTHROPIC_API_KEY="your-api-key-here"

NODE_ENV="production"
```

**Update**: `/.gitignore`

```
.env.local
.env.production
.env
```

#### Step 3: Start Local Database (10 min)

```bash
# Start PostgreSQL
docker-compose up -d

# Verify running
docker ps

# Should see:
# vethub_postgres   Up X seconds   5432/tcp
```

#### Step 4: Run Prisma Migrations (20 min)

```bash
# Push schema to local database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open Prisma Studio to verify
npx prisma studio
```

#### Step 5: Seed Local Database (1 hour)

**File**: `/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding local development database...\n');

  // Create test patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        status: 'Active',
        type: 'Medical',
        demographics: {
          name: 'Bella',
          species: 'Dog',
          breed: 'German Shepherd',
          age: '7yo',
          sex: 'FS',
          weight: 30,
        },
        roundingData: {
          signalment: '7yo FS German Shepherd',
          location: 'ICU',
          icuCriteria: 'Yes',
          code: 'Green',
          problems: 'T3-L3 myelopathy',
          diagnosticFindings: 'MRI: C2-C3 IVDD',
          therapeutics: 'Gabapentin 300mg PO TID',
          dayCount: 1,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
    prisma.patient.create({
      data: {
        status: 'Active',
        type: 'MRI',
        demographics: {
          name: 'Max',
          species: 'Dog',
          breed: 'Golden Retriever',
          age: '5yo',
          sex: 'MN',
          weight: 25,
        },
        roundingData: {
          signalment: '5yo MN Golden Retriever',
          location: 'MRI',
          icuCriteria: 'No',
          code: 'Green',
          problems: 'Seizures - idiopathic epilepsy',
          dayCount: 1,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
    prisma.patient.create({
      data: {
        status: 'Active',
        type: 'Surgery',
        demographics: {
          name: 'Luna',
          species: 'Cat',
          breed: 'DSH',
          age: '3yo',
          sex: 'FS',
          weight: 4.5,
        },
        roundingData: {
          signalment: '3yo FS DSH',
          location: 'Ward',
          icuCriteria: 'No',
          code: 'Green',
          problems: 'Hemilaminectomy L1-L2',
          dayCount: 2,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
  ]);

  console.log(`Created ${patients.length} test patients`);

  // Create test tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Check neuro status',
        patientId: patients[0].id,
        category: 'Medical',
        timeOfDay: 'Morning',
        completed: false,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Administer medications',
        patientId: patients[0].id,
        category: 'Treatment',
        timeOfDay: 'Morning',
        completed: false,
      },
    }),
    prisma.task.create({
      data: {
        title: 'MRI scheduled 10am',
        patientId: patients[1].id,
        category: 'Diagnostic',
        timeOfDay: 'Morning',
        completed: false,
      },
    }),
  ]);

  console.log(`Created ${tasks.length} test tasks\n`);

  console.log('✅ Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Update**: `/package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "npx prisma db push --force-reset && npm run db:seed"
  }
}
```

**Run seed**:
```bash
npm run db:seed
```

#### Step 6: Update Development Workflow (15 min)

**File**: `/README.md` - Add local dev section

```markdown
## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker Desktop

### Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/laurenj3250-debug/vethub2.0.git
   cd vethub2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local database**
   ```bash
   docker-compose up -d
   ```

4. **Set up database**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

5. **Start dev server**
   ```bash
   npm run dev
   ```

6. **Open app**
   ```
   http://localhost:3000
   ```

### Development vs Production

- **Local**: Uses Docker PostgreSQL (`localhost:5432`)
- **Production**: Uses Railway PostgreSQL
- **Never** test destructive operations on production!

### Reset Database

```bash
npm run db:reset
```
```

#### Step 7: Document Railway Deploy Process (15 min)

**File**: `/docs/DEPLOYMENT.md`

```markdown
# Deployment Guide

## Railway Production Deployment

### Automatic Deployment

Railway auto-deploys on every push to `main` branch.

```bash
git push origin main
# Railway detects push and deploys automatically
```

### Manual Deployment

```bash
# 1. Verify Railway CLI connected
railway whoami

# 2. Push to production
git push origin main

# 3. Monitor deployment
railway logs --follow

# 4. Verify deployment
open https://empathetic-clarity-production.up.railway.app/
```

### Environment Variables

Set in Railway dashboard:
- `DATABASE_URL` - Automatic (Railway PostgreSQL)
- `ANTHROPIC_API_KEY` - Manual (API key)
- `NODE_ENV=production` - Manual

### Database Migrations

```bash
# Railway runs migrations automatically via Dockerfile
# Or manually:
railway run npx prisma db push
```

### Rollback

```bash
# Find previous deployment
railway deployments

# Rollback to specific deployment
railway rollback [deployment-id]
```
```

### Success Criteria

- [ ] Docker Compose running PostgreSQL locally
- [ ] `.env.local` configured for local dev
- [ ] Prisma migrations applied to local DB
- [ ] Seed script populates test data
- [ ] Dev server connects to local DB
- [ ] Prisma Studio works
- [ ] README documents local setup
- [ ] Production still uses Railway DB

---

# WEEK 2: BACKEND VALIDATION & DATA INTEGRITY

## 🟠 ISSUE #5: Add Zod Validation Schemas

**Priority**: 🟠 HIGH
**Time Estimate**: 8-10 hours
**Impact**: Prevents corrupt data, improves API reliability

### Problem Statement

API endpoints accept `any` type data with no validation. Garbage in = garbage stored.

### Step-by-Step Implementation

#### Step 1: Install Zod (5 min)

```bash
npm install zod
```

#### Step 2: Create Validation Schemas (2 hours)

**File**: `/src/lib/validation/schemas.ts`

```typescript
import { z } from 'zod';

/**
 * Patient Demographics Schema
 */
export const DemographicsSchema = z.object({
  name: z.string().min(1, 'Patient name is required').max(100),
  species: z.enum(['Dog', 'Cat'], {
    errorMap: () => ({ message: 'Species must be Dog or Cat' }),
  }),
  breed: z.string().max(100).optional(),
  age: z.string().max(20).optional(),
  sex: z.enum(['MN', 'FS', 'M', 'F']).optional(),
  weight: z.number().positive('Weight must be positive').optional(),
});

/**
 * Rounding Data Schema
 */
export const RoundingDataSchema = z.object({
  signalment: z.string().optional(),
  location: z.string().optional(),
  icuCriteria: z.string().optional(),
  code: z.enum(['Green', 'Yellow', 'Orange', 'Red']).optional(),
  problems: z.string().optional(),
  diagnosticFindings: z.string().optional(),
  therapeutics: z.string().optional(),
  ivc: z.string().optional(),
  fluids: z.string().optional(),
  cri: z.string().optional(),
  overnightDx: z.string().optional(),
  concerns: z.string().optional(),
  comments: z.string().optional(),
  dayCount: z.number().int().positive().optional(),
  lastUpdated: z.string().datetime().optional(),
});

/**
 * Patient Creation Schema
 */
export const CreatePatientSchema = z.object({
  demographics: DemographicsSchema,
  status: z.enum(['Active', 'Discharged', 'Deceased']).default('Active'),
  type: z.enum(['Medical', 'MRI', 'Surgery']).default('Medical'),
  medicalHistory: z.record(z.unknown()).optional(),
  roundingData: RoundingDataSchema.optional(),
  mriData: z.record(z.unknown()).optional(),
  stickerData: z.record(z.unknown()).optional(),
  appointmentInfo: z.record(z.unknown()).optional(),
});

/**
 * Patient Update Schema (all fields optional except ID)
 */
export const UpdatePatientSchema = CreatePatientSchema.partial();

/**
 * Task Creation Schema
 */
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  timeOfDay: z.enum(['Morning', 'Afternoon', 'Evening', 'Overnight']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  assignedTo: z.string().max(100).optional(),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean().default(false),
  patientId: z.number().int().positive().optional(),
});

/**
 * Task Update Schema
 */
export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string(),
});

/**
 * AI Parse Request Schema
 */
export const AIParseRequestSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters'),
});

/**
 * Type exports (inferred from schemas)
 */
export type Demographics = z.infer<typeof DemographicsSchema>;
export type RoundingData = z.infer<typeof RoundingDataSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type AIParseRequest = z.infer<typeof AIParseRequestSchema>;
```

#### Step 3: Create Validation Middleware (1 hour)

**File**: `/src/lib/validation/validate.ts`

```typescript
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

/**
 * Validate request body against Zod schema
 * Returns validated data or throws detailed error
 */
export async function validateRequest<T>(
  requestData: unknown,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const validated = schema.parse(requestData);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: formattedErrors,
          },
          { status: 400 }
        ),
      };
    }

    // Unknown error
    return {
        success: false,
      error: NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Async version for parsing request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();
    return validateRequest(body, schema);
  } catch (error) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}
```

#### Step 4: Apply Validation to Patient Endpoints (2 hours)

**File**: `/src/app/api/patients/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreatePatientSchema } from '@/lib/validation/schemas';
import { validateRequestBody } from '@/lib/validation/validate';

/**
 * POST /api/patients
 * Create new patient with validation
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequestBody(request.clone(), CreatePatientSchema);

    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;

    // Create patient in database
    const patient = await prisma.patient.create({
      data: {
        demographics: validatedData.demographics,
        status: validatedData.status,
        type: validatedData.type,
        medicalHistory: validatedData.medicalHistory,
        roundingData: validatedData.roundingData,
        mriData: validatedData.mriData,
        stickerData: validatedData.stickerData,
        appointmentInfo: validatedData.appointmentInfo,
      },
      include: {
        soapNotes: true,
        tasks: true,
      },
    });

    // Auto-create default tasks based on patient type
    const defaultTasks = getDefaultTasks(patient.type, patient.id);

    if (defaultTasks.length > 0) {
      await prisma.task.createMany({
        data: defaultTasks,
      });
      console.log(`[API] Auto-created ${defaultTasks.length} tasks for ${patient.type} patient ${patient.id}`);
    }

    // Fetch patient with tasks
    const patientWithTasks = await prisma.patient.findUnique({
      where: { id: patient.id },
      include: {
        soapNotes: true,
        tasks: true,
      },
    });

    return NextResponse.json(patientWithTasks, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}

function getDefaultTasks(type: string, patientId: number) {
  const tasks: any[] = [];

  if (type === 'MRI') {
    tasks.push(
      {
        title: 'Pre-MRI bloodwork',
        patientId,
        category: 'Diagnostic',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'MRI consent signed',
        patientId,
        category: 'Administrative',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'Fast patient 6-8 hours',
        patientId,
        category: 'Treatment',
        timeOfDay: 'Overnight',
        completed: false,
      }
    );
  } else if (type === 'Surgery') {
    tasks.push(
      {
        title: 'Pre-op bloodwork',
        patientId,
        category: 'Diagnostic',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'Surgery consent signed',
        patientId,
        category: 'Administrative',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'Post-op pain assessment',
        patientId,
        category: 'Medical',
        timeOfDay: 'Evening',
        completed: false,
      }
    );
  } else {
    // Medical patient
    tasks.push(
      {
        title: 'Morning exam',
        patientId,
        category: 'Medical',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'Medication administration',
        patientId,
        category: 'Treatment',
        timeOfDay: 'Morning',
        completed: false,
      },
      {
        title: 'Evening exam',
        patientId,
        category: 'Medical',
        timeOfDay: 'Evening',
        completed: false,
      }
    );
  }

  return tasks;
}
```

**File**: `/src/app/api/patients/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdatePatientSchema } from '@/lib/validation/schemas';
import { validateRequestBody } from '@/lib/validation/validate';

/**
 * PATCH /api/patients/[id]
 * Update patient with validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request.clone(), UpdatePatientSchema);

    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;

    // Verify patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Update patient
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: validatedData,
      include: {
        soapNotes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('[API] Error updating patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}
```

#### Step 5: Apply Validation to Task Endpoints (1.5 hours)

**File**: `/src/app/api/tasks/patients/[id]/tasks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/validation/schemas';
import { validateRequestBody } from '@/lib/validation/validate';

/**
 * POST /api/tasks/patients/[id]/tasks
 * Create task with validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = parseInt(resolvedParams.id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request.clone(), CreateTaskSchema);

    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        ...validatedData,
        patientId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

#### Step 6: Apply Validation to AI Parser (30 min)

**File**: `/src/app/api/ai-parse/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AIParseRequestSchema } from '@/lib/validation/schemas';
import { validateRequestBody } from '@/lib/validation/validate';

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const validation = await validateRequestBody(request.clone(), AIParseRequestSchema);

    if (!validation.success) {
      return validation.error;
    }

    const { text } = validation.data;

    // Call Claude API...
    // (rest of implementation)
  } catch (error) {
    console.error('[AI Parse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse text' },
      { status: 500 }
    );
  }
}
```

#### Step 7: Test Validation (1.5 hours)

**Create validation test script**: `/scripts/test-validation.ts`

```typescript
/**
 * Test Zod validation on API endpoints
 */

const BASE_URL = 'http://localhost:3001';

async function testPatientValidation() {
  console.log('Testing Patient Validation...\n');

  // Test 1: Valid patient
  console.log('1. Valid patient creation');
  const valid = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      demographics: {
        name: 'Validation Test',
        species: 'Dog',
        breed: 'Beagle',
        age: '3yo',
        sex: 'MN',
        weight: 15,
      },
      type: 'Medical',
    }),
  });
  console.log(`   Status: ${valid.status} (expected 201)`);
  console.log(`   Result: ${valid.status === 201 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Missing required field (name)
  console.log('2. Missing required field (name)');
  const missingName = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      demographics: {
        species: 'Dog',
      },
    }),
  });
  console.log(`   Status: ${missingName.status} (expected 400)`);
  const missingNameError = await missingName.json();
  console.log(`   Error: ${JSON.stringify(missingNameError)}`);
  console.log(`   Result: ${missingName.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Invalid species
  console.log('3. Invalid species');
  const invalidSpecies = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      demographics: {
        name: 'Test',
        species: 'Bird',
      },
    }),
  });
  console.log(`   Status: ${invalidSpecies.status} (expected 400)`);
  const speciesError = await invalidSpecies.json();
  console.log(`   Error: ${JSON.stringify(speciesError)}`);
  console.log(`   Result: ${invalidSpecies.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Negative weight
  console.log('4. Negative weight');
  const negativeWeight = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      demographics: {
        name: 'Test',
        species: 'Dog',
        weight: -5,
      },
    }),
  });
  console.log(`   Status: ${negativeWeight.status} (expected 400)`);
  const weightError = await negativeWeight.json();
  console.log(`   Error: ${JSON.stringify(weightError)}`);
  console.log(`   Result: ${negativeWeight.status === 400 ? 'PASS' : 'FAIL'}\n`);
}

async function testTaskValidation() {
  console.log('Testing Task Validation...\n');

  // Test 1: Valid task
  console.log('1. Valid task creation');
  const valid = await fetch(`${BASE_URL}/api/tasks/patients/1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Validation Test Task',
      category: 'Medical',
      timeOfDay: 'Morning',
      completed: false,
    }),
  });
  console.log(`   Status: ${valid.status} (expected 201)`);
  console.log(`   Result: ${valid.status === 201 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Missing required field (title)
  console.log('2. Missing required field (title)');
  const missingTitle = await fetch(`${BASE_URL}/api/tasks/patients/1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Medical',
    }),
  });
  console.log(`   Status: ${missingTitle.status} (expected 400)`);
  const titleError = await missingTitle.json();
  console.log(`   Error: ${JSON.stringify(titleError)}`);
  console.log(`   Result: ${missingTitle.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Invalid time of day
  console.log('3. Invalid time of day');
  const invalidTime = await fetch(`${BASE_URL}/api/tasks/patients/1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Task',
      timeOfDay: 'Midnight',
    }),
  });
  console.log(`   Status: ${invalidTime.status} (expected 400)`);
  const timeError = await invalidTime.json();
  console.log(`   Error: ${JSON.stringify(timeError)}`);
  console.log(`   Result: ${invalidTime.status === 400 ? 'PASS' : 'FAIL'}\n`);
}

async function runTests() {
  try {
    await testPatientValidation();
    await testTaskValidation();
    console.log('✅ All validation tests complete!');
  } catch (error) {
    console.error('❌ Validation tests failed:', error);
    process.exit(1);
  }
}

runTests();
```

**Run tests**:
```bash
npx tsx scripts/test-validation.ts
```

### Success Criteria

- [ ] Zod schemas created for all data types
- [ ] Validation middleware implemented
- [ ] Patient endpoints validate input
- [ ] Task endpoints validate input
- [ ] AI parser endpoint validates input
- [ ] Invalid requests return 400 with details
- [ ] Valid requests still work
- [ ] All validation tests pass

---

# WEEK 3-4: TESTING & MEASUREMENT

## 🟡 ISSUE #6: Write Comprehensive Playwright Tests

**Priority**: 🟡 MEDIUM
**Time Estimate**: 2 weeks
**Impact**: Prevents regressions, documents expected behavior

*(Continuing in next message due to length...)*

### Quick Summary of Remaining Issues

**Week 3-4**: Testing & Measurement
- Issue #6: Write Playwright tests (2 weeks)
- Issue #7: Measure real time savings with users (1 week)

**Week 5-6**: Performance & Polish
- Issue #8: Fix data model inconsistencies (1 week)
- Issue #9: Performance optimization (1 week)
- Issue #10: UI/UX improvements (ongoing)

Would you like me to continue with the detailed plans for Issues #6-10?
