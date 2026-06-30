export class PostureDetector {
    constructor() {
        this.baseline = null;
        this.thresholds = {
            slouch: 0.05, // Normalized coordinates (0-1)
            tilt: 15 * (Math.PI / 180) // 15 degrees in radians
        };
    }

    calibrate(landmarks) {
        // If landmarks are passed directly to calibrate, use them. 
        // Otherwise, calibration might happen during the next analysis frame or rely on saved state.
        // But app.js calls detector.calibrate() without args usually? 
        // Let's check app.js: "detector.calibrate();" inside click handler.
        // This implies detector stores the *latest* landmarks internally or expects to capture next.
        // Actually, without passing landmarks, detector needs to know the current state.
        // So analyze() should probably store the last landmarks.
        this.shouldCalibrate = true;
    }

    analyze(landmarks) {
        if (!landmarks) return { isBadPosture: false, message: "" };

        // Key landmarks for FaceMesh
        // 1: Nose tip
        // 33: Left Eye
        // 263: Right Eye
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        if (!nose || !leftEye || !rightEye) return { isBadPosture: false, message: "" };

        // Calculate metrics
        const currentY = nose.y; // Y increases downwards
        const dx = rightEye.x - leftEye.x;
        const dy = rightEye.y - leftEye.y;
        const currentTilt = Math.atan2(dy, dx); // Radians

        // Handle calibration signal
        if (this.shouldCalibrate || !this.baseline) {
            this.baseline = {
                y: currentY,
                tilt: currentTilt
            };
            this.shouldCalibrate = false;
            return { isBadPosture: false, message: "Baseline set", metrics: { slouch: 0, tilt: 0 } };
        }

        // Compare against baseline
        const slouchDelta = currentY - this.baseline.y; // Positive means went down (slouching)
        const tiltDelta = Math.abs(currentTilt - this.baseline.tilt);

        // Determine status
        let isBadPosture = false;
        let message = "";

        if (slouchDelta > this.thresholds.slouch) {
            isBadPosture = true;
            message = "You are slouching!";
        } else if (tiltDelta > this.thresholds.tilt) {
            isBadPosture = true;
            message = "Head tilted too much!";
        }

        // Normalize metrics for UI (0-100 or similar)
        // Slouch: 0 means good (or higher). 1 means threshold hit.
        const normalizedSlouch = Math.max(0, slouchDelta / this.thresholds.slouch);
        
        // Tilt: Degrees
        const tiltDegrees = tiltDelta * (180 / Math.PI);

        return {
            isBadPosture,
            message,
            metrics: {
                slouch: normalizedSlouch, // 0 to 1+
                tilt: tiltDegrees, // Degrees
                rawSlouch: slouchDelta,
                rawTilt: tiltDelta
            }
        };
    }
}
