/**
 * UI 管理模块
 * 修改：移除保持坐姿时间显示
 */

const UI = {
    elements: {},

    init() {
        this.elements = {
            status: document.getElementById('status'),
            warning: document.getElementById('posture-warning'),
            warningText: document.getElementById('warning-text'),
            metricSpine: document.getElementById('metric-spine'),
            metricNeck: document.getElementById('metric-neck')
        };
    },

    startMonitoring() {
        document.getElementById('video').style.display = 'block';
        this.hideWarning();
    },

    showWarning(message, type) {
        if (!this.elements.warning) this.init();
        this.elements.warningText.textContent = message;
        
        // 根据类型设置不同样式
        this.elements.warning.className = 'posture-warning';
        if (type === 'slouch') {
            this.elements.warning.classList.add('active', 'warning-slouch');
        } else if (type === 'tilt') {
            this.elements.warning.classList.add('active', 'warning-tilt');
        } else {
            this.elements.warning.classList.add('active');
        }
    },

    hideWarning() {
        if (!this.elements.warning) this.init();
        this.elements.warning.className = 'posture-warning';
    },

    updateMetrics(metrics) {
        if (!this.elements.metricSpine) this.init();
        this.elements.metricSpine.textContent = metrics.spineAlignment;
        this.elements.metricNeck.textContent = metrics.neckRotation + '°';
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
