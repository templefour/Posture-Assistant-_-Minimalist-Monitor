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

let badPostureStartTime = null;
let lastLogTime = 0;
const PERSISTENCE_THRESHOLD = 1500;
const LOG_COOLDOWN = 5000;

const WARNING_AUDIO_COOLDOWN = 15000;
let lastWarningAudioTime = 0;

const GOOD_POSTURE_TARGET = 3 * 60 * 1000;
let goodPostureStartTime = null;
let praiseTriggered = false;

async function init() {
    if (window.lucide) window.lucide.createIcons();
    ui = new UIController();
    detector = new PostureDetector();

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

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 1280,
        height: 720
    });

    // 启动摄像头
    try {
        await camera.start();
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }
    } catch (err) {
        console.error('Camera start error:', err);
        // 显示错误信息
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<p class="text-sm font-light text-red-400">Camera access denied or failed. Please allow camera permission and refresh.</p>`;
        }
    }

    calibrateBtn.addEventListener('click', () => {
        detector.calibrate();
        ui.notify("Baseline calibrated", "success");
        badPostureStartTime = null;
        goodPostureStartTime = null;
        praiseTriggered = false;
    });
}

function onResults(results) {
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        if (window.drawConnectors && window.FACEMESH_TESSELATION) {
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
                color: '#C0C0C070',
                lineWidth: 1
            });
        }

        const status = detector.analyze(landmarks);
        const now = Date.now();

        ui.updateMetrics(status);

        if (status.isBadPosture) {
            if (!badPostureStartTime) {
                badPostureStartTime = now;
            } else if (now - badPostureStartTime > PERSISTENCE_THRESHOLD) {
                ui.handleAlert(true, status.message);
                if (now - lastWarningAudioTime > WARNING_AUDIO_COOLDOWN) {
                    lastWarningAudioTime = now;
                    // 根据错误类型选择语音
                    let audioType = 'slouch'; // 默认
                    if (status.message && status.message.toLowerCase().includes('tilt')) {
                        audioType = 'tilt';
                    } else if (status.message && status.message.toLowerCase().includes('slouch')) {
                        audioType = 'slouch';
                    }
                    ui.playAudio(audioType);
                }
                logPostureIfNeeded(status.message);
            }
            goodPostureStartTime = null;
            praiseTriggered = false;
        } else {
            badPostureStartTime = null;
            ui.handleAlert(false);

            if (!goodPostureStartTime) {
                goodPostureStartTime = now;
            }
            const goodDuration = now - goodPostureStartTime;

            if (goodDuration >= GOOD_POSTURE_TARGET && !praiseTriggered) {
                praiseTriggered = true;
                ui.playAudio('praise');
                ui.notify("太棒了！正确坐姿保持3分钟！", "success");
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

window.addEventListener('DOMContentLoaded', init);