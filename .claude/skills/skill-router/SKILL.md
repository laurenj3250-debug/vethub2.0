---
name: skill-router
description: Meta-skill that analyzes requests and routes them to the optimal workflow and skill combination. Use this when starting any non-trivial task to select the best approach - debugging, features, UI, testing, refactoring, or documentation workflows.
---

# Skill Router - Meta Workflow Orchestrator

> **Purpose**: Analyze incoming requests and intelligently route them to the optimal combination of skills and workflows for maximum effectiveness.

---

## How This Skill Works

When invoked, this skill helps you:
1. **Classify** the request into a task category
2. **Identify** the most relevant skills from the 46+ available
3. **Compose** an optimal workflow sequence
4. **Execute** with the right approach from the start

---

## Step 1: Task Classification

Analyze the user's request and classify it into ONE primary category:

| Category | Signals | Primary Skills |
|----------|---------|----------------|
| **NEW_FEATURE** | "add", "create", "implement", "build", "new" | brainstorming → test-driven-development → verification-before-completion |
| **BUG_FIX** | "fix", "broken", "error", "not working", "debug" | systematic-debugging → root-cause-tracing → verification-before-completion |
| **REFACTOR** | "refactor", "improve", "clean up", "optimize" | brainstorming → using-git-worktrees → requesting-code-review |
| **UI_DESIGN** | "design", "UI", "visual", "mobile", "responsive", "style" | brainstorming → brand-guidelines → theme-factory |
| **TESTING** | "test", "coverage", "spec", "e2e", "playwright" | test-driven-development → testing-anti-patterns → condition-based-waiting |
| **DOCUMENTATION** | "document", "readme", "changelog", "explain" | content-research-writer → changelog-generator |
| **RESEARCH** | "find", "search", "explore", "understand", "how does" | (Use Task tool with Explore agent) |
| **PLANNING** | "plan", "design", "architect", "strategy" | brainstorming → executing-plans |
| **REVIEW** | "review", "check", "audit", "validate" | requesting-code-review → verification-before-completion |
| **PARALLEL_WORK** | Multiple independent tasks, "in parallel", "simultaneously" | dispatching-parallel-agents |
| **GIT_WORKFLOW** | "commit", "branch", "merge", "PR", "release" | using-git-worktrees → finishing-a-development-branch |
| **COMMUNICATION** | "write", "email", "update", "report", "announcement" | internal-comms → content-research-writer |

---

## Step 2: Workflow Selection

### Workflow A: New Feature Development
```
1. brainstorming        → Refine requirements, explore approaches
2. test-driven-dev      → Write failing tests first
3. subagent-driven-dev  → Implement in controlled batches
4. requesting-code-review → Validate implementation
5. verification-before-completion → Confirm everything works
6. finishing-a-development-branch → Clean merge/PR
```
**Use when**: Building new functionality from scratch

### Workflow B: Bug Investigation & Fix
```
1. systematic-debugging → Four-phase investigation
2. root-cause-tracing   → Trace to origin of issue
3. defense-in-depth     → Add validation layers
4. test-driven-dev      → Write regression test
5. verification-before-completion → Confirm fix works
```
**Use when**: Something is broken and cause is unclear

### Workflow C: UI/UX Development
```
1. brainstorming        → Explore design approaches
2. brand-guidelines     → Apply consistent styling
3. artifacts-builder    → Build complex components (if React)
4. theme-factory        → Apply/create themes
5. verification-before-completion → Visual + accessibility check
```
**Use when**: Building or improving user interfaces

### Workflow D: Rapid Prototyping
```
1. brainstorming        → Quick ideation (limit to 5 min)
2. artifacts-builder    → Fast implementation
3. verification-before-completion → Basic validation
```
**Use when**: Quick proof of concept needed

### Workflow E: Code Quality Improvement
```
1. using-git-worktrees  → Isolate changes
2. requesting-code-review → Identify issues
3. simplification-cascades → Find simplifying insights
4. test-driven-dev      → Ensure no regressions
5. finishing-a-development-branch → Clean integration
```
**Use when**: Refactoring or improving existing code

### Workflow F: Complex Multi-Part Task
```
1. brainstorming        → Break down into components
2. dispatching-parallel-agents → Parallelize independent work
3. requesting-code-review → Review each component
4. verification-before-completion → Comprehensive validation
```
**Use when**: Large task with multiple independent parts

### Workflow G: Test Suite Development
```
1. test-driven-development → Core testing principles
2. testing-anti-patterns → Avoid common mistakes
3. condition-based-waiting → Handle async properly
4. verification-before-completion → Run full suite
```
**Use when**: Building or fixing tests

### Workflow H: Documentation & Communication
```
1. content-research-writer → Research and outline
2. internal-comms       → Use company formats
3. changelog-generator  → Auto-generate from commits
```
**Use when**: Writing docs, reports, or updates

---

## Step 3: Skill Quick Reference

### For Planning & Design
| Skill | Use When |
|-------|----------|
| `brainstorming` | Need to refine rough ideas before coding |
| `prompt-engineering` | Creating prompts for Claude/LLMs |
| `executing-plans` | Have a plan, need controlled execution |

### For Implementation
| Skill | Use When |
|-------|----------|
| `test-driven-development` | Any feature or bugfix (write test first!) |
| `subagent-driven-development` | Multiple tasks with review between each |
| `dispatching-parallel-agents` | 3+ independent problems to solve |
| `artifacts-builder` | Complex React/Tailwind/shadcn components |

