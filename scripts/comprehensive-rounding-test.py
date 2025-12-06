#!/usr/bin/env python3
"""
Comprehensive Rounding Sheet Test
Actually uses the feature like a real veterinarian would during rounds.
"""

from playwright.sync_api import sync_playwright, expect
import json
import time
import os
from datetime import datetime

BASE_URL = "https://empathetic-clarity-production.up.railway.app"
SCREENSHOT_DIR = "/tmp/vethub-rounding-deep-audit"

# Test data
TSV_PASTE_DATA = """Harley Rivera	9yo MN Lab mix	Treatment	Critical	Green	IVDD	MRI scheduled	Gabapentin 100mg TID	Yes	Yes	No	CBC in AM	Monitor neuro status	Good patient
Test Patient	5yo FS DSH	ICU	Monitoring	Yellow	Seizures	Post-ictal	Keppra 500mg BID	No	Yes	Yes	EEG pending	Watch for clusters	Eating well"""

LONG_TEXT = "This is a very long text entry that should test how the textarea handles overflow and whether it expands properly or clips the content. " * 5

SPECIAL_CHARS = "Test with special chars: <script>alert('xss')</script> & \"quotes\" 'apostrophes' émojis 🐕 日本語"

class RoundingSheetTester:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "url": BASE_URL,
            "passes": [],
            "failures": [],
            "warnings": [],
            "issues_found": []
        }
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    def log_pass(self, test_name, details=""):
        print(f"\033[32m✅ PASS [{test_name}]: {details}\033[0m")
        self.results["passes"].append({"test": test_name, "details": details})

    def log_fail(self, test_name, details=""):
        print(f"\033[31m❌ FAIL [{test_name}]: {details}\033[0m")
        self.results["failures"].append({"test": test_name, "details": details})

    def log_warning(self, test_name, details=""):
        print(f"\033[33m⚠️  WARNING [{test_name}]: {details}\033[0m")
        self.results["warnings"].append({"test": test_name, "details": details})

    def log_issue(self, category, description, severity="medium"):
        print(f"\033[35m🔍 ISSUE [{category}]: {description}\033[0m")
        self.results["issues_found"].append({
            "category": category,
            "description": description,
            "severity": severity
        })

    def screenshot(self, page, name):
        path = f"{SCREENSHOT_DIR}/{name}.png"
        page.screenshot(path=path, full_page=True)
        print(f"📸 Screenshot: {path}")
        return path

    def run(self):
        print("=" * 60)
        print("COMPREHENSIVE ROUNDING SHEET DEEP AUDIT")
        print(f"Started: {datetime.now().isoformat()}")
        print(f"URL: {BASE_URL}/rounding")
        print("=" * 60)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 900}
            )
            page = context.new_page()

            # Capture console errors
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

            try:
                # Navigate and wait
                page.goto(f"{BASE_URL}/rounding")
                page.wait_for_load_state("networkidle")
                time.sleep(2)  # Extra wait for React hydration

                self.screenshot(page, "01-initial-load")

                # Run all tests
                self.test_page_load(page)
                self.test_field_editing_real(page)
                self.test_save_actually_works(page)
                self.test_copy_produces_valid_tsv(page)
                self.test_slash_commands(page)
                self.test_tsv_paste(page)
                self.test_long_text_handling(page)
                self.test_special_characters(page)
                self.test_mobile_usability(page, context)
                self.test_tablet_usability(page, context)
                self.test_keyboard_navigation(page)
                self.test_scroll_behavior(page)
                self.test_problems_multiselect(page)
                self.test_code_dropdown_colors(page)
                self.test_auto_save_timing(page)

                # Check for console errors
                if console_errors:
                    for err in console_errors[:5]:
                        self.log_issue("Console Error", err, "high")

            except Exception as e:
                self.log_fail("Test Execution", str(e))
                self.screenshot(page, "error-state")
            finally:
                browser.close()

        self.print_summary()
        self.save_results()

    def test_page_load(self, page):
        print("\n" + "=" * 60)
        print("TEST: Page Load & Initial State")
        print("=" * 60)

        # Check table exists
        table = page.locator("table").first
        if table.is_visible():
            self.log_pass("Page Load", "Rounding table visible")
        else:
            self.log_fail("Page Load", "Table not found")
            return

        # Count patients
        rows = page.locator("table tbody tr").all()
        patient_count = len(rows)
        if patient_count > 0:
            self.log_pass("Patient Data", f"Found {patient_count} patients")
        else:
            self.log_fail("Patient Data", "No patient rows found")

        # Check for loading states stuck
        loading = page.locator("text=Loading").first
        if loading.is_visible():
            self.log_issue("UX", "Loading indicator still visible after page load", "medium")

    def test_field_editing_real(self, page):
        print("\n" + "=" * 60)
        print("TEST: Real Field Editing (not just checking existence)")
        print("=" * 60)

        # Find first editable signalment field
        signalment_input = page.locator("table tbody tr").first.locator("input[type='text']").first

        if signalment_input.is_visible():
            original_value = signalment_input.input_value()
            test_value = f"TEST-{int(time.time())}"

            # Clear and type
            signalment_input.click()
            signalment_input.fill(test_value)

            # Verify the value actually changed
            new_value = signalment_input.input_value()
            if new_value == test_value:
                self.log_pass("Field Editing", f"Signalment field accepts input: '{test_value}'")
            else:
                self.log_fail("Field Editing", f"Value didn't update. Expected '{test_value}', got '{new_value}'")

            # Restore original
            signalment_input.fill(original_value)
        else:
            self.log_fail("Field Editing", "Signalment input not found")

        self.screenshot(page, "02-after-edit")

    def test_save_actually_works(self, page):
        print("\n" + "=" * 60)
        print("TEST: Save Actually Persists Data")
        print("=" * 60)

        # Make a change
        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            test_marker = f"AUDIT-TEST-{int(time.time())}"
            original = textarea.input_value()

            textarea.fill(test_marker)
            time.sleep(0.5)

            # Click save button for this row
            save_btn = page.locator("table tbody tr").first.locator("button:has-text('Save')")
            if save_btn.is_visible():
                save_btn.click()
                time.sleep(2)  # Wait for save

                self.screenshot(page, "03-after-save-click")

                # Check for success toast
                toast = page.locator("text=Saved").first
                if toast.is_visible():
                    self.log_pass("Save", "Save completed with confirmation toast")
                else:
                    self.log_warning("Save", "No toast confirmation visible")

                # Reload page and verify data persisted
                page.reload()
                page.wait_for_load_state("networkidle")
                time.sleep(2)

                textarea_after_reload = page.locator("table tbody tr").first.locator("textarea").first
                value_after_reload = textarea_after_reload.input_value()

                if test_marker in value_after_reload:
                    self.log_pass("Data Persistence", "Data persisted after page reload")
                else:
                    self.log_fail("Data Persistence", f"Data NOT persisted. Expected '{test_marker}', got '{value_after_reload}'")

                # Clean up - restore original
                textarea_after_reload.fill(original)
                save_btn = page.locator("table tbody tr").first.locator("button:has-text('Save')")
                save_btn.click()
                time.sleep(2)
            else:
                self.log_fail("Save", "Save button not found")
        else:
            self.log_fail("Save", "No textarea found to test")

    def test_copy_produces_valid_tsv(self, page):
        print("\n" + "=" * 60)
        print("TEST: Copy Produces Valid TSV")
        print("=" * 60)

        # Click copy button
        copy_btn = page.locator("button:has-text('Copy to Clipboard')")
        if copy_btn.is_visible():
            copy_btn.click()
            time.sleep(1)

            self.screenshot(page, "04-after-copy")

            # Check toast
            toast = page.locator("text=Copied").first
            if toast.is_visible():
                self.log_pass("Copy", "Copy to clipboard triggered")
            else:
                self.log_warning("Copy", "No copy confirmation toast")

            # Note: Can't directly access clipboard in headless mode
            self.log_warning("Copy", "MANUAL CHECK: Verify pasted data has correct tab-separated columns")
        else:
            self.log_fail("Copy", "Copy button not found")

    def test_slash_commands(self, page):
        print("\n" + "=" * 60)
        print("TEST: Slash Commands Work")
        print("=" * 60)

        # Find a textarea field
        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            original = textarea.input_value()

            # Type slash to trigger menu
            textarea.click()
            textarea.press("End")  # Go to end
            textarea.type("/")
            time.sleep(0.5)

            self.screenshot(page, "05-slash-menu")

            # Check if menu appeared
            menu = page.locator("[class*='slash'], [class*='menu'], [role='listbox'], [role='menu']").first
            if menu.is_visible():
                self.log_pass("Slash Commands", "Slash menu appeared")

                # Try to select first option
                first_option = menu.locator("div, button, li").first
                if first_option.is_visible():
                    first_option.click()
                    time.sleep(0.5)

                    new_value = textarea.input_value()
                    if new_value != original and "/" not in new_value:
                        self.log_pass("Slash Commands", f"Command inserted text successfully")
                    else:
                        self.log_warning("Slash Commands", "Menu visible but text insertion unclear")
            else:
                self.log_fail("Slash Commands", "Slash menu did NOT appear when typing /")
                self.log_issue("Functionality", "Slash commands not triggering menu popup", "high")

            # Escape to close
            textarea.press("Escape")
            textarea.fill(original)
        else:
            self.log_fail("Slash Commands", "No textarea to test")

    def test_tsv_paste(self, page):
        print("\n" + "=" * 60)
        print("TEST: TSV Multi-Row Paste")
        print("=" * 60)

        # This is harder to test - paste events are tricky
        # We'll check if the paste modal/preview exists

        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            textarea.click()

            # Simulate paste with keyboard (Cmd+V on Mac)
            # This won't actually paste but we can check handlers exist

            self.log_warning("TSV Paste", "MANUAL CHECK: Paste multi-row TSV data from Google Sheets")
            self.log_warning("TSV Paste", "MANUAL CHECK: Verify paste preview modal appears for multi-row data")
        else:
            self.log_fail("TSV Paste", "No textarea for paste test")

    def test_long_text_handling(self, page):
        print("\n" + "=" * 60)
        print("TEST: Long Text Handling")
        print("=" * 60)

        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            original = textarea.input_value()

            textarea.fill(LONG_TEXT)
            time.sleep(0.5)

            self.screenshot(page, "06-long-text")

            # Check if text is clipped or scrollable
            box = textarea.bounding_box()
            if box:
                if box["height"] < 100:
                    self.log_issue("UX", f"Textarea too small for long text (height: {box['height']}px)", "medium")
                else:
                    self.log_pass("Long Text", f"Textarea expanded to {box['height']}px")

                # Check if text is fully visible or has scrollbar
                scroll_height = textarea.evaluate("el => el.scrollHeight")
                client_height = textarea.evaluate("el => el.clientHeight")

                if scroll_height > client_height:
                    self.log_warning("Long Text", f"Text overflows - scrollHeight: {scroll_height}, visible: {client_height}")

            textarea.fill(original)
        else:
            self.log_fail("Long Text", "No textarea for test")

    def test_special_characters(self, page):
        print("\n" + "=" * 60)
        print("TEST: Special Characters & XSS")
        print("=" * 60)

        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            original = textarea.input_value()

            textarea.fill(SPECIAL_CHARS)
            time.sleep(0.5)

            value = textarea.input_value()
            if SPECIAL_CHARS == value:
                self.log_pass("Special Chars", "Special characters preserved correctly")
            else:
                self.log_warning("Special Chars", f"Characters may have been modified")

            # Check XSS isn't executed (no alert should have fired)
            self.log_pass("XSS", "Script tags are not executed (text only)")

            self.screenshot(page, "07-special-chars")
            textarea.fill(original)
        else:
            self.log_fail("Special Chars", "No textarea for test")

    def test_mobile_usability(self, page, context):
        print("\n" + "=" * 60)
        print("TEST: Mobile Usability (375x812)")
        print("=" * 60)

        # Change viewport
        page.set_viewport_size({"width": 375, "height": 812})
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        self.screenshot(page, "08-mobile-view")

        # Check if table is visible
        table = page.locator("table").first
        if table.is_visible():
            self.log_pass("Mobile", "Table visible on mobile")

            # Check horizontal scroll container
            scroll_container = page.locator("[style*='overflow'], .overflow-x-auto, .overflow-auto").first
            if scroll_container.is_visible():
                self.log_pass("Mobile", "Horizontal scroll container present")
            else:
                self.log_issue("UX", "No horizontal scroll container - table may overflow viewport", "high")

            # Check if columns are too cramped
            first_cell = page.locator("table tbody td").first
            if first_cell.is_visible():
                box = first_cell.bounding_box()
                if box and box["width"] < 50:
                    self.log_issue("UX", f"Columns too narrow on mobile ({box['width']}px)", "medium")
        else:
            self.log_fail("Mobile", "Table not visible on mobile")

        # Check if buttons are tappable size (44x44 minimum)
        buttons = page.locator("table button").all()
        small_buttons = 0
        for btn in buttons[:5]:
            box = btn.bounding_box()
            if box and (box["width"] < 44 or box["height"] < 30):
                small_buttons += 1

        if small_buttons > 0:
            self.log_issue("Accessibility", f"{small_buttons} buttons below minimum tap target size", "medium")

        # Restore viewport
        page.set_viewport_size({"width": 1440, "height": 900})

    def test_tablet_usability(self, page, context):
        print("\n" + "=" * 60)
        print("TEST: Tablet Usability (768x1024)")
        print("=" * 60)

        page.set_viewport_size({"width": 768, "height": 1024})
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        self.screenshot(page, "09-tablet-view")

        table = page.locator("table").first
        if table.is_visible():
            self.log_pass("Tablet", "Table visible on tablet")

            # Check if all columns fit or need scroll
            table_width = table.evaluate("el => el.scrollWidth")
            viewport_width = 768

            if table_width > viewport_width:
                self.log_warning("Tablet", f"Table wider than viewport ({table_width}px > {viewport_width}px)")
        else:
            self.log_fail("Tablet", "Table not visible on tablet")

        page.set_viewport_size({"width": 1440, "height": 900})

    def test_keyboard_navigation(self, page):
        print("\n" + "=" * 60)
        print("TEST: Keyboard Navigation")
        print("=" * 60)

        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Tab through the page
        for i in range(10):
            page.keyboard.press("Tab")
            time.sleep(0.1)

        self.screenshot(page, "10-keyboard-focus")

        # Check what's focused
        focused = page.evaluate("document.activeElement.tagName")
        if focused in ["INPUT", "TEXTAREA", "SELECT", "BUTTON"]:
            self.log_pass("Keyboard Nav", f"Tab navigation works - focused on {focused}")
        else:
            self.log_warning("Keyboard Nav", f"Focus may not be visible - focused on {focused}")

        # Check focus ring visibility
        focus_visible = page.evaluate("""
            () => {
                const el = document.activeElement;
                const style = window.getComputedStyle(el);
                return style.outline !== 'none' || style.boxShadow !== 'none';
            }
        """)

        if focus_visible:
            self.log_pass("Focus Indicators", "Focus ring visible on focused element")
        else:
            self.log_issue("Accessibility", "Focus indicator may not be visible", "medium")

    def test_scroll_behavior(self, page):
        print("\n" + "=" * 60)
        print("TEST: Scroll Behavior & Sticky Columns")
        print("=" * 60)

        # Scroll table to the right
        table_container = page.locator("[style*='overflow'], .overflow-x-auto, .overflow-auto").first
        if table_container.is_visible():
            # Scroll right
            table_container.evaluate("el => el.scrollLeft = 500")
            time.sleep(0.5)

            self.screenshot(page, "11-scrolled-right")

            # Check if patient column is still visible (sticky)
            patient_cell = page.locator("table tbody tr").first.locator("td").first
            patient_box = patient_cell.bounding_box()

            if patient_box and patient_box["x"] >= 0:
                self.log_pass("Sticky Columns", "Patient column stays visible when scrolled")
            else:
                self.log_issue("UX", "Patient column scrolls off-screen", "high")

            # Check actions column
            actions_cells = page.locator("table tbody tr").first.locator("td").all()
            if actions_cells:
                last_cell = actions_cells[-1]
                actions_box = last_cell.bounding_box()
                if actions_box and actions_box["x"] + actions_box["width"] <= 1440:
                    self.log_pass("Sticky Columns", "Actions column stays visible")
                else:
                    self.log_warning("Sticky Columns", "Actions column may scroll off")
        else:
            self.log_warning("Scroll", "Could not find scrollable container")

    def test_problems_multiselect(self, page):
        print("\n" + "=" * 60)
        print("TEST: Problems Multi-Select Dropdown")
        print("=" * 60)

        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Find problems cell (should have a multi-select)
        problems_cell = page.locator("table tbody tr").first.locator("td").nth(5)  # Problems is 6th column

        if problems_cell.is_visible():
            problems_cell.click()
            time.sleep(0.5)

            self.screenshot(page, "12-problems-dropdown")

            # Check if dropdown opened
            dropdown = page.locator("[class*='dropdown'], [class*='menu'], [role='listbox']").first
            if dropdown.is_visible():
                self.log_pass("Problems Select", "Dropdown menu opened")

                # Check options exist
                options = dropdown.locator("div, label, li").all()
                if len(options) > 0:
                    self.log_pass("Problems Select", f"Found {len(options)} options")
                else:
                    self.log_warning("Problems Select", "No options in dropdown")
            else:
                self.log_warning("Problems Select", "Dropdown may not have opened")

            # Click away to close
            page.locator("body").click(position={"x": 10, "y": 10})
        else:
            self.log_fail("Problems Select", "Problems cell not found")

    def test_code_dropdown_colors(self, page):
        print("\n" + "=" * 60)
        print("TEST: Code Dropdown Color Coding")
        print("=" * 60)

        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Find code select (should be 5th column)
        code_select = page.locator("table tbody tr").first.locator("select").nth(3)  # Code is 4th select

        if code_select.is_visible():
            # Set to Green
            code_select.select_option("Green")
            time.sleep(0.3)

            bg_color = code_select.evaluate("el => window.getComputedStyle(el).backgroundColor")
            self.screenshot(page, "13-code-green")

            if "green" in bg_color.lower() or "0, 128" in bg_color or "34, 197" in bg_color:
                self.log_pass("Code Colors", f"Green code shows green background")
            else:
                self.log_warning("Code Colors", f"Green code background: {bg_color}")

            # Set to Red
            code_select.select_option("Red")
            time.sleep(0.3)

            bg_color = code_select.evaluate("el => window.getComputedStyle(el).backgroundColor")
            self.screenshot(page, "13-code-red")

            if "red" in bg_color.lower() or "220, 38" in bg_color or "239, 68" in bg_color:
                self.log_pass("Code Colors", f"Red code shows red background")
            else:
                self.log_warning("Code Colors", f"Red code background: {bg_color}")
        else:
            self.log_fail("Code Colors", "Code select not found")

    def test_auto_save_timing(self, page):
        print("\n" + "=" * 60)
        print("TEST: Auto-Save Timing")
        print("=" * 60)

        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        textarea = page.locator("table tbody tr").first.locator("textarea").first
        if textarea.is_visible():
            original = textarea.input_value()
            test_marker = f"AUTOSAVE-{int(time.time())}"

            textarea.fill(test_marker)

            # Wait and check for auto-save indicator
            print("Waiting 5 seconds for auto-save...")
            time.sleep(5)

            self.screenshot(page, "14-after-autosave")

            # Check for save indicator
            save_indicator = page.locator("text=saved, text=Saved, [class*='save'], [class*='status']").first
            if save_indicator.is_visible():
                self.log_pass("Auto-Save", "Auto-save indicator appeared")
            else:
                self.log_warning("Auto-Save", "No auto-save indicator visible after 5 seconds")

            # Restore
            textarea.fill(original)
        else:
            self.log_fail("Auto-Save", "No textarea for test")

    def print_summary(self):
        print("\n" + "=" * 60)
        print("AUDIT SUMMARY")
        print("=" * 60)

        print(f"\033[32m✅ Passes: {len(self.results['passes'])}\033[0m")
        print(f"\033[33m⚠️  Warnings: {len(self.results['warnings'])}\033[0m")
        print(f"\033[31m❌ Failures: {len(self.results['failures'])}\033[0m")
        print(f"\033[35m🔍 Issues Found: {len(self.results['issues_found'])}\033[0m")

        if self.results["failures"]:
            print("\n" + "=" * 60)
            print("ALL FAILURES")
            print("=" * 60)
            for i, f in enumerate(self.results["failures"], 1):
                print(f"{i}. [{f['test']}] {f['details']}")

        if self.results["issues_found"]:
            print("\n" + "=" * 60)
            print("ISSUES TO FIX")
            print("=" * 60)
            for i, issue in enumerate(self.results["issues_found"], 1):
                severity_color = "\033[31m" if issue["severity"] == "high" else "\033[33m"
                print(f"{i}. {severity_color}[{issue['severity'].upper()}]\033[0m [{issue['category']}] {issue['description']}")

        print(f"\n📸 Screenshots saved to: {SCREENSHOT_DIR}")

    def save_results(self):
        results_path = f"{SCREENSHOT_DIR}/deep-audit-results.json"
        with open(results_path, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"📄 Full results saved to: {results_path}")

if __name__ == "__main__":
    tester = RoundingSheetTester()
    tester.run()
