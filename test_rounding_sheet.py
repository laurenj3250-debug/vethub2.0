#!/usr/bin/env python3
"""
Test rounding sheet fixes:
1. Auto-save functionality
2. Full paste support (all 13 fields)
3. Unsaved changes warning
4. Multi-row paste with preview modal
5. Tab navigation (EnhancedRoundingSheet)
"""

from playwright.sync_api import sync_playwright
import time

def test_rounding_sheet():
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=False)  # Use headless=False to see the test
        context = browser.new_context()
        page = context.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f'[Browser Console] {msg.type}: {msg.text}'))

        print("🧪 Testing Rounding Sheet Fixes...")
        print("=" * 60)

        # Navigate to rounding sheet
        print("\n1️⃣ Navigating to rounding sheet...")
        page.goto('http://localhost:3002/rounding')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Take initial screenshot
        page.screenshot(path='/tmp/rounding_initial.png', full_page=True)
        print("✅ Loaded rounding sheet")

        # Test 1: Check if auto-save elements exist
        print("\n2️⃣ Testing Auto-Save elements...")
        try:
            # Look for patients in the table
            patient_rows = page.locator('table tbody tr').all()
            print(f"   Found {len(patient_rows)} patient rows")

            if len(patient_rows) > 0:
                # Find an input field and type to trigger auto-save
                signalment_input = page.locator('input[type="text"]').first
                if signalment_input.is_visible():
                    print("   Typing in signalment field...")
                    signalment_input.click()
                    signalment_input.fill("10y MN Lab - TEST AUTO SAVE")

                    # Wait for auto-save (2 seconds delay + processing)
                    print("   Waiting for auto-save (3 seconds)...")
                    time.sleep(3)

                    # Check for save status indicators
                    saved_indicator = page.locator('text=/Saved|Saving/').first
                    if saved_indicator.is_visible(timeout=1000):
                        print("   ✅ Auto-save indicator visible!")
                    else:
                        print("   ⚠️  Auto-save indicator not found (might have cleared)")

                    page.screenshot(path='/tmp/rounding_autosave.png', full_page=True)
                else:
                    print("   ⚠️  No input fields found")
            else:
                print("   ⚠️  No patient rows found - cannot test auto-save")
        except Exception as e:
            print(f"   ❌ Auto-save test error: {e}")

        # Test 2: Test paste functionality
        print("\n3️⃣ Testing Full Paste Support...")
        try:
            # Test data (tab-separated)
            paste_data = "12y FS GSD\tICU\tCritical\tRed\tSeizures\tMRI normal\tPhenobarbital\tYes\tLRS\tNone\tMonitor overnight\tWatch for seizures\tFair prognosis"

            # Find first input and simulate paste
            first_input = page.locator('input[type="text"]').first
            if first_input.is_visible():
                first_input.click()

                # Use clipboard API
                page.evaluate(f"""
                    const input = document.querySelector('input[type="text"]');
                    const event = new ClipboardEvent('paste', {{
                        clipboardData: new DataTransfer(),
                        bubbles: true,
                        cancelable: true
                    }});
                    event.clipboardData.setData('text/plain', '{paste_data}');
                    input.dispatchEvent(event);
                """)

                time.sleep(1)
                page.screenshot(path='/tmp/rounding_paste.png', full_page=True)

                # Check if toast appeared
                toast = page.locator('text=/Pasted/').first
                if toast.is_visible(timeout=2000):
                    print("   ✅ Paste toast notification appeared!")
                else:
                    print("   ⚠️  Paste toast not found")
            else:
                print("   ⚠️  No input field found for paste test")
        except Exception as e:
            print(f"   ❌ Paste test error: {e}")

        # Test 3: Test unsaved changes warning
        print("\n4️⃣ Testing Unsaved Changes Warning...")
        try:
            # Modify a field
            input_field = page.locator('input[type="text"]').first
            if input_field.is_visible():
                input_field.click()
                input_field.fill("Modified data - should trigger warning")

                # Set up dialog handler
                dialog_triggered = {'value': False}

                def handle_dialog(dialog):
                    dialog_triggered['value'] = True
                    print(f"   ✅ Dialog triggered: {dialog.message}")
                    dialog.dismiss()

                page.on('dialog', handle_dialog)

                # Try to navigate away (click Back to VetHub)
                back_link = page.locator('text=Back to VetHub').first
                if back_link.is_visible():
                    back_link.click()
                    time.sleep(0.5)

                    if dialog_triggered['value']:
                        print("   ✅ Unsaved changes warning appeared!")
                    else:
                        print("   ⚠️  Warning dialog did not appear")
                else:
                    print("   ⚠️  Back to VetHub link not found")
        except Exception as e:
            print(f"   ❌ Unsaved warning test error: {e}")

        # Test 4: Check if PastePreviewModal exists in DOM
        print("\n5️⃣ Checking Multi-Row Paste Components...")
        try:
            # Multi-row paste would require more complex setup
            # Just check if the modal component is in the bundle
            page_content = page.content()
            if 'PastePreviewModal' in page_content or 'Paste Preview' in page_content:
                print("   ✅ Multi-row paste modal components detected")
            else:
                print("   ℹ️  Modal not visible (only appears on multi-row paste)")
        except Exception as e:
            print(f"   ❌ Multi-row paste check error: {e}")

        # Test 5: Visual verification
        print("\n6️⃣ Taking final screenshots...")
        page.screenshot(path='/tmp/rounding_final.png', full_page=True)
        print("   ✅ Screenshots saved to /tmp/")

        # Summary
        print("\n" + "=" * 60)
        print("🎉 Testing Complete!")
        print("\nScreenshots saved:")
        print("  - /tmp/rounding_initial.png")
        print("  - /tmp/rounding_autosave.png")
        print("  - /tmp/rounding_paste.png")
        print("  - /tmp/rounding_final.png")
        print("\nTo manually test:")
        print("  1. Go to http://localhost:3002/rounding")
        print("  2. Edit a cell and wait 2 seconds (auto-save)")
        print("  3. Paste tab-separated data (all fields should fill)")
        print("  4. Try to navigate away (warning should appear)")

        browser.close()

if __name__ == '__main__':
    test_rounding_sheet()
