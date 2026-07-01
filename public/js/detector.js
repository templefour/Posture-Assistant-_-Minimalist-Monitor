export class PostureDetector {
    constructor() {
        this.baseline = null;
        this.thresholds = {
            slouch: 0.05, // Normalized coordinates (0-1)
            tilt: 15 * (Math.PI / 180) // 15 degrees in radians
        };
    }
    calibrate(landmarks) {
        this.shouldCalibrate = true;
    }
    analyze(landmarks) {
        if (!landmarks) return { isBadPosture: false, message: "", type: "" };

        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (!nose || !leftEye || !rightEye) return { isBadPosture: false, message: "", type: "" };

        const currentY = nose.y;
        const dx = rightEye.x - leftEye.x;
        const dy = rightEye.y - leftEye.y;
        const currentTilt = Math.atan2(dy, dx);

        if (this.shouldCalibrate || !this.baseline) {
            this.baseline = {
                y: currentY,
                tilt: currentTilt
            };
            this.shouldCalibrate = false;
            return { isBadPosture: false, message: "Baseline set", type: "", metrics: { slouch: 0, tilt: 0 } };
        }

        const slouchDelta = currentY - this.baseline.y;
        const tiltDelta = Math.abs(currentTilt - this.baseline.tilt);

        // ====== 判断具体是哪种不良姿势 ======
        let isBadPosture = false;
        let message = "";
        let type = "";  // 新增：'slouch' 或 'tilt'，用于区分语音

        if (slouchDelta > this.thresholds.slouch) {
            isBadPosture = true;
            message = "You are slouching!";
            type = "slouch";
        } else if (tiltDelta > this.thresholds.tilt) {
            isBadPosture = true;
            message = "Head tilted too much!";
            type = "tilt";
        }

        const normalizedSlouch = Math.max(0, slouchDelta / this.thresholds.slouch);
        const tiltDegrees = tiltDelta * (180 / Math.PI);

        return {
            isBadPosture,
            message,
            type,  // 返回姿势类型
            metrics: {
                slouch: normalizedSlouch,
                tilt: tiltDegrees,
                rawSlouch: slouchDelta,
                rawTilt: tiltDelta
            }
        };
    }
}
