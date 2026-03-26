// Security Audit Log System
class SecurityAuditSystem {
    constructor() {
        this.logs = [];
        this.currentUser = 'user_001';
        this.maxLogs = 1000;
        this.storageKey = 'cryptex_audit_logs';
        
        this.initializeStorage();
        this.setupEventListeners();
        this.loadLogs();
        this.loadSharedData();
        this.initializeCharts();
        this.setupCrossTabSync();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    saveLogs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
            console.log('Logs saved to localStorage. Total logs:', this.logs.length);
        } catch (e) {
            console.error('Error saving logs to localStorage:', e);
            if (e.name === 'QuotaExceededError') {
                // If quota exceeded, remove oldest 100 logs
                this.logs = this.logs.slice(0, this.maxLogs - 100);
                this.saveLogs();
            }
        }
    }

    loadLogs() {
        try {
            const storedLogs = localStorage.getItem(this.storageKey);
            if (storedLogs) {
                this.logs = JSON.parse(storedLogs);
                console.log('Loaded logs from localStorage:', this.logs.length);
            }
        } catch (e) {
            console.error('Error loading logs from localStorage:', e);
            this.logs = [];
        }
        this.updateUI();
    }

    loadSharedData() {
        // Load shared data from main app
        const sharedFiles = localStorage.getItem('sharedFiles');
        const sharedOperationRaw = localStorage.getItem('sharedOperation');
        
        let logsAdded = false;

        if (sharedOperationRaw) {
            try {
                const sharedOperation = JSON.parse(sharedOperationRaw);
                if (sharedOperation && sharedOperation.fileName && sharedOperation.timestamp) {
                    // Check for duplicate based on filename and approximate timestamp
                    const exists = this.logs.some(l => 
                        l.fileName === sharedOperation.fileName && 
                        Math.abs(new Date(l.timestamp) - new Date(sharedOperation.timestamp)) < 2000
                    );

                    if (!exists) {
                        const log = {
                            id: Date.now() + Math.random(),
                            timestamp: sharedOperation.timestamp || new Date().toISOString(),
                            userId: this.currentUser,
                            action: sharedOperation.action || 'encryption',
                            fileName: sharedOperation.fileName,
                            fileSize: sharedOperation.fileSize || 0,
                            status: sharedOperation.status || 'success',
                            ipAddress: this.getClientIP(),
                            userAgent: navigator.userAgent,
                            details: 'Operation from main application',
                            sessionId: this.getSessionId()
                        };
                        this.logs.unshift(log);
                        logsAdded = true;
                    }
                }
            } catch (e) {
                console.error('Error parsing sharedOperation:', e);
            }
        }

        if (sharedFiles) {
            try {
                const files = JSON.parse(sharedFiles);
                const lastSync = localStorage.getItem('lastAuditSync') || 0;
                const currentSyncTime = Date.now();
                
                // Only process if sharedFiles was updated after our last sync
                // Or if we are in a fresh session (lastSync == 0)
                files.forEach(file => {
                    const auditEntry = {
                        id: Date.now() + Math.random(),
                        timestamp: new Date().toISOString(),
                        userId: this.currentUser,
                        action: 'security_scan',
                        fileName: file.name,
                        fileSize: file.size,
                        status: 'success',
                        ipAddress: this.getClientIP(),
                        details: `Security scan: ${this.calculateRiskLevel(file)} risk detected. Recommended for encryption.`,
                        sessionId: this.getSessionId()
                    };
                    
                    // Check for duplicate in current log list (same file and very close timestamp)
                    const exists = this.logs.some(l => 
                        l.fileName === file.name && 
                        l.action === 'security_scan' &&
                        Math.abs(new Date(l.timestamp) - new Date(auditEntry.timestamp)) < 10000 
                    );

                    if (!exists) {
                        this.logs.unshift(auditEntry);
                        logsAdded = true;
                    }
                });
                localStorage.setItem('lastAuditSync', currentSyncTime);
            } catch (e) {
                console.error('Error parsing shared files:', e);
            }
        }

    if (logsAdded) {
            // Keep only last maxLogs
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(0, this.maxLogs);
            }
            this.saveLogs();
            this.updateUI();
            this.updateCharts();
            this.updateLiveActivity(); // Update the monitor
            this.showToast('Recent activity synchronized', 'success');
        }
    }

    calculateRiskLevel(file) {
        const highRiskTypes = ['exe', 'bat', 'cmd', 'scr', 'dll'];
        const mediumRiskTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (highRiskTypes.includes(extension)) return 'High';
        if (mediumRiskTypes.includes(extension)) return 'Medium';
        return 'Low';
    }

    setupEventListeners() {
        // User selection
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            this.currentUser = userSelect.value || 'user_001';
            userSelect.addEventListener('input', () => {
                this.currentUser = userSelect.value || 'user_001';
            });
        }

        // Filter controls
        const logFilter = document.getElementById('logFilter');
        if (logFilter) {
            logFilter.addEventListener('change', () => this.filterLogs());
        }

        const timeFilter = document.getElementById('timeFilter');
        if (timeFilter) {
            timeFilter.addEventListener('change', () => this.filterLogs());
        }

        const searchLogs = document.getElementById('searchLogs');
        if (searchLogs) {
            searchLogs.addEventListener('input', () => this.filterLogs());
        }

        // Control buttons
        const clearLogsBtn = document.getElementById('clearLogs');
        const exportLogsBtn = document.getElementById('exportLogs');
        const refreshLogsBtn = document.getElementById('refreshLogs');
        
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearAllLogs());
        }
        
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => {
                this.loadLogs();
                this.loadSharedData();
                this.showToast('Audit logs refreshed from storage', 'success');
            });
        }
        
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }
    }

    setupCrossTabSync() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'sharedFiles' || e.key === 'sharedOperation' || e.key === this.storageKey) {
                console.log('Storage changed in another tab, refreshing audit data...');
                this.loadLogs();
                this.loadSharedData();
            }
        });
    }

    logActivity(action, fileName, fileSize, status, details = '') {
        const log = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            userId: this.currentUser,
            action: action,
            fileName: fileName,
            fileSize: fileSize,
            status: status,
            ipAddress: this.getClientIP(),
            userAgent: navigator.userAgent,
            details: details,
            sessionId: this.getSessionId()
        };

        this.addLog(log);
        return log;
    }

    addLog(log) {
        this.logs.unshift(log);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        this.saveLogs();
        this.updateUI();
        this.updateLiveActivity(log);
        this.updateCharts();
    }

    updateUI() {
        this.updateStats();
        this.updateLogTable();
    }

    updateStats() {
        const encryptions = this.logs.filter(log => log.action === 'encryption' || log.action === 'encrypt').length;
        const decryptions = this.logs.filter(log => log.action === 'decryption' || log.action === 'decrypt').length;
        const failures = this.logs.filter(log => log.status === 'failed').length;
        const uniqueUsers = [...new Set(this.logs.map(log => log.userId))].length;

        this.updateElement('totalEncryptions', encryptions);
        this.updateElement('totalDecryptions', decryptions);
        this.updateElement('failedAttempts', failures);
        this.updateElement('uniqueUsers', uniqueUsers);
    }

    updateLogTable() {
        const tbody = document.getElementById('logTableBody');
        if (!tbody) return;

        const filteredLogs = this.getFilteredLogs();
        
        if (filteredLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #666;">No logs found</td></tr>';
            return;
        }

        let html = '';
        let lastDateLabel = '';

        filteredLogs.forEach(log => {
            const logDate = new Date(log.timestamp);
            const dateLabel = this.getDateLabel(logDate);
            
            if (dateLabel !== lastDateLabel) {
                html += `<tr class="date-header"><td colspan="8" style="background: #f1f5f9; font-weight: bold; color: #475569; padding: 10px 15px;">${dateLabel}</td></tr>`;
                lastDateLabel = dateLabel;
            }

            html += `
                <tr>
                    <td>${logDate.toLocaleTimeString()}</td>
                    <td>${log.userId}</td>
                    <td><span class="action-badge ${log.action}">${log.action.toUpperCase()}</span></td>
                    <td>${log.fileName}</td>
                    <td>${this.formatFileSize(log.fileSize)}</td>
                    <td><span class="status-badge ${log.status}">${log.status.toUpperCase()}</span></td>
                    <td>${log.ipAddress}</td>
                    <td title="${log.details || ''}">${log.details ? (log.details.length > 30 ? log.details.substring(0, 30) + '...' : log.details) : '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        
        // Update log count in header
        const logHeaderH3 = document.querySelector('.log-header h3');
        if (logHeaderH3) {
            const countSpan = logHeaderH3.querySelector('.log-count') || document.createElement('span');
            countSpan.className = 'log-count';
            countSpan.style.cssText = 'font-size: 0.9rem; font-weight: normal; margin-left: 10px; color: #666;';
            countSpan.textContent = `(${filteredLogs.length} entries)`;
            if (!logHeaderH3.contains(countSpan)) logHeaderH3.appendChild(countSpan);
        }
    }

    getDateLabel(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (compareDate.getTime() === today.getTime()) return 'Today';
        if (compareDate.getTime() === yesterday.getTime()) return 'Yesterday';
        return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    getFilteredLogs() {
        let filtered = [...this.logs];

        const actionFilter = document.getElementById('logFilter')?.value;
        if (actionFilter && actionFilter !== 'all') {
            if (actionFilter === 'encryption') {
                filtered = filtered.filter(log => log.action === 'encryption' || log.action === 'encrypt');
            } else if (actionFilter === 'decryption') {
                filtered = filtered.filter(log => log.action === 'decryption' || log.action === 'decrypt');
            } else if (actionFilter === 'failed') {
                filtered = filtered.filter(log => log.status === 'failed');
            } else if (actionFilter === 'success') {
                filtered = filtered.filter(log => log.status === 'success');
            }
        }

        const timeFilter = document.getElementById('timeFilter')?.value;
        if (timeFilter && timeFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            if (timeFilter === 'today') {
                filterDate.setHours(0, 0, 0, 0);
            } else if (timeFilter === 'week') {
                filterDate.setDate(now.getDate() - 7);
            } else if (timeFilter === 'month') {
                filterDate.setMonth(now.getMonth() - 1);
            }

            filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
        }

        const searchTerm = document.getElementById('searchLogs')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(log => 
                (log.fileName && log.fileName.toLowerCase().includes(searchTerm)) ||
                (log.userId && log.userId.toLowerCase().includes(searchTerm)) ||
                (log.details && log.details.toLowerCase().includes(searchTerm))
            );
        }

        return filtered;
    }

    filterLogs() {
        this.updateLogTable();
    }

    updateLiveActivity(log = null) {
        const liveActivity = document.getElementById('liveActivity');
        if (!liveActivity) return;

        if (!log) {
            if (this.logs.length === 0) {
                liveActivity.innerHTML = '<div class="no-activity"><i class="fas fa-info-circle"></i> No files selected for analysis. Go to main app and select files to see security analysis results here.</div>';
            } else {
                const latestLog = this.logs[0];
                this.renderLiveLog(latestLog);
            }
            return;
        }

        this.renderLiveLog(log);
    }

    renderLiveLog(log) {
        const liveActivity = document.getElementById('liveActivity');
        const noActivity = liveActivity.querySelector('.no-activity');
        if (noActivity) noActivity.remove();

        const activityItem = document.createElement('div');
        activityItem.className = `activity-item ${log.status} ${log.action}`;
        activityItem.innerHTML = `
            <div>
                <strong>${log.action.replace('_', ' ').toUpperCase()}</strong> - ${log.fileName}
                <br><small>${this.formatDate(log.timestamp)} by ${log.userId}</small>
            </div>
            <span class="status-badge ${log.status}">${log.status.toUpperCase()}</span>
        `;

        liveActivity.insertBefore(activityItem, liveActivity.firstChild);

        const items = liveActivity.querySelectorAll('.activity-item');
        if (items.length > 10) items[items.length - 1].remove();

        // Keep security monitor entries longer or don't remove them automatically if they are important
        // For this version, let's keep them until refresh or more logs come in.
    }

    clearAllLogs() {
        if (confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
            this.logs = [];
            this.saveLogs();
            this.updateUI();
            this.updateCharts();
            this.showToast('All logs cleared successfully', 'success');
            
            const liveActivity = document.getElementById('liveActivity');
            if (liveActivity) {
                liveActivity.innerHTML = '<div class="no-activity"><i class="fas fa-info-circle"></i> No recent activity.</div>';
            }
        }
    }

    refreshLogs() {
        this.loadLogs();
        this.loadSharedData();
        this.showToast('Audit logs refreshed from storage', 'success');
    }

    exportLogs() {
        const filteredLogs = this.getFilteredLogs();
        if (filteredLogs.length === 0) {
            this.showToast('No logs to export', 'error');
            return;
        }

        const csvContent = this.convertToCSV(filteredLogs);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`Exported ${filteredLogs.length} log entries`, 'success');
    }

    convertToCSV(logs) {
        const headers = ['Timestamp', 'User ID', 'Action', 'File Name', 'File Size', 'Status', 'IP Address', 'Details'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                `"${log.timestamp}"`,
                `"${log.userId}"`,
                `"${log.action}"`,
                `"${log.fileName}"`,
                `"${log.fileSize}"`,
                `"${log.status}"`,
                `"${log.ipAddress}"`,
                `"${(log.details || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    getClientIP() {
        if (!sessionStorage.getItem('clientIP')) {
            sessionStorage.setItem('clientIP', '192.168.1.' + Math.floor(Math.random() * 255));
        }
        return sessionStorage.getItem('clientIP');
    }

    getSessionId() {
        if (!sessionStorage.getItem('sessionId')) {
            sessionStorage.setItem('sessionId', 'session_' + Date.now());
        }
        return sessionStorage.getItem('sessionId');
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const toastMessage = document.getElementById('toastMessage');
        const icon = toast.querySelector('.toast-content i');

        toastMessage.textContent = message;
        toast.className = 'toast ' + type;
        
        if (type === 'success') icon.className = 'fas fa-check-circle';
        else if (type === 'error') icon.className = 'fas fa-exclamation-circle';
        else icon.className = 'fas fa-info-circle';

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    initializeCharts() {
        this.updateCharts();
    }

    updateCharts() {
        this.updateActivityChart();
        this.updateSuccessChart();
        this.updateFileTypeChart();
        this.updateHourlyChart();
    }

    updateActivityChart() {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const last7Days = this.getLast7DaysData();
        this.drawBarChart(ctx, last7Days, 'Activity (Last 7 Days)');
    }

    updateSuccessChart() {
        const canvas = document.getElementById('successChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const successData = this.getSuccessRateData();
        this.drawPieChart(ctx, successData, 'Success Rate');
    }

    updateFileTypeChart() {
        const canvas = document.getElementById('fileTypeChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const fileTypeData = this.getFileTypeData();
        this.drawBarChart(ctx, fileTypeData, 'File Types Processed');
    }

    updateHourlyChart() {
        const canvas = document.getElementById('hourlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const hourlyData = this.getHourlyData();
        this.drawLineChart(ctx, hourlyData, 'Hourly Activity');
    }

    getLast7DaysData() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = days[date.getDay()];
            const count = this.logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate.toDateString() === date.toDateString();
            }).length;
            data.push({ label: dayName, value: count });
        }
        return data;
    }

    getSuccessRateData() {
        const success = this.logs.filter(log => log.status === 'success').length;
        const failed = this.logs.filter(log => log.status === 'failed').length;
        return [
            { label: 'Success', value: success, color: '#27ae60' },
            { label: 'Failed', value: failed, color: '#e74c3c' }
        ];
    }

    getFileTypeData() {
        const fileTypes = {};
        this.logs.forEach(log => {
            if (log.fileName) {
                const extension = log.fileName.split('.').pop().toUpperCase();
                fileTypes[extension] = (fileTypes[extension] || 0) + 1;
            }
        });
        return Object.entries(fileTypes).map(([label, value]) => ({ label, value }));
    }

    getHourlyData() {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            const count = this.logs.filter(log => {
                const hour = new Date(log.timestamp).getHours();
                return hour === i;
            }).length;
            hours.push({ label: `${i}:00`, value: count });
        }
        return hours;
    }

    drawBarChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;
        const barWidth = (width - padding * 2) / (data.length || 1);
        ctx.clearRect(0, 0, width, height);
        const maxValue = Math.max(...data.map(d => d.value), 1);
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * (height - padding * 2);
            const x = padding + index * barWidth + barWidth * 0.1;
            const y = height - padding - barHeight;
            ctx.fillStyle = '#667eea';
            ctx.fillRect(x, y, barWidth * 0.8, barHeight);
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth * 0.4, height - 10);
            ctx.fillText(item.value, x + barWidth * 0.4, y - 5);
        });
    }

    drawPieChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3.5;
        ctx.clearRect(0, 0, width, height);
        const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
        let currentAngle = -Math.PI / 2;
        data.forEach(item => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            if (sliceAngle > 0) {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = item.color || '#667eea';
                ctx.fill();
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius + 25);
                const labelY = centerY + Math.sin(labelAngle) * (radius + 25);
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${item.label}: ${item.value}`, labelX, labelY);
            }
            currentAngle += sliceAngle;
        });
    }

    drawLineChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;
        const pointSpacing = (width - padding * 2) / (data.length - 1 || 1);
        ctx.clearRect(0, 0, width, height);
        const maxValue = Math.max(...data.map(d => d.value), 1);
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        data.forEach((item, index) => {
            const x = padding + index * pointSpacing;
            const y = height - padding - (item.value / maxValue) * (height - padding * 2);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        data.forEach((item, index) => {
            if (item.value > 0) {
                const x = padding + index * pointSpacing;
                const y = height - padding - (item.value / maxValue) * (height - padding * 2);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#667eea';
                ctx.fill();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auditSystem = new SecurityAuditSystem();
});

function logEncryptionActivity(fileName, fileSize, status, details = '') {
    if (window.auditSystem) return window.auditSystem.logActivity('encryption', fileName, fileSize, status, details);
}

function logDecryptionActivity(fileName, fileSize, status, details = '') {
    if (window.auditSystem) return window.auditSystem.logActivity('decryption', fileName, fileSize, status, details);
}
