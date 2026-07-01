/**
 * UI 管理模块
 * 支持两种警告语音（slouch / tilt）和表扬语音
 * 移除界面计时器显示，仅保留后台计时逻辑
 */

export class UIController {
    constructor() {
        // DOM 元素
        this.alertWindow = document.getElementById('feedback-window');
        this.alertText = document.getElementById('feedback-text');
        this.alertIcon = document.getElementById('feedback-icon');
        this.statusBadge = document.getElementById('status-badge');
        
        this.slouchValue = document.getElementById('slouch-value');
        this.slouchBar = document.getElementById('slouch-bar');
        this.tiltValue = document.getElementById('tilt-value');
        this.tiltBar = document.getElementById('tilt-bar');
        
        // 音频元素（与 index.html 中的 ID 对应）
        this.audioWarningSlouch = document.getElementById('audio-warning-slouch');
        this.audioWarningTilt = document.getElementById('audio-warning-tilt');
        this.audioPraise = document.getElementById('audio-praise');
        
        // 语音开关
        this.audioEnabled = true;
        this.audioToggleBtn = document.getElementById('audio-toggle-btn');
        this.audioIcon = document.getElementById('audio-icon');
        this.audioToggleText = document.getElementById('audio-toggle-text');
        
        // 绑定语音切换事件
        if (this.audioToggleBtn) {
            this.audioToggleBtn.addEventListener('click', () => this.toggleAudio());
        }
        
        // 初始化图标
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 切换语音开关
     */
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        if (this.audioEnabled) {
            this.audioIcon.setAttribute('data-lucide', 'volume-2');
            this.audioToggleText.textContent = '语音开';
            this.audioToggleBtn.classList.remove('bg-gray-200', 'text-gray-500');
            this.audioToggleBtn.classList.add('bg-blue-50', 'text-blue-600');
        } else {
            this.audioIcon.setAttribute('data-lucide', 'volume-x');
            this.audioToggleText.textContent = '语音关';
            this.audioToggleBtn.classList.remove('bg-blue-50', 'text-blue-600');
            this.audioToggleBtn.classList.add('bg-gray-200', 'text-gray-500');
        }
        // 重新渲染图标
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * 播放语音
     * @param {string} type - 'slouch' | 'tilt' | 'praise'
     */
    playAudio(type) {
        if (!this.audioEnabled) {
            console.log(`[语音] 语音已关闭，跳过播放 (${type})`);
            return;
        }

        let audioEl = null;
        if (type === 'slouch') {
            audioEl = this.audioWarningSlouch;
            console.log('[语音] 播放驼背警告');
        } else if (type === 'tilt') {
            audioEl = this.audioWarningTilt;
            console.log('[语音] 播放歪头警告');
        } else if (type === 'praise') {
            audioEl = this.audioPraise;
            console.log('[语音] 播放表扬语音');
        } else {
            console.warn(`[语音] 未知类型: ${type}`);
            return;
        }

        if (!audioEl) {
            console.warn(`[语音] 未找到音频元素 (${type})`);
            return;
        }

        if (audioEl.readyState < 2) {
            console.warn(`[语音] 音频文件尚未加载完成 (${type})，readyState:`, audioEl.readyState);
        }

        audioEl.currentTime = 0;
        audioEl.play().catch(err => {
            console.error(`[语音] 播放失败 (${type}):`, err);
        });
    }

    /**
     * 更新实时指标（脊柱弯曲、头部旋转）
     */
    updateMetrics(status) {
        // status 包含 slouchValue, tiltAngle, isBadPosture, message
        const slouch = status.slouchValue !== undefined ? status.slouchValue : 0;
        const tilt = status.tiltAngle !== undefined ? status.tiltAngle : 0;
        
        // 限制显示范围
        const slouchPercent = Math.min(Math.max(slouch / 0.3 * 100, 0), 100);
        const tiltPercent = Math.min(Math.abs(tilt) / 30 * 100, 100);
        
        if (this.slouchValue) {
            this.slouchValue.textContent = slouch.toFixed(2);
        }
        if (this.slouchBar) {
            this.slouchBar.style.width = slouchPercent + '%';
            // 颜色变化：绿色 -> 黄色 -> 红色
            if (slouchPercent < 40) {
                this.slouchBar.style.background = '#22c55e';
            } else if (slouchPercent < 70) {
                this.slouchBar.style.background = '#eab308';
            } else {
                this.slouchBar.style.background = '#ef4444';
            }
        }
        
        if (this.tiltValue) {
            this.tiltValue.textContent = tilt.toFixed(1) + '°';
        }
        if (this.tiltBar) {
            this.tiltBar.style.width = tiltPercent + '%';
            if (tiltPercent < 40) {
                this.tiltBar.style.background = '#22c55e';
            } else if (tiltPercent < 70) {
                this.tiltBar.style.background = '#eab308';
            } else {
                this.tiltBar.style.background = '#ef4444';
            }
        }
    }

    /**
     * 处理警告弹窗
     * @param {boolean} isBad - 是否不良姿势
     * @param {string} message - 警告信息
     */
    handleAlert(isBad, message) {
        if (!this.alertWindow) return;
        if (isBad) {
            this.alertText.textContent = message || '请调整坐姿';
            this.alertWindow.classList.remove('-translate-y-32');
            this.alertWindow.classList.add('translate-y-0');
            // 根据类型改变颜色
            if (message && message.toLowerCase().includes('tilt')) {
                this.alertWindow.style.borderColor = '#f59e0b';
                this.alertIcon.style.background = '#fef3c7';
            } else {
                this.alertWindow.style.borderColor = '#ef4444';
                this.alertIcon.style.background = '#fecaca';
            }
            // 状态徽章变红
            if (this.statusBadge) {
                this.statusBadge.className = 'px-4 py-2 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-2';
            }
        } else {
            this.alertWindow.classList.add('-translate-y-32');
            this.alertWindow.classList.remove('translate-y-0');
            // 状态徽章恢复绿色
            if (this.statusBadge) {
                this.statusBadge.className = 'px-4 py-2 rounded-full bg-green-50 text-green-600 text-xs font-medium border border-green-100 flex items-center gap-2';
            }
        }
    }

    /**
     * 显示通知（可用于校准成功、表扬等）
     */
    notify(text, type = 'success') {
        // 利用 alertWindow 临时显示通知（也可以独立实现）
        if (this.alertWindow) {
            const originalText = this.alertText.textContent;
            this.alertText.textContent = text;
            this.alertWindow.classList.remove('-translate-y-32');
            this.alertWindow.classList.add('translate-y-0');
            if (type === 'success') {
                this.alertWindow.style.borderColor = '#22c55e';
                this.alertIcon.style.background = '#dcfce7';
            }
            // 3秒后恢复（如果未触发警告）
            setTimeout(() => {
                if (this.alertText.textContent === text) {
                    this.alertWindow.classList.add('-translate-y-32');
                    this.alertWindow.classList.remove('translate-y-0');
                }
            }, 3000);
        }
    }
}