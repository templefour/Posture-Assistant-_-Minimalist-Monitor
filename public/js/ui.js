export class UIController {
    constructor() {
        this.slouchValue = document.getElementById('slouch-value');
        this.slouchBar = document.getElementById('slouch-bar');
        this.tiltValue = document.getElementById('tilt-value');
        this.tiltBar = document.getElementById('tilt-bar');
        this.feedbackWindow = document.getElementById('feedback-window');
        this.feedbackText = document.getElementById('feedback-text');
        this.feedbackIcon = document.getElementById('feedback-icon');

        // 语音相关元素
        this.audioWarning = document.getElementById('audio-warning');
        this.audioPraise = document.getElementById('audio-praise');
        this.audioToggleBtn = document.getElementById('audio-toggle-btn');
        this.audioIcon = document.getElementById('audio-icon');
        this.audioToggleText = document.getElementById('audio-toggle-text');
        this.audioEnabled = true;  // 默认开启语音

        // 正确坐姿计时器 UI
        this.goodPostureTimer = document.getElementById('good-posture-timer');
        this.goodPostureBar = document.getElementById('good-posture-bar');
        this.goodPostureTime = document.getElementById('good-posture-time');

        this.alertDebounceTimer = null;
        this.lastAlertState = false;

        // 初始化语音开关按钮
        this._initAudioToggle();

        // 初始状态隐藏警告
        this.hideAlert();
    }

    // ====== 语音开关 ======
    _initAudioToggle() {
        if (this.audioToggleBtn) {
            this.audioToggleBtn.addEventListener('click', () => {
                this.audioEnabled = !this.audioEnabled;
                this._updateAudioToggleUI();
            });
        }
    }

    _updateAudioToggleUI() {
        if (this.audioEnabled) {
            // 开启状态
            if (this.audioToggleBtn) {
                this.audioToggleBtn.classList.remove('bg-gray-100', 'text-gray-500', 'border-gray-200');
                this.audioToggleBtn.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-100');
            }
            if (this.audioToggleText) this.audioToggleText.textContent = '语音开';
            if (this.audioIcon) {
                this.audioIcon.setAttribute('data-lucide', 'volume-2');
            }
        } else {
            // 关闭状态
            if (this.audioToggleBtn) {
                this.audioToggleBtn.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-100');
                this.audioToggleBtn.classList.add('bg-gray-100', 'text-gray-500', 'border-gray-200');
            }
            if (this.audioToggleText) this.audioToggleText.textContent = '语音关';
            if (this.audioIcon) {
                this.audioIcon.setAttribute('data-lucide', 'volume-x');
            }
        }
        // 重新渲染 lucide 图标
        if (window.lucide) window.lucide.createIcons();
    }

    // ====== 播放语音 ======
    playAudio(type) {
        if (!this.audioEnabled) return;

        let audioEl = null;
        if (type === 'warning') {
            audioEl = this.audioWarning;
        } else if (type === 'praise') {
            audioEl = this.audioPraise;
        }

        if (audioEl) {
            // 回到开头播放
            audioEl.currentTime = 0;
            audioEl.play().catch(err => {
                console.warn(`语音播放失败 (${type}):`, err);
                // 浏览器可能要求用户交互后才能播放音频，忽略即可
            });
        }
    }

    // ====== 正确坐姿计时器 UI ======
    showGoodPostureTimer(elapsed, target) {
        if (!this.goodPostureTimer) return;

        // 显示计时器面板
        this.goodPostureTimer.classList.remove('hidden');

        // 更新进度条
        const progress = Math.min(100, (elapsed / target) * 100);
        if (this.goodPostureBar) {
            this.goodPostureBar.style.width = `${progress}%`;
        }

        // 更新时间文字
        if (this.goodPostureTime) {
            const elapsedSec = Math.floor(elapsed / 1000);
            const targetSec = Math.floor(target / 1000);
            const eMin = Math.floor(elapsedSec / 60);
            const eSec = elapsedSec % 60;
            const tMin = Math.floor(targetSec / 60);
            const tSec = targetSec % 60;
            this.goodPostureTime.textContent =
                `${eMin}:${String(eSec).padStart(2, '0')} / ${tMin}:${String(tSec).padStart(2, '0')}`;
        }
    }

    hideGoodPostureTimer() {
        if (!this.goodPostureTimer) return;
        this.goodPostureTimer.classList.add('hidden');
        if (this.goodPostureBar) this.goodPostureBar.style.width = '0%';
        if (this.goodPostureTime) this.goodPostureTime.textContent = '0:00 / 3:00';
    }

    // ====== 通知 ======
    notify(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        if (type === 'success') {
            const originalText = this.feedbackText.innerText;
            this.feedbackText.innerText = message;
            this.feedbackWindow.classList.remove('-translate-y-32');
            this.feedbackWindow.classList.add('bg-green-100', 'border-green-200');
            setTimeout(() => {
                this.feedbackWindow.classList.add('-translate-y-32');
                setTimeout(() => {
                    this.feedbackText.innerText = originalText;
                    this.feedbackWindow.classList.remove('bg-green-100', 'border-green-200');
                }, 500);
            }, 2000);
        }
    }

    // ====== 指标更新 ======
    updateMetrics(status) {
        if (!status || !status.metrics) return;
        const { slouch, tilt } = status.metrics;

        const slouchPct = Math.min(100, Math.max(0, slouch * 100));
        if (this.slouchValue) this.slouchValue.innerText = slouch.toFixed(2);
        if (this.slouchBar) {
            this.slouchBar.style.width = `${slouchPct}%`;
            if (slouchPct > 100) this.slouchBar.classList.add('bg-red-500');
            else this.slouchBar.classList.remove('bg-red-500');
        }

        if (this.tiltValue) this.tiltValue.innerText = `${tilt.toFixed(1)}°`;
        if (this.tiltBar) {
            const tiltPct = Math.min(100, Math.max(0, (tilt / 15) * 100));
            this.tiltBar.style.width = `${tiltPct}%`;
        }
    }

    // ====== 警告处理 ======
    handleAlert(isBadPosture, message) {
        if (isBadPosture) {
            if (!this.lastAlertState) {
                this.showAlert(message);
                this.lastAlertState = true;
            } else {
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
