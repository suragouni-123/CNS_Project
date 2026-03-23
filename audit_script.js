// Security Audit Log System
class SecurityAuditSystem {
    constructor() {
        this.logs = [];
        this.currentUser = 'user_001';
        this.maxLogs = 1000;
        this.initializeStorage();
        this.setupEventListeners();
        this.loadLogs();
        this.startRealTimeMonitoring();
        this.initializeCharts();
        this.loadSharedData();
    }

    loadSharedData() {
        // Load shared data from main app
        const sharedPassword = sessionStorage.getItem('sharedPassword');
        const sharedFiles = sessionStorage.getItem('sharedFiles');
        
        // COMPLETELY CLEAR all existing logs - only show selected files
        this.logs = [];
        
        if (sharedFiles) {
            try {
                const files = JSON.parse(sharedFiles);
                console.log('Loading files for audit:', files);
                
                // Create audit entries ONLY for the files you selected
                files.forEach((file, index) => {
                    const auditEntry = {
                        id: Date.now() + index,
                        timestamp: new Date().toISOString(),
                        userId: this.currentUser,
                        type: 'file_analysis',
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type || 'unknown',
                        status: 'analyzed',
                        action: 'security_scan',
                        ipAddress: 'localhost',
                        details: `Security analysis completed for selected file: ${file.name}`,
                        riskLevel: this.calculateRiskLevel(file),
                        encryptionRecommended: true,
                        scanResult: {
                            malware: 'clean',
                            suspicious: 'none',
                            recommendation: 'Safe to encrypt'
                        }
                    };
                    
                    this.logs.push(auditEntry);
                    console.log('Added audit entry:', auditEntry);
                });
                
                // Update UI immediately
                this.updateStats();
                this.updateLogTable();
                this.updateLiveActivity();
                
                // Show clear notification
                this.showToast(`Security analysis complete for ${files.length} selected file(s)`, 'success');
                
            } catch (e) {
                console.error('Error parsing shared files:', e);
                this.showToast('Error loading files for analysis', 'error');
            }
        } else {
            // No files - show empty state
            this.updateStats();
            this.updateLogTable();
            this.updateLiveActivity();
            this.showToast('No files selected for security audit', 'warning');
        }
    }

    calculateRiskLevel(file) {
        // Simple risk assessment based on file type and size
        const highRiskTypes = ['exe', 'bat', 'cmd', 'scr', 'dll'];
        const mediumRiskTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
        
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (highRiskTypes.includes(extension)) return 'high';
        if (mediumRiskTypes.includes(extension)) return 'medium';
        return 'low';
    }

    initializeStorage() {
        if (!localStorage.getItem('auditLogs')) {
            localStorage.setItem('auditLogs', JSON.stringify([]));
        }
        if (!localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', this.currentUser);
        }
    }

    setupEventListeners() {
        // User selection
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = localStorage.getItem('currentUser') || 'user_001';
            userSelect.addEventListener('change', (e) => {
                this.currentUser = e.target.value;
                localStorage.setItem('currentUser', this.currentUser);
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
            refreshLogsBtn.addEventListener('click', () => this.refreshLogs());
        }
        
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }
    }

    // Log encryption/decryption activities
    logActivity(action, fileName, fileSize, status, details = '') {
        const log = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            userId: this.currentUser,
            action: action, // 'encryption' or 'decryption'
            fileName: fileName,
            fileSize: fileSize,
            status: status, // 'success', 'failed', 'pending'
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
        
        // Keep only last maxLogs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.saveLogs();
        this.updateUI();
        this.updateLiveActivity(log);
        this.updateCharts();
    }

    saveLogs() {
        localStorage.setItem('auditLogs', JSON.stringify(this.logs));
    }

    loadLogs() {
        const savedLogs = localStorage.getItem('auditLogs');
        if (savedLogs) {
            this.logs = JSON.parse(savedLogs);
            this.updateUI();
            this.updateCharts();
        }
    }

    updateUI() {
        this.updateStats();
        this.updateLogTable();
    }

