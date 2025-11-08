// Toast notification system
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }
};

// Auto-save functionality
const AutoSave = {
    debounceTimer: null,
    indicator: null,
    storageKey: 'vethub-autosave',

    init() {
        if (!this.indicator) {
            this.indicator = document.createElement('div');
            this.indicator.className = 'autosave-indicator';
            this.indicator.innerHTML = '<span class="status-text">Saved</span>';
            document.body.appendChild(this.indicator);
        }

        // Load saved data on init
        this.loadData();

        // Setup auto-save on form changes
        this.setupListeners();
    },

    setupListeners() {
        const form = document.querySelector('.content');
        if (!form) return;

        form.addEventListener('input', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.scheduleAutoSave();
            }
        });
    },

    scheduleAutoSave() {
        clearTimeout(this.debounceTimer);

        this.showIndicator('saving');

        this.debounceTimer = setTimeout(() => {
            this.saveData();
            this.showIndicator('saved');

            setTimeout(() => {
                this.hideIndicator();
            }, 2000);
        }, 1000);
    },

    saveData() {
        const condition = document.getElementById('condition')?.value;
        if (!condition) return;

        const data = {
            condition: condition,
            timestamp: new Date().toISOString(),
            fields: {}
        };

        // Save all input values
        const inputs = document.querySelectorAll(`#fields-${condition} input, #fields-${condition} select, #fields-${condition} textarea`);
        inputs.forEach(input => {
            if (input.id) {
                data.fields[input.id] = input.value;
            }
        });

        localStorage.setItem(this.storageKey, JSON.stringify(data));
    },

    loadData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const data = JSON.parse(saved);

            // Check if data is recent (within 7 days)
            const savedDate = new Date(data.timestamp);
            const now = new Date();
            const daysDiff = (now - savedDate) / (1000 * 60 * 60 * 24);

            if (daysDiff > 7) {
                localStorage.removeItem(this.storageKey);
                return;
            }

            // Restore condition selection
            const conditionSelect = document.getElementById('condition');
            if (conditionSelect && data.condition) {
                conditionSelect.value = data.condition;

                // Trigger the showFields function to display the form
                if (typeof showFields === 'function') {
                    showFields();
                }

                // Wait for form to be visible, then restore field values
                setTimeout(() => {
                    Object.keys(data.fields).forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field) {
                            field.value = data.fields[fieldId];
                        }
                    });

                    Toast.info('Previous work restored', 2000);
                }, 100);
            }
        } catch (error) {
            console.error('Error loading autosave data:', error);
        }
    },

    clearData() {
        localStorage.removeItem(this.storageKey);
        Toast.info('Auto-save data cleared');
    },

    showIndicator(status) {
        if (!this.indicator) return;

        this.indicator.className = 'autosave-indicator active ' + status;
        this.indicator.querySelector('.status-text').textContent =
            status === 'saving' ? 'Saving...' : 'Saved';
    },

    hideIndicator() {
        if (!this.indicator) return;
        this.indicator.classList.remove('active');
    }
};

// Keyboard shortcuts
const KeyboardShortcuts = {
    init() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + G: Generate report
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                const generateBtn = document.querySelector('.btn-generate');
                if (generateBtn && !generateBtn.disabled) {
                    generateBtn.click();
                }
            }

            // Ctrl/Cmd + R: Reset form
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                const resetBtn = document.querySelector('.btn-reset');
                if (resetBtn) {
                    resetBtn.click();
                }
            }

            // Ctrl/Cmd + K: Copy report
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const copyBtn = document.getElementById('copyBtn');
                if (copyBtn && copyBtn.classList.contains('active')) {
                    copyBtn.click();
                }
            }

            // Escape: Clear any active toasts
            if (e.key === 'Escape') {
                const toasts = document.querySelectorAll('.toast');
                toasts.forEach(toast => toast.remove());
            }
        });
    }
};

// Form validation
const Validator = {
    validateRequired(input) {
        const value = input.value.trim();
        const formGroup = input.closest('.form-group');

        if (!formGroup) return true;

        if (!value) {
            this.showError(formGroup, 'This field is required');
            return false;
        } else {
            this.showSuccess(formGroup);
            return true;
        }
    },

    validatePattern(input, pattern, message) {
        const value = input.value.trim();
        const formGroup = input.closest('.form-group');

        if (!formGroup || !value) return true;

        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
            this.showError(formGroup, message);
            return false;
        } else {
            this.showSuccess(formGroup);
            return true;
        }
    },

    showError(formGroup, message) {
        formGroup.classList.remove('success');
        formGroup.classList.add('error');

        let errorMsg = formGroup.querySelector('.error-message');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            formGroup.appendChild(errorMsg);
        }
        errorMsg.textContent = message;
    },

    showSuccess(formGroup) {
        formGroup.classList.remove('error');
        formGroup.classList.add('success');

        const errorMsg = formGroup.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    },

    clearValidation(formGroup) {
        formGroup.classList.remove('error', 'success');
        const errorMsg = formGroup.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    },

    validateForm(condition) {
        if (!condition) {
            Toast.error('Please select a condition first');
            return false;
        }

        const container = document.getElementById(`fields-${condition}`);
        if (!container) return true;

        let isValid = true;
        const requiredInputs = container.querySelectorAll('input[required], select[required]');

        requiredInputs.forEach(input => {
            if (!this.validateRequired(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            Toast.error('Please fill in all required fields');
        }

        return isValid;
    }
};

// Progress tracking
const Progress = {
    bar: null,

    init() {
        if (!this.bar) {
            const container = document.querySelector('.content');
            if (!container) return;

            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-bar';
            progressContainer.innerHTML = '<div class="progress-bar-fill"></div>';

            container.insertBefore(progressContainer, container.firstChild);
            this.bar = progressContainer.querySelector('.progress-bar-fill');
        }
    },

    update(condition) {
        if (!this.bar) return;

        const container = document.getElementById(`fields-${condition}`);
        if (!container) {
            this.bar.style.width = '0%';
            return;
        }

        const inputs = container.querySelectorAll('input, select, textarea');
        let filled = 0;
        let total = 0;

        inputs.forEach(input => {
            total++;
            if (input.value && input.value.trim() !== '') {
                filled++;
            }
        });

        const percentage = total > 0 ? (filled / total) * 100 : 0;
        this.bar.style.width = percentage + '%';
    }
};

// Initialize utilities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    AutoSave.init();
    KeyboardShortcuts.init();
    Progress.init();
});