### For Debugging
| Skill | Use When |
|-------|----------|
| `systematic-debugging` | Any bug - before proposing fixes |
| `root-cause-tracing` | Deep errors, need to trace origin |
| `defense-in-depth` | Invalid data causing failures |

### For Testing
| Skill | Use When |
|-------|----------|
| `test-driven-development` | Always write test first |
| `testing-anti-patterns` | Avoid mocking pitfalls |
| `condition-based-waiting` | Flaky tests, race conditions |

### For Code Quality
| Skill | Use When |
|-------|----------|
| `requesting-code-review` | After completing implementation |
| `receiving-code-review` | Got feedback, before implementing |
| `simplification-cascades` | Complexity is spiraling |
| `verification-before-completion` | Before claiming "done" |

### For Visual/Design
| Skill | Use When |
|-------|----------|
| `brand-guidelines` | Need Anthropic styling |
| `theme-factory` | Styling artifacts with themes |
| `canvas-design` | Creating visual art/posters |
| `image-enhancer` | Improving screenshot quality |
| `slack-gif-creator` | Animated GIFs for Slack |

### For Git & Branching
| Skill | Use When |
|-------|----------|
| `using-git-worktrees` | Need isolated workspace |
| `finishing-a-development-branch` | Ready to merge/PR |

### For Research & Writing
| Skill | Use When |
|-------|----------|
| `content-research-writer` | Writing with research/citations |
| `changelog-generator` | Release notes from commits |
| `internal-comms` | Status reports, updates |

---

## Step 4: Decision Tree

```
START
  │
  ├─ Is this a bug/error? ──────────────────→ Workflow B (Bug Fix)
  │
  ├─ Is this new functionality? ────────────→ Workflow A (New Feature)
  │
  ├─ Is this UI/visual work? ───────────────→ Workflow C (UI/UX)
  │
  ├─ Is this refactoring/cleanup? ──────────→ Workflow E (Code Quality)
  │
  ├─ Is this testing work? ─────────────────→ Workflow G (Testing)
  │
  ├─ Is this documentation? ────────────────→ Workflow H (Documentation)
  │
  ├─ Are there 3+ independent tasks? ───────→ Workflow F (Parallel)
  │
  ├─ Is this a quick prototype? ────────────→ Workflow D (Rapid)
  │
  └─ Unclear? ──────────────────────────────→ Start with `brainstorming`
```

---

## Step 5: Execution Checklist

Before starting ANY workflow:
- [ ] Read `BEFORE-YOU-CODE.md` (if exists)
- [ ] Check `.claude/learnings/mistakes.md` for known issues
- [ ] Verify you understand the ACTUAL problem (not assumptions)
- [ ] Use TodoWrite to track the workflow steps

During execution:
- [ ] Mark todos as in_progress when starting each step
- [ ] Mark todos as completed immediately after finishing
- [ ] Run verification commands before claiming done
- [ ] Document new learnings in `.claude/learnings/`

After completion:
- [ ] Run `verification-before-completion` skill
- [ ] Update `.claude/learnings/` with insights
- [ ] Clean up any temporary files/branches

---

## Quick Start Examples

### Example 1: "Add dark mode to the app"
**Classification**: NEW_FEATURE + UI_DESIGN
**Workflow**: A + C hybrid
```
1. brainstorming → Explore theme approaches
2. brand-guidelines → Ensure consistent colors
3. test-driven-dev → Write visual regression tests
4. theme-factory → Implement theme switching
5. verification-before-completion → Test all viewports
```

### Example 2: "The save button doesn't work"
**Classification**: BUG_FIX
**Workflow**: B
```
1. systematic-debugging → Investigate (don't guess!)
2. root-cause-tracing → Find actual cause
3. test-driven-dev → Write regression test
4. verification-before-completion → Confirm fix
```

### Example 3: "Refactor the API layer"
**Classification**: REFACTOR
**Workflow**: E
```
1. using-git-worktrees → Isolate changes
2. brainstorming → Plan approach
3. requesting-code-review → Get feedback on plan
4. subagent-driven-dev → Execute in batches
5. verification-before-completion → Full test suite
```

### Example 4: "Make the rounding sheet mobile-friendly"
**Classification**: UI_DESIGN
**Workflow**: C
```
1. brainstorming → Explore responsive approaches
2. brand-guidelines → Check design system
3. theme-factory → Ensure consistent styling
4. test-driven-dev → Write viewport tests
5. verification-before-completion → Test 375px, 768px, 1440px
```

---

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Jump straight to coding | Start with brainstorming for non-trivial tasks |
| Guess at bug causes | Use systematic-debugging first |
| Skip tests | Always use test-driven-development |
| Claim "done" without verification | Use verification-before-completion |
| Work on multiple things at once | Focus on one workflow at a time |
| Ignore existing learnings | Check .claude/learnings/ first |

---

## Integration with VetHub 2.0

For VetHub-specific work, also consider:

1. **Before UI changes**: Check `.claude/context/design-principles.md` and `.claude/context/style-guide.md`
2. **For debugging**: Use `vethub-debug` skill with its checklists
3. **For API work**: Check `.claude/skills/vethub-debug/references/api-field-mappings.md`
4. **After UI changes**: Run `@agent-design-review` subagent
5. **Before committing**: Run `npm run build && npm run typecheck`

---

## Invocation

When you invoke this skill, I will:

1. Analyze your request
2. Classify the task type
3. Recommend a workflow
4. List the specific skills to invoke in order
5. Begin execution with the first skill

**Ready to route your request!**