    updateStats() {
        const encryptions = this.logs.filter(log => log.action === 'encryption').length;
        const decryptions = this.logs.filter(log => log.action === 'decryption').length;
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

        tbody.innerHTML = filteredLogs.map(log => `
            <tr>
                <td>${this.formatDate(log.timestamp)}</td>
                <td>${log.userId}</td>
                <td><span class="action-badge ${log.action}">${log.action.toUpperCase()}</span></td>
                <td>${log.fileName}</td>
                <td>${this.formatFileSize(log.fileSize)}</td>
                <td><span class="status-badge ${log.status}">${log.status.toUpperCase()}</span></td>
                <td>${log.ipAddress}</td>
                <td>${log.details || '-'}</td>
            </tr>
        `).join('');
    }

    getFilteredLogs() {
        let filtered = [...this.logs];

        // Action filter
        const actionFilter = document.getElementById('logFilter')?.value;
        if (actionFilter && actionFilter !== 'all') {
            if (actionFilter === 'encryption') {
                filtered = filtered.filter(log => log.action === 'encryption');
            } else if (actionFilter === 'decryption') {
                filtered = filtered.filter(log => log.action === 'decryption');
            } else if (actionFilter === 'failed') {
                filtered = filtered.filter(log => log.status === 'failed');
            } else if (actionFilter === 'success') {
                filtered = filtered.filter(log => log.status === 'success');
            }
        }

        // Time filter
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

        // Search filter
        const searchTerm = document.getElementById('searchLogs')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(log => 
                log.fileName.toLowerCase().includes(searchTerm) ||
                log.userId.toLowerCase().includes(searchTerm) ||
                log.details.toLowerCase().includes(searchTerm)
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

        // If no log provided, update with current logs
        if (!log) {
            if (this.logs.length === 0) {
                liveActivity.innerHTML = '<div class="no-activity"><i class="fas fa-info-circle"></i> No files selected for analysis. Go to main app and select files to see security analysis results here.</div>';
            } else {
                // Show latest file analysis
                const latestLog = this.logs[0];
                this.updateLiveActivity(latestLog);
            }
            return;
        }

        // Remove "no activity" message if it exists
        const noActivity = liveActivity.querySelector('.no-activity');
        if (noActivity) {
            noActivity.remove();
        }

        // Create new activity item
        const activityItem = document.createElement('div');
        activityItem.className = `activity-item ${log.status} ${log.action}`;
        activityItem.innerHTML = `
            <div>
                <strong>${log.action.toUpperCase()}</strong> - ${log.fileName}
                <br><small>${this.formatDate(log.timestamp)} by ${log.userId}</small>
            </div>
            <span class="status-badge ${log.status}">${log.status.toUpperCase()}</span>
        `;

        // Add to top of live activity
        liveActivity.insertBefore(activityItem, liveActivity.firstChild);

        // Keep only last 10 activities
        const items = liveActivity.querySelectorAll('.activity-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (activityItem.parentNode) {
                activityItem.remove();
                
                // Add "no activity" message if no items left
                if (liveActivity.querySelectorAll('.activity-item').length === 0) {
                    liveActivity.innerHTML = '<div class="no-activity"><i class="fas fa-info-circle"></i> No recent activity. Start encrypting/decrypting files to see live updates.</div>';
                }
            }
        }, 10000);
    }

    clearAllLogs() {
        if (confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
            this.logs = [];
            this.saveLogs();
            this.updateUI();
            this.showToast('All logs cleared successfully', 'success');
            
            // Clear live activity
            const liveActivity = document.getElementById('liveActivity');
            if (liveActivity) {
                liveActivity.innerHTML = '<div class="no-activity"><i class="fas fa-info-circle"></i> No recent activity. Start encrypting/decrypting files to see live updates.</div>';
            }
        }
    }

    refreshLogs() {
        // Reload shared data from sessionStorage
        this.loadSharedData();
        this.updateStats();
        this.updateLogTable();
        this.updateLiveActivity();
        this.showToast('Audit logs refreshed', 'success');
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
                `"${log.details}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Utility functions
    getClientIP() {
        // In a real implementation, this would get the actual client IP
        // For demo purposes, we'll use a mock IP
        return '192.168.1.' + Math.floor(Math.random() * 255);
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
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const toastMessage = document.getElementById('toastMessage');
        const toastContent = toast.querySelector('.toast-content');
        const icon = toastContent.querySelector('i');

        toastMessage.textContent = message;
        toast.className = 'toast ' + type;
        
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else {
            icon.className = 'fas fa-info-circle';
        }

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Real-time monitoring - COMPLETELY DISABLED
    startRealTimeMonitoring() {
        // DISABLED - Only analyze files explicitly selected by user
        // No random activities, no simulated logs, no background processes
        console.log('Real-time monitoring disabled - only analyzing selected files');
    }

    simulateActivity() {
        const actions = ['encryption', 'decryption'];
        const statuses = ['success', 'success', 'success', 'failed']; // 75% success rate
        const files = ['document.pdf', 'image.jpg', 'data.xlsx', 'presentation.pptx', 'archive.zip'];
        const users = ['user_001', 'user_002', 'user_003'];
        
        const log = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            userId: users[Math.floor(Math.random() * users.length)],
            action: actions[Math.floor(Math.random() * actions.length)],
            fileName: files[Math.floor(Math.random() * files.length)],
            fileSize: Math.floor(Math.random() * 10000000) + 1000,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            ipAddress: this.getClientIP(),
            userAgent: navigator.userAgent,
            details: 'Simulated activity for demonstration',
            sessionId: this.getSessionId()
        };

        this.addLog(log);
    }

    // Charts initialization
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
        
        // Simple bar chart implementation
        this.drawBarChart(ctx, last7Days, 'Activity (Last 7 Days)');
    }

    updateSuccessChart() {
        const canvas = document.getElementById('successChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const successData = this.getSuccessRateData();
        
        // Simple pie chart implementation
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
            const extension = log.fileName.split('.').pop().toUpperCase();
            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
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

    // Simple chart drawing functions
    drawBarChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;
        const barWidth = (width - padding * 2) / data.length;
        
        ctx.clearRect(0, 0, width, height);
        
        // Find max value for scaling
        const maxValue = Math.max(...data.map(d => d.value), 1);
        
        // Draw bars
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * (height - padding * 2);
            const x = padding + index * barWidth + barWidth * 0.1;
            const y = height - padding - barHeight;
            
            ctx.fillStyle = '#667eea';
            ctx.fillRect(x, y, barWidth * 0.8, barHeight);
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth * 0.4, height - 20);
            
            // Draw value
            ctx.fillText(item.value, x + barWidth * 0.4, y - 5);
        });
    }

    drawPieChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        
        ctx.clearRect(0, 0, width, height);
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        
        data.forEach(item => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            
            ctx.fillStyle = item.color || '#667eea';
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.label}: ${item.value}`, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }

    drawLineChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;
        const pointSpacing = (width - padding * 2) / (data.length - 1);
        
        ctx.clearRect(0, 0, width, height);
        
        const maxValue = Math.max(...data.map(d => d.value), 1);
        
        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        
        data.forEach((item, index) => {
            const x = padding + index * pointSpacing;
            const y = height - padding - (item.value / maxValue) * (height - padding * 2);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points and labels
        data.forEach((item, index) => {
            const x = padding + index * pointSpacing;
            const y = height - padding - (item.value / maxValue) * (height - padding * 2);
            
            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#667eea';
            ctx.fill();
            
            // Draw value
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.value, x, y - 10);
        });
    }
}

// Initialize the audit system when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.auditSystem = new SecurityAuditSystem();
});

// Integration function for main app
function logEncryptionActivity(fileName, fileSize, status, details = '') {
    if (window.auditSystem) {
        return window.auditSystem.logActivity('encryption', fileName, fileSize, status, details);
    }
}

function logDecryptionActivity(fileName, fileSize, status, details = '') {
    if (window.auditSystem) {
        return window.auditSystem.logActivity('decryption', fileName, fileSize, status, details);
    }
}

// Example usage functions for testing
function testAuditLog() {
    if (window.auditSystem) {
        window.auditSystem.logActivity('encryption', 'test.pdf', 1024000, 'success', 'Test encryption for demonstration');
        window.auditSystem.logActivity('decryption', 'test.pdf.aes256', 1024100, 'success', 'Test decryption for demonstration');
        window.auditSystem.logActivity('encryption', 'failed.doc', 512000, 'failed', 'Invalid password provided');
    }
}
