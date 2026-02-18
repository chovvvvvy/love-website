// 📋 日志系统
// 用于调试和错误追踪

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor() {
        this.currentLevel = LogLevel.DEBUG;
        this.logs = [];
        this.maxLogs = 500; // 最多保存500条日志

        // 从localStorage加载日志级别
        const savedLevel = localStorage.getItem('logLevel');
        if (savedLevel !== null) {
            this.currentLevel = parseInt(savedLevel);
        }

        // 添加控制台拦截
        this.interceptConsole();
    }

    interceptConsole() {
        // 拦截原始console方法
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalLog = console.log;

        // 保存原始方法供日志面板使用
        this._originalConsole = {
            error: originalError,
            warn: originalWarn,
            log: originalLog
        };

        // 重写error方法
        console.error = (...args) => {
            this.error(args.join(' '));
            originalError.apply(console, args);
        };

        // 重写warn方法
        console.warn = (...args) => {
            this.warn(args.join(' '));
            originalWarn.apply(console, args);
        };

        // 重写log方法
        console.log = (...args) => {
            this.debug(args.join(' '));
            originalLog.apply(console, args);
        };
    }

    formatTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('zh-CN') + '.' + now.getMilliseconds().toString().padStart(3, '0');
    }

    addLog(level, category, message) {
        const log = {
            timestamp: this.formatTimestamp(),
            level: level,
            category: category,
            message: message
        };

        this.logs.push(log);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 保存到localStorage
        try {
            localStorage.setItem('appLogs', JSON.stringify(this.logs.slice(-100)));
        } catch (e) {
            // 忽略存储错误
        }

        // 输出到控制台
        const prefix = `[${log.timestamp}] [${category}]`;
        switch (level) {
            case LogLevel.ERROR:
                this._originalConsole.error(prefix, message);
                break;
            case LogLevel.WARN:
                this._originalConsole.warn(prefix, message);
                break;
            case LogLevel.INFO:
                this._originalConsole.log(prefix, message);
                break;
            case LogLevel.DEBUG:
                this._originalConsole.log(prefix, message);
                break;
        }
    }

    debug(message, category = 'DEBUG') {
        if (this.currentLevel <= LogLevel.DEBUG) {
            this.addLog(LogLevel.DEBUG, category, message);
        }
    }

    info(message, category = 'INFO') {
        if (this.currentLevel <= LogLevel.INFO) {
            this.addLog(LogLevel.INFO, category, message);
        }
    }

    warn(message, category = 'WARN') {
        if (this.currentLevel <= LogLevel.WARN) {
            this.addLog(LogLevel.WARN, category, message);
        }
    }

    error(message, category = 'ERROR') {
        if (this.currentLevel <= LogLevel.ERROR) {
            this.addLog(LogLevel.ERROR, category, message);
        }
    }

    setLevel(level) {
        this.currentLevel = level;
        localStorage.setItem('logLevel', level.toString());
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('appLogs');
    }

    exportLogs() {
        const logText = this.logs.map(log =>
            `[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}`
        ).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showLogPanel() {
        // 创建日志面板
        let panel = document.getElementById('debugLogPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'debugLogPanel';
            panel.innerHTML = `
                <div class="log-panel-header">
                    <span>📋 调试日志</span>
                    <button class="log-close-btn" onclick="logger.hideLogPanel()">✕</button>
                </div>
                <div class="log-controls">
                    <button class="log-btn" onclick="logger.setLevel(0); logger.refreshPanel();">全部</button>
                    <button class="log-btn" onclick="logger.setLevel(1); logger.refreshPanel();">信息</button>
                    <button class="log-btn" onclick="logger.setLevel(2); logger.refreshPanel();">警告</button>
                    <button class="log-btn" onclick="logger.setLevel(3); logger.refreshPanel();">错误</button>
                    <button class="log-btn" onclick="logger.clearLogs(); logger.refreshPanel();">清空</button>
                    <button class="log-btn" onclick="logger.exportLogs();">导出</button>
                </div>
                <div class="log-content" id="logContent"></div>
            `;
            document.body.appendChild(panel);
        }
        panel.style.display = 'block';
        this.refreshPanel();
    }

    hideLogPanel() {
        const panel = document.getElementById('debugLogPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    refreshPanel() {
        const content = document.getElementById('logContent');
        if (!content) return;

        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelColors = ['#999', '#333', '#f57c00', '#d32f2f'];

        content.innerHTML = this.logs
            .filter(log => log.level >= this.currentLevel)
            .map(log => `
                <div class="log-entry" style="color: ${levelColors[log.level]}">
                    <span class="log-time">[${log.timestamp}]</span>
                    <span class="log-level">[${levelNames[log.level]}]</span>
                    <span class="log-category">[${log.category}]</span>
                    <span class="log-message">${this.escapeHtml(log.message)}</span>
                </div>
            `).join('');

        content.scrollTop = content.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局日志实例
const logger = new Logger();

// 添加日志面板样式
const logStyles = `
<style>
#debugLogPanel {
    position: fixed;
    top: 10px;
    right: 10px;
    width: 500px;
    max-height: 600px;
    background: white;
    border: 2px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    display: none;
    font-family: 'Courier New', monospace;
    font-size: 12px;
}

.log-panel-header {
    background: #333;
    color: white;
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 6px 6px 0 0;
    font-weight: bold;
}

.log-close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
}

.log-close-btn:hover {
    background: rgba(255,255,255,0.2);
    border-radius: 4px;
}

.log-controls {
    padding: 8px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.log-btn {
    padding: 4px 8px;
    background: #fff;
    border: 1px solid #999;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
}

.log-btn:hover {
    background: #e0e0e0;
}

.log-content {
    max-height: 500px;
    overflow-y: auto;
    padding: 10px;
    background: #fafafa;
}

.log-entry {
    padding: 4px 0;
    border-bottom: 1px solid #eee;
    font-size: 11px;
    line-height: 1.4;
}

.log-time {
    color: #666;
}

.log-level {
    font-weight: bold;
    margin-left: 5px;
}

.log-category {
    color: #666;
    margin-left: 5px;
}

.log-message {
    margin-left: 10px;
}
</style>
`;

// 注入样式
document.head.insertAdjacentHTML('beforeend', logStyles);

// 错误监听
window.addEventListener('error', (event) => {
    logger.error(
        `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        'JS Error'
    );
});

window.addEventListener('unhandledrejection', (event) => {
    logger.error(
        `Unhandled Promise Rejection: ${event.reason}`,
        'Promise Error'
    );
});

// 页面加载完成日志
window.addEventListener('load', () => {
    logger.info('页面加载完成', 'PAGE');
    logger.info(`URL: ${window.location.href}`, 'PAGE');
    logger.info(`User Agent: ${navigator.userAgent}`, 'PAGE');
});

// 导出
window.logger = logger;
window.showLogs = () => logger.showLogPanel();
