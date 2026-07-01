import { PostureDetector } from './detector.js';
import { UIController } from './ui.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('camera-loading');
const calibrateBtn = document.getElementById('calibrate-btn');

let faceMesh;
let detector;
let ui;
let camera;

// Persistence logic
let badPostureStartTime = null;
let lastLogTime = 0;
const PERSISTENCE_THRESHOLD = 1500; // 1.5s
const LOG_COOLDOWN = 5000; // Log at most every 5s to avoid spamming server

// ====== 语音提示相关 ======
// 警告语音冷却时间（避免频繁播放），单位毫秒
const WARNING_AUDIO_COOLDOWN = 15000; // 15秒内不重复播放警告
let lastWarningAudioTime = 0;

// 连续正确坐姿计时
const GOOD_POSTURE_TARGET = 3 * 60 * 1000; // 3分钟 = 180000毫秒
let goodPostureStartTime = null;       // 连续正确坐姿的开始时间
let praiseTriggered = false;           // 本轮3分钟表扬是否已触发（避免重复）

async function init() {
    if (window.lucide) window.lucide.createIcons();
    ui = new UIController();
    detector = new PostureDetector();

    // Ensure FaceMesh is loaded
    if (typeof FaceMesh === 'undefined') {
        console.error("FaceMesh not found. Waiting...");
    }

    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onResults);

    // Initialize Camera
    camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 1280,
        height: 720
    });
    camera.start().then(() => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }
    });

    calibrateBtn.addEventListener('click', () => {
        detector.calibrate();
        ui.notify("Baseline calibrated", "success");
        badPostureStartTime = null;
        goodPostureStartTime = null;  // 校准时重置正确坐姿计时
        praiseTriggered = false;
        ui.hideGoodPostureTimer();
    });
}

function onResults(results) {
    // Resize canvas to match video
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw mesh
        if (window.drawConnectors && window.FACEMESH_TESSELATION) {
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
        }

        // Analyze Posture
        const status = detector.analyze(landmarks);
        const now = Date.now();

        // Update Metrics UI immediately
        ui.updateMetrics(status);

        // ====== 姿势判断与语音提示逻辑 ======
        if (status.isBadPosture) {
            // --- 不良姿势 ---
            if (!badPostureStartTime) {
                badPostureStartTime = now;
            } else if (now - badPostureStartTime > PERSISTENCE_THRESHOLD) {
                // 不良姿势持续超过1.5秒 → 触发视觉警告
                ui.handleAlert(true, status.message);

                // 播放警告语音（带冷却，避免频繁播放）
                if (now - lastWarningAudioTime > WARNING_AUDIO_COOLDOWN) {
                    lastWarningAudioTime = now;
                    ui.playAudio('warning');
                }

                // Log to backend
                logPostureIfNeeded(status.message);
            }

            // 不良姿势 → 重置正确坐姿计时
            goodPostureStartTime = null;
            praiseTriggered = false;
            ui.hideGoodPostureTimer();

        } else {
            // --- 正确姿势 ---
            badPostureStartTime = null;
            ui.handleAlert(false);

            // 开始/继续正确坐姿计时
            if (!goodPostureStartTime) {
                goodPostureStartTime = now;
            }

            const goodDuration = now - goodPostureStartTime;

            // 显示正确坐姿进度
            ui.showGoodPostureTimer(goodDuration, GOOD_POSTURE_TARGET);

            // 达到3分钟且本轮未表扬过 → 播放表扬语音
            if (goodDuration >= GOOD_POSTURE_TARGET && !praiseTriggered) {
                praiseTriggered = true;
                ui.playAudio('praise');
                ui.notify("🎉 太棒了！正确坐姿保持3分钟！", "success");
                // 表扬后重置计时，可以再次触发下一轮3分钟表扬
                goodPostureStartTime = now;
            }
        }
    }

    canvasCtx.restore();
}

function logPostureIfNeeded(message) {
    const now = Date.now();
    if (now - lastLogTime > LOG_COOLDOWN) {
        lastLogTime = now;
        // Fire and forget
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: now,
                message: message,
                type: 'bad_posture'
            })
        }).catch(err => console.error("Failed to log:", err));
    }
}

// Start
window.addEventListener('DOMContentLoaded', init);
