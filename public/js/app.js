/**
 * 主应用逻辑
 * 修改：
 *   1. 区分驼背/歪头两种语音
 *   2. 连续正确坐姿3分钟播放表扬语音
 *   3. 修复警告语音冷却逻辑bug
 *   4. 移除界面上的保持时间显示
 */

let detector;
let goodPostureStartTime = null;

// 语音冷却（同一种警告15秒内不重复播放）
const WARNING_AUDIO_COOLDOWN = 15000; // 15秒

// 表扬触发条件：连续正确坐姿3分钟
const GOOD_POSTURE_TARGET = 180000; // 3分钟

// 分别记录每种警告的上次播放时间
const lastWarningTime = {
    'audio-warning-slouch': 0,
    'audio-warning-tilt': 0
};

// 表扬语音冷却（播放后至少间隔3分钟才能再次触发）
let lastPraiseTime = 0;
const PRAISE_COOLDOWN = 180000; // 3分钟

async function initApp() {
    const video = document.getElementById('video');
    const statusEl = document.getElementById('status');

    try {
        statusEl.textContent = '正在初始化...';
        
        detector = new PostureDetector(video, handleDetectionResult);
        await detector.init();
        
        statusEl.textContent = '点击"开始监测"启动摄像头';
        
        // 绑定按钮事件
        const startBtn = document.getElementById('start-btn');
        startBtn.addEventListener('click', async () => {
            try {
                await detector.start();
                UI.startMonitoring();
                statusEl.textContent = '正在监测中...';
                startBtn.disabled = true;
                
                // 尝试预加载音频（需要用户交互后才能自动播放）
                preloadAudio();
            } catch (e) {
                statusEl.textContent = '摄像头启动失败: ' + e.message;
            }
        });
    } catch (e) {
        statusEl.textContent = '初始化失败: ' + e.message;
    }
}

/**
 * 预加载音频（静音播放触发浏览器允许后续自动播放）
 */
function preloadAudio() {
    const audioIds = ['audio-warning-slouch', 'audio-warning-tilt', 'audio-praise'];
    audioIds.forEach(id => {
        const audio = document.getElementById(id);
        if (audio) {
            audio.volume = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1;
                }).catch(() => {
                    // 浏览器可能拒绝自动播放，不影响后续用户交互后播放
                });
            }
        }
    });
}

function handleDetectionResult(result) {
    const now = Date.now();
    
    if (result.isBadPosture) {
        // 显示警告
        UI.showWarning(result.message, result.type);
        
        // 重置良好姿势计时器
        goodPostureStartTime = null;
        
        // 播放对应的警告语音（冷却逻辑在 playWarningAudio 内部处理）
        playWarningAudio(result.type);
    } else {
        UI.hideWarning();
        
        // 开始/继续记录良好姿势时间（只在后台，不显示在界面上）
        if (!goodPostureStartTime) {
            goodPostureStartTime = now;
        }
        
        // 检查是否连续保持良好姿势达到3分钟
        const goodDuration = now - goodPostureStartTime;
        if (goodDuration >= GOOD_POSTURE_TARGET) {
            // 检查表扬语音冷却
            if (now - lastPraiseTime >= PRAISE_COOLDOWN) {
                playPraiseAudio();
                lastPraiseTime = now;
            }
            // 重置计时器，可以再次触发下一轮表扬
            goodPostureStartTime = now;
        }
    }
    
    // 更新指标显示
    if (result.metrics) {
        UI.updateMetrics(result.metrics);
    }
}

/**
 * 播放警告语音（根据姿势类型选择对应音频）
 * 冷却逻辑：同一种警告15秒内不重复播放，切换类型时立即播放
 */
function playWarningAudio(type) {
    const now = Date.now();
    
    // 根据类型映射到对应的音频元素ID
    const audioMap = {
        'slouch': 'audio-warning-slouch',
        'tilt': 'audio-warning-tilt'
    };
    
    const audioId = audioMap[type];
    if (!audioId) return;
    
    // 检查该类型是否在冷却期内
    if (now - lastWarningTime[audioId] < WARNING_AUDIO_COOLDOWN) {
        return; // 冷却中，跳过
    }
    
    const audio = document.getElementById(audioId);
    if (!audio) return;
    
    // 播放前先重置，确保能从头播放
    audio.currentTime = 0;
    audio.play().then(() => {
        // 播放成功后才记录冷却时间（修复之前的bug）
        lastWarningTime[audioId] = Date.now();
    }).catch(err => {
        console.log('警告语音播放失败:', err.message);
    });
}

/**
 * 播放表扬语音
 */
function playPraiseAudio() {
    const audio = document.getElementById('audio-praise');
    if (!audio) return;
    
    audio.currentTime = 0;
    audio.play().catch(err => {
        console.log('表扬语音播放失败:', err.message);
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initApp);
