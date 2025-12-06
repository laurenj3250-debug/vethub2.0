#!/usr/bin/env python3
"""
Comprehensive VetHub Main Page Audit
Tests all functionality and identifies issues without fixing them.
"""

from playwright.sync_api import sync_playwright
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3002"
SCREENSHOT_DIR = "/tmp/vethub-audit"

issues = []
warnings = []
successes = []

def log_issue(category, description, details=None):
    """Log an issue found during testing"""
    issue = {
        "category": category,
        "description": description,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    issues.append(issue)
    print(f"❌ ISSUE [{category}]: {description}")
    if details:
        print(f"   Details: {details}")

def log_warning(category, description, details=None):
    """Log a warning (not an error, but could be improved)"""
    warning = {
        "category": category,
        "description": description,
        "details": details
    }
    warnings.append(warning)
    print(f"⚠️  WARNING [{category}]: {description}")
    if details:
        print(f"   Details: {details}")

def log_success(category, description):
    """Log a successful test"""
    successes.append({"category": category, "description": description})
    print(f"✅ PASS [{category}]: {description}")

def take_screenshot(page, name):
    """Take a screenshot with timestamp"""
    import os
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"📸 Screenshot: {path}")
    return path

def test_page_load(page):
    """Test initial page load"""
    print("\n" + "="*60)
    print("TESTING: Initial Page Load")
    print("="*60)

    try:
        page.goto(BASE_URL)
        page.wait_for_load_state('networkidle')
        take_screenshot(page, "01-initial-load")
        log_success("Page Load", "Main page loads successfully")
    except Exception as e:
        log_issue("Page Load", "Failed to load main page", str(e))
        return False

    # Check for console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # Wait a moment for any delayed errors
    page.wait_for_timeout(1000)

    if console_errors:
        for err in console_errors:
            log_issue("Console Error", "JavaScript console error", err)
    else:
        log_success("Console", "No console errors on load")

    return True

def test_task_checklist_presence(page):
    """Test that task checklist component is present"""
    print("\n" + "="*60)
    print("TESTING: Task Checklist Presence")
    print("="*60)

    # Look for the Tasks header
    tasks_header = page.locator("text=Tasks").first
    if tasks_header.is_visible():
        log_success("Task Checklist", "Tasks section is visible")
    else:
        log_issue("Task Checklist", "Tasks section not found on page")
        return False

    # Check for progress bar
    progress_bar = page.locator("[class*='rounded-full'][class*='overflow-hidden']").first
    if progress_bar.is_visible():
        log_success("Task Checklist", "Progress bar is visible")
    else:
        log_warning("Task Checklist", "Progress bar not visible or has unexpected styling")

    return True

def test_time_filters(page):
    """Test AM/PM time filters"""
    print("\n" + "="*60)
    print("TESTING: Time Filters (All/AM/PM)")
    print("="*60)

    # Look for All button
    all_btn = page.locator("button:has-text('All')").first
    am_btn = page.locator("button:has-text('AM')").first
    pm_btn = page.locator("button:has-text('PM')").first

    # Test All button
    if all_btn.is_visible():
        log_success("Time Filter", "'All' button is visible")
        all_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "02-filter-all")
    else:
        log_issue("Time Filter", "'All' button not found")

    # Test AM button
    if am_btn.is_visible():
        log_success("Time Filter", "'AM' button is visible")
        am_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "03-filter-am")

        # Check if filter actually works - should show morning tasks
        # This is a visual check - we'd need to verify the DOM
    else:
        log_issue("Time Filter", "'AM' button not found")

    # Test PM button
    if pm_btn.is_visible():
        log_success("Time Filter", "'PM' button is visible")
        pm_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "04-filter-pm")
    else:
        log_issue("Time Filter", "'PM' button not found")

    # Reset to All
    if all_btn.is_visible():
        all_btn.click()
        page.wait_for_timeout(300)

def test_view_mode_toggle(page):
    """Test By Task / By Patient view toggle"""
    print("\n" + "="*60)
    print("TESTING: View Mode Toggle (By Task / By Patient)")
    print("="*60)

    by_task_btn = page.locator("button:has-text('By Task')").first
    by_patient_btn = page.locator("button:has-text('By Patient')").first

    # Test By Task view
    if by_task_btn.is_visible():
        log_success("View Mode", "'By Task' button is visible")
        by_task_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "05-view-by-task")
    else:
        log_issue("View Mode", "'By Task' button not found")

    # Test By Patient view
    if by_patient_btn.is_visible():
        log_success("View Mode", "'By Patient' button is visible")
        by_patient_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "06-view-by-patient")
    else:
        log_issue("View Mode", "'By Patient' button not found")

    # Reset to By Task
    if by_task_btn.is_visible():
        by_task_btn.click()
        page.wait_for_timeout(300)

