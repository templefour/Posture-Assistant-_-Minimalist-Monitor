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

async function init() {
    if (window.lucide) window.lucide.createIcons();

    ui = new UIController();
    detector = new PostureDetector();

    // Ensure FaceMesh is loaded
    if (typeof FaceMesh === 'undefined') {
        console.error("FaceMesh not found. Waiting...");
        // Fallback or retry logic could go here
    }

    faceMesh = new FaceMesh({
        locateFile: (file) => {
            // Use CDN for assets since we don't have them locally
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
    // Assuming Camera is global from camera_utils.js
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
        // Trigger calibration in detector
        detector.calibrate();
        ui.notify("Baseline calibrated", "success");
        badPostureStartTime = null; // Reset
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

        // Update Metrics UI immediately
        ui.updateMetrics(status);

        // Handle persistence logic for Alert
        const now = Date.now();
        if (status.isBadPosture) {
            if (!badPostureStartTime) {
                badPostureStartTime = now;
            } else if (now - badPostureStartTime > PERSISTENCE_THRESHOLD) {
                // Bad posture persisted
                ui.handleAlert(true, status.message);

                // Log to backend
                logPostureIfNeeded(status.message);
            }
        } else {
            badPostureStartTime = null;
            ui.handleAlert(false);
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
