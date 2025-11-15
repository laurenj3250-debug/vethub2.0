# Playwright & Design Review Setup Guide

This document describes the Playwright testing and design review workflow that has been added to VetHub 2.0.

## What's Been Added

### 1. Playwright Testing
Playwright has been installed for end-to-end testing with support for:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Mobile and responsive viewport testing
- Accessibility testing
- Visual regression testing

**Installation:**
- `@playwright/test` and `playwright` packages added to devDependencies
- Playwright browsers installed
- Configuration file created at `playwright.config.ts`

**NPM Scripts:**
```bash
npm test          # Run all tests
npm run test:ui   # Run tests with interactive UI
npm run test:headed   # Run tests in headed mode (see browser)
npm run test:report   # View test report
```

### 2. Design Review Agent

A comprehensive design review system from [claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) has been integrated.

**Features:**
- Automated design reviews using Playwright browser automation
- Live environment testing (navigates actual app, captures screenshots)
- Multi-phase review process covering:
  - Interaction and user flow testing
  - Responsive design validation (mobile/tablet/desktop)
  - Visual polish assessment
  - WCAG 2.1 AA accessibility compliance
  - Robustness testing (edge cases, error states)
  - Code health checks

**How to Use:**

1. **Quick Visual Check** (after any UI change):
   ```bash
   # This is automatically part of your workflow
   # See CLAUDE.md for the checklist
   ```

2. **Comprehensive Design Review**:
   ```bash
   # In Claude Code, use:
   @agent-design-review

   # Or run the slash command:
   /design-review
   ```

3. **Custom PR Review**:
   The design review agent will automatically analyze git diffs and provide categorized feedback:
   - [Blocker] - Critical issues
   - [High-Priority] - Fix before merge
   - [Medium-Priority] - Follow-up improvements
   - [Nitpick] - Minor aesthetic details

### 3. Design Documentation

**Design Principles** (`.claude/context/design-principles.md`):
- VetHub-specific design philosophy
- Color palette and semantic colors
- Typography scale
- Component specifications
- Accessibility requirements
- Performance standards

**Style Guide** (`.claude/context/style-guide.md`):
- Complete visual design system
- Color values and usage
- Typography specifications
- Component specifications (buttons, inputs, cards, etc.)
- Spacing scale
- Animation guidelines
- Responsive breakpoints
- Code style conventions

### 4. Directory Structure

```
vethub2.0/
├── .claude/
│   ├── agents/
│   │   ├── design-review.md         # Design review agent
│   │   └── neuro-soap-ux-architect.md
│   ├── commands/
│   │   └── design-review.md         # /design-review slash command
│   └── context/
│       ├── design-principles.md     # Design philosophy & guidelines
│       └── style-guide.md           # Complete design system specs
├── tests/
│   └── example.spec.ts              # Sample Playwright tests
├── playwright.config.ts             # Playwright configuration
└── CLAUDE.md                        # Project configuration for Claude Code
```

## Getting Started with Testing

### Running Tests

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Run tests in another terminal:**
   ```bash
   npm test
   ```

3. **Or run with UI mode (recommended):**
   ```bash
   npm run test:ui
   ```

### Writing Tests

Create test files in the `tests/` directory with `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/your-page');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Design Review Workflow

### When to Use Design Review

Run design review when:
- Completing a new UI feature
- Making significant visual changes
- Before creating/merging a pull request
- When you want comprehensive accessibility validation
- Testing responsive behavior across devices

### Review Process

The design review agent follows this methodology:

1. **Preparation**: Analyzes git diff and PR description
2. **Live Testing**: Navigates to affected pages using Playwright
3. **Interaction Testing**: Tests hover states, clicks, forms
4. **Responsive Testing**: Validates mobile (375px), tablet (768px), desktop (1440px)
5. **Visual Polish**: Checks alignment, spacing, typography, colors
6. **Accessibility**: WCAG 2.1 AA compliance (keyboard nav, focus states, contrast)
7. **Robustness**: Edge cases, error states, loading states
8. **Code Health**: Checks for design token usage, component reuse
9. **Console Check**: Verifies no errors/warnings

### Review Output

You'll receive a categorized report:
```markdown
### Design Review Summary
[Overall assessment]

### Findings

#### Blockers
- [Critical issue with screenshot]

#### High-Priority
- [Important issue with screenshot]

#### Medium-Priority / Suggestions
- [Improvement suggestion]

#### Nitpicks
- Nit: [Minor detail]
```

## Integration with Claude Code

When you make UI changes, Claude Code will:

1. **Automatically reference** design principles and style guide
2. **Suggest design review** for significant changes
3. **Validate compliance** against established patterns
4. **Capture screenshots** for visual verification
5. **Check console** for errors

This is configured in `CLAUDE.md` and loaded automatically.

## MCP Server Setup (Optional)

For the design review agent to work optimally, you'll need the Playwright MCP server. This is typically configured in your Claude Code settings.

If you're using Claude Code and see references to `mcp__playwright__*` tools, these are provided by the Playwright MCP server which enables browser automation during design reviews.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Claude Code Workflows Repository](https://github.com/OneRedOak/claude-code-workflows)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Next Steps

1. Review `.claude/context/design-principles.md` to understand VetHub's design philosophy
2. Familiarize yourself with `.claude/context/style-guide.md` for implementation details
3. Try running `@agent-design-review` in Claude Code on your next UI change
4. Write Playwright tests for critical user flows
5. Run tests in CI/CD pipeline (configure in your deployment workflow)

## Tips

- Use `npm run test:ui` for iterative test development
- Press `Shift+Tab` in Claude Code to toggle auto-accept mode when working with the design agent
- Reference design docs when implementing new components
- Run visual checks immediately after UI changes (before committing)
- Use `@agent-design-review` before creating pull requests

## Troubleshooting

**Tests timing out?**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running on port 3000

**Browser not launching?**
- Run `npx playwright install` to reinstall browsers

**Design review agent not working?**
- Ensure Playwright MCP server is configured in Claude Code
- Check that dev server is running
- Verify `.claude/agents/design-review.md` exists

**Console errors in tests?**
- Check browser console in headed mode: `npm run test:headed`
- Review network tab for failed requests