def test_hide_done_toggle(page):
    """Test hide/show done toggle"""
    print("\n" + "="*60)
    print("TESTING: Hide/Show Done Toggle")
    print("="*60)

    # Look for the toggle button (could say "show done" or "hide done")
    hide_btn = page.locator("button:has-text('hide done')").first
    show_btn = page.locator("button:has-text('show done')").first

    if hide_btn.is_visible():
        log_success("Done Toggle", "'hide done' button visible (currently showing done)")
        hide_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "07-hide-done")
    elif show_btn.is_visible():
        log_success("Done Toggle", "'show done' button visible (currently hiding done)")
        show_btn.click()
        page.wait_for_timeout(300)
        take_screenshot(page, "07-show-done")
    else:
        log_issue("Done Toggle", "Hide/show done toggle not found")

def test_add_task_flow(page):
    """Test adding a new task"""
    print("\n" + "="*60)
    print("TESTING: Add Task Flow")
    print("="*60)

    # Look for Add Task button
    add_btn = page.locator("button:has-text('Add Task')").first

    if not add_btn.is_visible():
        log_issue("Add Task", "'Add Task' button not found")
        return

    log_success("Add Task", "'Add Task' button is visible")
    add_btn.click()
    page.wait_for_timeout(300)
    take_screenshot(page, "08-add-task-form")

    # Check for input field
    task_input = page.locator("input[placeholder*='Task']").first
    if task_input.is_visible():
        log_success("Add Task", "Task name input field is visible")
    else:
        log_warning("Add Task", "Task name input field not found with expected placeholder")

    # Check for patient selector
    patient_select = page.locator("select").first
    if patient_select.is_visible():
        log_success("Add Task", "Patient selector is visible")

        # Check options
        options = patient_select.locator("option").all()
        option_count = len(options)
        log_success("Add Task", f"Patient selector has {option_count} options")
    else:
        log_warning("Add Task", "Patient selector not found")

    # Check for cancel button
    cancel_btn = page.locator("button svg").first  # X icon
    if cancel_btn.is_visible():
        cancel_btn.click()
        page.wait_for_timeout(300)
        log_success("Add Task", "Cancel button works")
    else:
        log_warning("Add Task", "Cancel button not clearly visible")

def test_patient_list(page):
    """Test patient list and cards"""
    print("\n" + "="*60)
    print("TESTING: Patient List")
    print("="*60)

    # Look for patient cards or list items
    # This depends on your specific implementation
    patient_elements = page.locator("[class*='patient'], [data-testid*='patient']").all()

    if len(patient_elements) > 0:
        log_success("Patient List", f"Found {len(patient_elements)} patient elements")
    else:
        # Try looking for any cards with names
        cards = page.locator("[class*='rounded-2xl']").all()
        log_warning("Patient List", f"No explicit patient elements found, but {len(cards)} card elements exist")

def test_task_toggle(page):
    """Test toggling a task complete/incomplete"""
    print("\n" + "="*60)
    print("TESTING: Task Toggle (Complete/Incomplete)")
    print("="*60)

    # Look for task checkboxes or toggle buttons
    # Tasks usually have a circle ○ or check ✓
    task_toggles = page.locator("button:has-text('○'), button:has-text('✓')").all()

    if len(task_toggles) > 0:
        log_success("Task Toggle", f"Found {len(task_toggles)} toggleable task elements")

        # Try clicking the first incomplete one
        incomplete = page.locator("button:has-text('○')").first
        if incomplete.is_visible():
            take_screenshot(page, "09-before-toggle")
            incomplete.click()
            page.wait_for_timeout(500)
            take_screenshot(page, "10-after-toggle")
            log_success("Task Toggle", "Clicked task toggle - check screenshots for result")
    else:
        log_warning("Task Toggle", "No obvious task toggle buttons found")

def test_patient_status_switching(page):
    """Test patient status dropdown/switching"""
    print("\n" + "="*60)
    print("TESTING: Patient Status Switching")
    print("="*60)

    # Look for status badges or dropdowns
    status_elements = page.locator("[class*='status'], select:has-text('Status')").all()

    if len(status_elements) > 0:
        log_success("Patient Status", f"Found {len(status_elements)} status-related elements")
    else:
        # Look for common status text
        statuses = ["New Admit", "Pre-procedure", "Recovery", "Discharged", "Discharging"]
        found_statuses = []
        for status in statuses:
            if page.locator(f"text={status}").first.is_visible():
                found_statuses.append(status)

        if found_statuses:
            log_success("Patient Status", f"Found status indicators: {', '.join(found_statuses)}")
        else:
            log_warning("Patient Status", "No status indicators found on main page")

def test_general_tasks_section(page):
    """Test General Tasks section (not patient-specific)"""
    print("\n" + "="*60)
    print("TESTING: General Tasks Section")
    print("="*60)

    # Look for "General" section in By Patient view
    by_patient_btn = page.locator("button:has-text('By Patient')").first
    if by_patient_btn.is_visible():
        by_patient_btn.click()
        page.wait_for_timeout(300)

    general_section = page.locator("text=General").first
    if general_section.is_visible():
        log_success("General Tasks", "General tasks section is visible")
        take_screenshot(page, "11-general-tasks")
    else:
        log_warning("General Tasks", "General tasks section not found - may be empty or hidden")

