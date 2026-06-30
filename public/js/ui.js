export class UIController {
    constructor() {
        this.slouchValue = document.getElementById('slouch-value');
        this.slouchBar = document.getElementById('slouch-bar');
        this.tiltValue = document.getElementById('tilt-value');
        this.tiltBar = document.getElementById('tilt-bar');

        this.feedbackWindow = document.getElementById('feedback-window');
        this.feedbackText = document.getElementById('feedback-text');
        this.feedbackIcon = document.getElementById('feedback-icon'); // Parent of icon

        this.alertDebounceTimer = null;
        this.lastAlertState = false;

        // Initial state hidden
        this.hideAlert();
    }

    notify(message, type = 'info') {
        // Simple notification, strictly speaking the user might want a toast, 
        // but for now I'll use the feedback window for everything or a console log 
        // if it's just "Baseline calibrated".
        // app.js calls: ui.notify("Baseline calibrated", "success");
        console.log(`[${type}] ${message}`);

        // Show temporary feedback for success
        if (type === 'success') {
            const originalText = this.feedbackText.innerText;
            this.feedbackText.innerText = message;
            this.feedbackWindow.classList.remove('-translate-y-32'); // Show
            this.feedbackWindow.classList.add('bg-green-100', 'border-green-200');

            setTimeout(() => {
                this.feedbackWindow.classList.add('-translate-y-32'); // Hide
                setTimeout(() => {
                    this.feedbackText.innerText = originalText;
                    this.feedbackWindow.classList.remove('bg-green-100', 'border-green-200');
                }, 500);
            }, 2000);
        }
    }

    updateMetrics(status) {
        if (!status || !status.metrics) return;

        const { slouch, tilt } = status.metrics;

        // Update Slouch UI
        // slouch is 0-1+, mapped to percentage. 1.0 = 100% (Bad)
        const slouchPct = Math.min(100, Math.max(0, slouch * 100));
        if (this.slouchValue) this.slouchValue.innerText = slouch.toFixed(2);
        if (this.slouchBar) {
            this.slouchBar.style.width = `${slouchPct}%`;
            // Change color based on severity
            if (slouchPct > 100) this.slouchBar.classList.add('bg-red-500');
            else this.slouchBar.classList.remove('bg-red-500');
        }

        // Update Tilt UI
        if (this.tiltValue) this.tiltValue.innerText = `${tilt.toFixed(1)}°`;
        if (this.tiltBar) {
            // Map 15 degrees to 100% approximately
            const tiltPct = Math.min(100, Math.max(0, (tilt / 15) * 100));
            this.tiltBar.style.width = `${tiltPct}%`;
        }
    }

    handleAlert(isBadPosture, message) {
        if (isBadPosture) {
            if (!this.lastAlertState) {
                // Determine if we should show alert (debounce/delay can be in app.js or here)
                // app.js seems to call this every frame.
                // We should probably rely on app.js for timing or handle "persistent bad posture" logic here.
                // The instruction says "alert you if bad posture persists for more than 1.5 seconds".
                // logic for 1.5s usually is in app.js. 
                // Let's assume passed `isBadPosture` is the instantaneous state?
                // Actually app.js says: `status = detector.analyze(landmarks); ui.handleAlert(status.isBadPosture...)`
                // So app.js does strictly instantaneous.
                // I need to implement the 1.5s persistence logic somewhere. Best in UIController to avoid cluttering app.js 
                // or detector. OR app.js should have it. 
                // Since I can edit app.js, I will put the debounce logic in app.js to keep UI dumb, 
                // OR put it here.
                // Let's keep UI dumb: "Show Alert" means SHOW IT NOW.
                // So I will assume app.js handles the timer.
                // Wait, I am rewriting app.js anyway. I'll put the timer logic in app.js.

                this.showAlert(message);
                this.lastAlertState = true;
            } else {
                // Update text if needed
                if (this.feedbackText.innerText !== message) {
                    this.feedbackText.innerText = message;
                }
            }
        } else {
            if (this.lastAlertState) {
                this.hideAlert();
                this.lastAlertState = false;
            }
        }
    }

    showAlert(message) {
        if (this.feedbackText) this.feedbackText.innerText = message || "Bad Posture Detected";
        if (this.feedbackWindow) {
            this.feedbackWindow.classList.remove('-translate-y-32');
            this.feedbackWindow.classList.add('bg-red-50', 'border-red-100');
        }
    }

    hideAlert() {
        if (this.feedbackWindow) {
            this.feedbackWindow.classList.add('-translate-y-32');
            this.feedbackWindow.classList.remove('bg-red-50', 'border-red-100');
        }
    }
}
