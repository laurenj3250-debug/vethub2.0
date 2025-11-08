// Form handling and interactions

function showFields() {
    const condition = document.getElementById('condition').value;
    const allFields = document.querySelectorAll('.fields-container');

    allFields.forEach(field => {
        field.classList.remove('active');
    });

    if (condition) {
        const selectedFields = document.getElementById('fields-' + condition);
        if (selectedFields) {
            selectedFields.classList.add('active');

            // Initialize collapsible sections for this condition
            initCollapsibleSections(selectedFields);

            // Update progress
            if (typeof Progress !== 'undefined') {
                Progress.update(condition);
            }
        }
    }

    // Hide report output when changing condition
    document.getElementById('reportOutput').classList.remove('active');
    document.getElementById('copyBtn').classList.remove('active');

    // Clear progress bar if no condition selected
    if (!condition && typeof Progress !== 'undefined') {
        Progress.update(null);
    }
}

function initCollapsibleSections(container) {
    // Skip if already initialized
    if (container.dataset.sectionsInitialized) return;

    container.dataset.sectionsInitialized = 'true';

    const sections = container.querySelectorAll('.form-section');
    sections.forEach(section => {
        const header = section.querySelector('.form-section-header');
        if (header && !header.dataset.listenerAdded) {
            header.addEventListener('click', () => {
                section.classList.toggle('collapsed');
            });
            header.dataset.listenerAdded = 'true';
        }
    });
}

function generateReport() {
    const condition = document.getElementById('condition').value;

    // Validate form before generating
    if (typeof Validator !== 'undefined' && !Validator.validateForm(condition)) {
        return;
    }

    if (!condition) {
        if (typeof Toast !== 'undefined') {
            Toast.error('Please select a condition first');
        } else {
            alert('Please select a condition first');
        }
        return;
    }

    let report = '';

    try {
        switch(condition) {
            case 'meningioma':
                report = generateMeningiomaReport();
                break;
            case 'glioma':
                report = generateGliomaReport();
                break;
            case 'ivdd':
                report = generateIVDDReport();
                break;
            case 'fce':
                report = generateFCEReport();
                break;
            case 'muo':
                report = generateMUOReport();
                break;
            case 'stroke':
                report = generateStrokeReport();
                break;
            case 'csm':
                report = generateCSMReport();
                break;
            case 'syrinx':
                report = generateSyrinxReport();
                break;
            case 'spinal-tumor':
                report = generateSpinalTumorReport();
                break;
        }

        document.getElementById('reportText').textContent = report;
        document.getElementById('reportOutput').classList.add('active');
        document.getElementById('copyBtn').classList.add('active');

        if (typeof Toast !== 'undefined') {
            Toast.success('Report generated successfully!');
        }

        // Scroll to report
        document.getElementById('reportOutput').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('Error generating report:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Error generating report. Please check all fields.');
        } else {
            alert('Error generating report. Please check all fields.');
        }
    }
}

function copyReport() {
    const reportText = document.getElementById('reportText').textContent;

    navigator.clipboard.writeText(reportText).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = '#218838';

        if (typeof Toast !== 'undefined') {
            Toast.success('Report copied to clipboard!');
        }

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#28a745';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);

        // Fallback: show modal with text to copy
        if (typeof Toast !== 'undefined') {
            Toast.error('Could not copy automatically. Please select and copy the text manually.');
        } else {
            alert('Failed to copy to clipboard. Please select and copy the text manually.');
        }
    });
}

function resetForm() {
    const condition = document.getElementById('condition').value;

    if (!condition) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('No form to reset');
        }
        return;
    }

    // Confirm reset
    if (!confirm('Are you sure you want to reset this form? All entered data will be lost.')) {
        return;
    }

    // Reset all fields in current condition form
    const container = document.getElementById(`fields-${condition}`);
    if (container) {
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                input.value = '';
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }

            // Clear validation states
            const formGroup = input.closest('.form-group');
            if (formGroup && typeof Validator !== 'undefined') {
                Validator.clearValidation(formGroup);
            }
        });
    }

    // Hide report
    document.getElementById('reportOutput').classList.remove('active');
    document.getElementById('copyBtn').classList.remove('active');

    // Clear autosave
    if (typeof AutoSave !== 'undefined') {
        AutoSave.clearData();
    }

    // Update progress
    if (typeof Progress !== 'undefined') {
        Progress.update(condition);
    }

    if (typeof Toast !== 'undefined') {
        Toast.info('Form reset successfully');
    }
}

// Setup form input listeners for progress tracking
function setupProgressTracking() {
    const form = document.querySelector('.content');
    if (!form) return;

    form.addEventListener('input', (e) => {
        if (e.target.matches('input, select, textarea')) {
            const condition = document.getElementById('condition')?.value;
            if (condition && typeof Progress !== 'undefined') {
                Progress.update(condition);
            }
        }
    });
}

// Setup validation listeners
function setupValidation() {
    const form = document.querySelector('.content');
    if (!form || typeof Validator === 'undefined') return;

    form.addEventListener('blur', (e) => {
        if (e.target.matches('input[required], select[required]')) {
            Validator.validateRequired(e.target);
        }
    }, true);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupProgressTracking();
    setupValidation();

    // Add keyboard shortcut hints to buttons
    const generateBtn = document.querySelector('.btn-generate');
    if (generateBtn) {
        generateBtn.innerHTML += ' <span class="keyboard-hint">(Ctrl+G)</span>';
    }

    const resetBtn = document.querySelector('.btn-reset');
    if (resetBtn) {
        resetBtn.innerHTML += ' <span class="keyboard-hint">(Ctrl+R)</span>';
    }

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.innerHTML += ' <span class="keyboard-hint">(Ctrl+K)</span>';
    }
});