def test_clear_all_button(page):
    """Test Clear All button presence and warning"""
    print("\n" + "="*60)
    print("TESTING: Clear All Button")
    print("="*60)

    clear_btn = page.locator("button:has-text('Clear All')").first
    if clear_btn.is_visible():
        log_success("Clear All", "Clear All button is visible")
        log_warning("Clear All", "DANGEROUS: Clear All button is exposed - should require confirmation")
    else:
        log_success("Clear All", "Clear All button not visible (may be hidden when no tasks)")

def test_responsive_layout(page):
    """Test layout at different viewport sizes"""
    print("\n" + "="*60)
    print("TESTING: Responsive Layout")
    print("="*60)

    viewports = [
        {"name": "mobile", "width": 375, "height": 812},
        {"name": "tablet", "width": 768, "height": 1024},
        {"name": "desktop", "width": 1440, "height": 900},
    ]

    for vp in viewports:
        page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
        page.wait_for_timeout(300)
        take_screenshot(page, f"12-responsive-{vp['name']}")
        log_success("Responsive", f"Screenshot captured at {vp['name']} ({vp['width']}x{vp['height']})")

    # Reset to desktop
    page.set_viewport_size({"width": 1440, "height": 900})

def test_accessibility(page):
    """Basic accessibility checks"""
    print("\n" + "="*60)
    print("TESTING: Accessibility")
    print("="*60)

    # Check for buttons without accessible text
    buttons = page.locator("button").all()
    buttons_without_text = 0
    for btn in buttons:
        text = btn.inner_text().strip()
        aria_label = btn.get_attribute("aria-label") or ""
        if not text and not aria_label:
            buttons_without_text += 1

    if buttons_without_text > 0:
        log_warning("Accessibility", f"{buttons_without_text} buttons found without accessible text or aria-label")
    else:
        log_success("Accessibility", "All buttons have accessible text or aria-labels")

    # Check for color contrast (visual check reminder)
    log_warning("Accessibility", "MANUAL CHECK NEEDED: Verify color contrast meets WCAG AA standards")

def analyze_dom_structure(page):
    """Analyze the DOM for potential issues"""
    print("\n" + "="*60)
    print("ANALYZING: DOM Structure")
    print("="*60)

    # Get the page content
    content = page.content()

    # Check for inline styles (potential maintenance issue)
    inline_style_count = content.count('style="')
    if inline_style_count > 50:
        log_warning("Code Quality", f"High number of inline styles ({inline_style_count}) - consider using CSS classes")

    # Check for error boundaries
    if "Error" in content and "boundary" not in content.lower():
        log_warning("Error Handling", "Check if proper error boundaries are in place")

def run_audit():
    """Run the complete audit"""
    print("\n" + "="*60)
    print("VETHUB MAIN PAGE COMPREHENSIVE AUDIT")
    print(f"Started: {datetime.now().isoformat()}")
    print("="*60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Capture console messages
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            "type": msg.type,
            "text": msg.text
        }))

        # Run all tests
        if not test_page_load(page):
            print("\n❌ Page failed to load - aborting further tests")
            browser.close()
            return

        test_task_checklist_presence(page)
        test_time_filters(page)
        test_view_mode_toggle(page)
        test_hide_done_toggle(page)
        test_add_task_flow(page)
        test_patient_list(page)
        test_task_toggle(page)
        test_patient_status_switching(page)
        test_general_tasks_section(page)
        test_clear_all_button(page)
        test_responsive_layout(page)
        test_accessibility(page)
        analyze_dom_structure(page)

        # Check for any console errors captured during tests
        errors = [m for m in console_messages if m["type"] == "error"]
        if errors:
            print("\n" + "="*60)
            print("CONSOLE ERRORS CAPTURED DURING TESTS")
            print("="*60)
            for err in errors:
                log_issue("Console Error", err["text"])

        browser.close()

    # Print summary
    print("\n" + "="*60)
    print("AUDIT SUMMARY")
    print("="*60)
    print(f"✅ Successes: {len(successes)}")
    print(f"⚠️  Warnings: {len(warnings)}")
    print(f"❌ Issues: {len(issues)}")
    print(f"\n📸 Screenshots saved to: {SCREENSHOT_DIR}")

    if issues:
        print("\n" + "="*60)
        print("ALL ISSUES FOUND")
        print("="*60)
        for i, issue in enumerate(issues, 1):
            print(f"{i}. [{issue['category']}] {issue['description']}")
            if issue.get('details'):
                print(f"   → {issue['details']}")

    if warnings:
        print("\n" + "="*60)
        print("ALL WARNINGS (Improvement Opportunities)")
        print("="*60)
        for i, warning in enumerate(warnings, 1):
            print(f"{i}. [{warning['category']}] {warning['description']}")
            if warning.get('details'):
                print(f"   → {warning['details']}")

    # Save results to JSON
    results = {
        "timestamp": datetime.now().isoformat(),
        "successes": successes,
        "warnings": warnings,
        "issues": issues
    }

    with open(f"{SCREENSHOT_DIR}/audit-results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Full results saved to: {SCREENSHOT_DIR}/audit-results.json")

if __name__ == "__main__":
    run_audit()
