// Client-side AES encryption/decryption using Web Crypto API
class AESCrypto {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.fileSignature = 'AES256'; // 6 bytes signature
        this.version = 2; // 1 byte version
    }

    // Derive key from password using PBKDF2
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt file data with proper format
    async encrypt(data, password, mimeType = '') {
        try {
            console.log('Starting encryption...');
            
            // Generate random salt and IV
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            console.log('Salt length:', salt.length);
            console.log('IV length:', iv.length);
            
            // Derive key
            const key = await this.deriveKey(password, salt);
            
            // Encrypt data
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );
            
            console.log('Encrypted data length:', encryptedData.byteLength);
            
            // Create file format: [6 bytes signature][1 byte version][16 bytes salt][12 bytes IV][1 byte mime length][X bytes mime type][encrypted data]
            const signature = new TextEncoder().encode(this.fileSignature);
            const versionBytes = new Uint8Array([this.version]);
            const mimeBytes = new TextEncoder().encode(mimeType);
            const mimeLenBytes = new Uint8Array([mimeBytes.length]);
            
            const combined = new Uint8Array(
                signature.length + 
                versionBytes.length + 
                salt.length + 
                iv.length + 
                mimeLenBytes.length +
                mimeBytes.length +
                encryptedData.byteLength
            );
            
            let offset = 0;
            combined.set(signature, offset);
            offset += signature.length;
            
            combined.set(versionBytes, offset);
            offset += versionBytes.length;
            
            combined.set(salt, offset);
            offset += salt.length;
            
            combined.set(iv, offset);
            offset += iv.length;
            
            combined.set(mimeLenBytes, offset);
            offset += mimeLenBytes.length;
            
            combined.set(mimeBytes, offset);
            offset += mimeBytes.length;
            
            combined.set(new Uint8Array(encryptedData), offset);
            
            console.log('Total encrypted file size:', combined.length);
            console.log('File format: [6 signature][1 version][16 salt][12 IV][', encryptedData.byteLength, ' encrypted]');
            
            return combined;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    // Validate encrypted file format
    validateEncryptedFormat(encryptedData) {
        if (encryptedData.length < 35) { // 6 + 1 + 16 + 12 = 35 bytes minimum
            throw new Error('Invalid encrypted file format: File too small');
        }
        
        // Check signature
        const signature = new TextDecoder().decode(encryptedData.slice(0, 6));
        if (signature !== this.fileSignature) {
            throw new Error('Invalid encrypted file format: Not a valid AES encrypted file');
        }
        
        // Check version
        const version = encryptedData[6];
        if (version !== 1 && version !== 2) {
            throw new Error(`Unsupported encrypted file version: ${version}`);
        }
        
        return true;
    }

    // Decrypt file data with proper format parsing
    async decrypt(encryptedData, password) {
        try {
            console.log('Starting decryption...');
            console.log('Encrypted data length:', encryptedData.length);
            
            // Validate format
            this.validateEncryptedFormat(encryptedData);
            
            // Extract components based on version
            const version = encryptedData[6];
            let salt, iv, data, mimeType = '';
            
            if (version === 1) {
                salt = encryptedData.slice(7, 23); // After signature (6) + version (1)
                iv = encryptedData.slice(23, 35);  // After salt (16 bytes)
                data = encryptedData.slice(35);    // After IV (12 bytes)
            } else if (version === 2) {
                salt = encryptedData.slice(7, 23);
                iv = encryptedData.slice(23, 35);
                const mimeLen = encryptedData[35];
                const mimeBytes = encryptedData.slice(36, 36 + mimeLen);
                mimeType = new TextDecoder().decode(mimeBytes);
                data = encryptedData.slice(36 + mimeLen);
            }
            
            console.log('Extracted salt length:', salt.length);
            console.log('Extracted IV length:', iv.length);
            console.log('Extracted encrypted data length:', data.length);
            
            // Derive key
            const key = await this.deriveKey(password, salt);
            
            // Decrypt data
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );
            
            console.log('Decryption successful!');
            console.log('Decrypted data length:', decryptedData.byteLength);
            
            return {
                data: new Uint8Array(decryptedData),
                mimeType: mimeType
            };
        } catch (error) {
            console.error('Decryption error:', error);
            if (error.message.includes('Invalid encrypted file format')) {
                throw error;
            }
            throw new Error('Decryption failed - incorrect password or corrupted file: ' + error.message);
        }
    }

    // Check if file is encrypted
    isEncryptedFile(data) {
        if (data.length < 6) return false;
        const signature = new TextDecoder().decode(data.slice(0, 6));
        return signature === this.fileSignature;
    }
}

// Global variables
let selectedFiles = [];
let currentMode = 'encrypt';
let isProcessing = false;
const aesCrypto = new AESCrypto();

// localStorage helpers for cross-tab linked workflow
function saveSharedState(password, mode, files, operation, payloadBase64) {
    try {
        localStorage.setItem('sharedPassword', password);
        localStorage.setItem('sharedMode', mode);
        localStorage.setItem('sharedFiles', JSON.stringify(files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type || 'unknown'
        }))));

        if (operation) {
            localStorage.setItem('sharedOperation', JSON.stringify(operation));
        }

        if (payloadBase64) {
            const maxLen = 2 * 1024 * 1024;
            const trimmed = payloadBase64.length > maxLen ? payloadBase64.slice(0, maxLen) : payloadBase64;
            localStorage.setItem('sharedPayload', trimmed);
        }
    } catch (e) {
        console.warn('saveSharedState failed', e);
    }
}

function bytesToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const filesContainer = document.getElementById('filesContainer');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const processBtn = document.getElementById('processBtn');
const processBtnText = document.getElementById('processBtnText');
const clearBtn = document.getElementById('clearBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const currentFileText = document.getElementById('currentFile');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const strengthFeedback = document.getElementById('strengthFeedback');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateProcessButton();
    setupNavigationButtons();
});

// Setup navigation buttons
function setupNavigationButtons() {
    const visualizeBtn = document.getElementById('visualizeBtn');
    const auditBtn = document.getElementById('auditBtn');
    
    if (visualizeBtn) {
        visualizeBtn.addEventListener('click', function() {
            const password = document.getElementById('password').value;
            const files = selectedFiles;
            
            if (!password) {
                updateMessage('Please enter a password first to visualize the encryption process.', 'warning');
                return;
            }
            
            // Store data in localStorage for other pages
            localStorage.setItem('sharedPassword', password);
            localStorage.setItem('sharedFiles', JSON.stringify(files.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            }))));
            localStorage.setItem('sharedMode', currentMode);
            
            // Navigate to visualizer
            window.location.href = 'aes_visualizer.html';
        });
    }
    
    if (auditBtn) {
        auditBtn.addEventListener('click', function() {
            const password = document.getElementById('password').value;
            const files = selectedFiles;
            
            if (!password) {
                updateMessage('Please enter a password first for security audit.', 'warning');
                return;
            }
            
            if (files.length === 0) {
                updateMessage('Please select files first for security analysis.', 'warning');
                return;
            }
            
            // Store data in localStorage for other pages
            localStorage.setItem('sharedPassword', password);
            localStorage.setItem('sharedFiles', JSON.stringify(files.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            }))));
            
            // Navigate to security audit
            window.location.href = 'security_audit.html';
        });
    }
}

// Update message function
function updateMessage(text, type = 'info') {
    const messageText = document.getElementById('messageText');
    const messageBox = messageText.parentElement;
    const icon = messageBox.querySelector('i');
    
    if (!messageText) return;
    
    messageText.textContent = text;
    
    // Update icon and color based on type
    messageBox.className = 'message-box';
    if (type === 'warning') {
        icon.className = 'fas fa-exclamation-triangle';
        messageBox.style.background = 'rgba(255, 193, 7, 0.2)';
        messageBox.style.borderColor = 'rgba(255, 193, 7, 0.4)';
    } else if (type === 'success') {
        icon.className = 'fas fa-check-circle';
        messageBox.style.background = 'rgba(40, 167, 69, 0.2)';
        messageBox.style.borderColor = 'rgba(40, 167, 69, 0.4)';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        messageBox.style.background = 'rgba(220, 53, 69, 0.2)';
        messageBox.style.borderColor = 'rgba(220, 53, 69, 0.4)';
    } else {
        icon.className = 'fas fa-info-circle';
        messageBox.style.background = 'rgba(255, 255, 255, 0.1)';
        messageBox.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

// Event Listeners
function setupEventListeners() {
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.mode;
            updateProcessButton();
            clearFiles();
        });
    });

    // File upload events
    if (dropZone) dropZone.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.stopPropagation();
            handleDragOver(e);
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            handleDragLeave(e);
        });
        dropZone.addEventListener('drop', (e) => {
            e.stopPropagation();
            handleDrop(e);
        });
    }

    // Password events
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }

    // Button events
    if (processBtn) processBtn.addEventListener('click', processFiles);
    if (clearBtn) clearBtn.addEventListener('click', clearFiles);
}

// File handling functions
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer && e.dataTransfer.files) {
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    }
}

function addFiles(files) {
    files.forEach(file => {
        const fileId = Date.now() + Math.random();
        const fileObj = {
            id: fileId,
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type || 'unknown'
        };
        selectedFiles.push(fileObj);
    });
    
    updateFileList();
    updateProcessButton();
    
    // Update shared state for other tabs (Security Audit real-time analysis)
    localStorage.setItem('sharedFiles', JSON.stringify(selectedFiles.map(f => ({
        name: f.name,
        size: f.file.size,
        type: f.file.type || 'unknown'
    }))));
    
    // Update message when files are added
    if (selectedFiles.length === 1) {
        updateMessage(`Great! You've selected "${selectedFiles[0].name}". Now enter a password to secure it.`, 'info');
    } else {
        updateMessage(`Excellent! You've selected ${selectedFiles.length} files. Enter a password to secure them all.`, 'info');
    }
}

function updateFileList() {
    if (!filesContainer) return;
    
    if (selectedFiles.length === 0) {
        if (fileList) fileList.style.display = 'none';
        return;
    }
    
    if (fileList) fileList.style.display = 'block';
    filesContainer.innerHTML = '';
    
    selectedFiles.forEach(fileObj => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${fileObj.name}</div>
                    <div class="file-size">${fileObj.size}</div>
                </div>
            </div>
            <button class="remove-file" onclick="removeFile('${fileObj.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        filesContainer.appendChild(fileItem);
    });
}

function removeFile(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id != fileId);
    updateFileList();
    updateProcessButton();
    
    // Update shared state
    localStorage.setItem('sharedFiles', JSON.stringify(selectedFiles.map(f => ({
        name: f.name,
        size: f.file.size,
        type: f.file.type || 'unknown'
    }))));
}

function clearFiles() {
    selectedFiles = [];
    if (fileInput) fileInput.value = '';
    updateFileList();
    updateProcessButton();
    hideResults();
    
    // Reset message when files are cleared
    updateMessage('Ready to secure your files. Select files and enter a password to begin.', 'info');
    
    // Update shared state
    localStorage.removeItem('sharedFiles');
}

// Password functions
function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    const icon = togglePassword.querySelector('i');
    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function checkPasswordStrength() {
    const password = passwordInput.value;
    
    if (password.length === 0) {
        strengthBar.className = 'strength-fill';
        strengthText.textContent = 'Enter a password';
        strengthText.className = '';
        strengthFeedback.innerHTML = '';
        updateProcessButton();
        return;
    }
    
    // Client-side password strength calculation
    let score = 0;
    const feedback = [];
    
    // Length check
    if (password.length >= 8) score++;
    else feedback.push("Use at least 8 characters");
    
    if (password.length >= 12) score++;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score++;
    else feedback.push("Include uppercase letters");
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push("Include lowercase letters");
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push("Include numbers");
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push("Include special characters");
    
    // Update UI
    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
    strengthBar.className = `strength-fill ${strength}`;
    strengthText.textContent = `Password Strength: ${strength.charAt(0).toUpperCase() + strength.slice(1)}`;
    strengthText.className = strength;
    
    // Update message based on password strength
    if (selectedFiles.length > 0) {
        if (strength === 'strong') {
            updateMessage(`Perfect! Your password is strong and you have ${selectedFiles.length} file(s) selected. Ready to encrypt!`, 'success');
        } else if (strength === 'medium') {
            updateMessage(`Good password strength. Consider making it stronger for better security.`, 'info');
        } else {
            updateMessage(`Password is weak. Please add more characters, numbers, or symbols for better security.`, 'warning');
        }
    }
    
    if (feedback.length > 0) {
        strengthFeedback.innerHTML = '<strong>Suggestions:</strong><br>' + feedback.join('<br>');
    } else {
        strengthFeedback.innerHTML = '';
    }
    
    updateProcessButton();
}

// Process functions
function updateProcessButton() {
    if (!processBtn) return;
    
    const hasFiles = selectedFiles.length > 0;
    let hasPassword = passwordInput.value.length > 0;
    
    // Password strength guardrails for encryption
    if (currentMode === 'encrypt' && hasPassword) {
        if (strengthText.classList.contains('weak') || strengthBar.classList.contains('weak')) {
            hasPassword = false;
        }
    }
    
    processBtn.disabled = !hasFiles || !hasPassword || isProcessing;
    
    // Update navigation buttons
    const visualizeBtn = document.getElementById('visualizeBtn');
    const auditBtn = document.getElementById('auditBtn');
    
    if (visualizeBtn) {
        visualizeBtn.disabled = !hasPassword || isProcessing;
    }
    
    if (auditBtn) {
        auditBtn.disabled = !hasFiles || !hasPassword || isProcessing;
    }
    
    if (processBtnText) {
        if (currentMode === 'encrypt') {
            processBtnText.textContent = 'Encrypt Files';
        } else {
            processBtnText.textContent = 'Decrypt Files';
        }
    }
}

async function processFiles() {
    if (selectedFiles.length === 0 || !passwordInput.value) {
        showToast('Please select files and enter a password', 'error');
        return;
    }
    
    isProcessing = true;
    updateProcessButton();
    showProgress();
    
    const results = [];
    const password = passwordInput.value;
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const fileObj = selectedFiles[i];
            const file = fileObj.file;
            
            // Update progress
            updateProgress((i / selectedFiles.length) * 100, file.name);
            
            try {
                // Read file as array buffer
                const fileData = await file.arrayBuffer();
                
                let processedData;
                let extension;
                let fileMimeType = 'application/octet-stream';
                
                if (currentMode === 'encrypt') {
                    // Encrypt file
                    processedData = await aesCrypto.encrypt(fileData, password, file.type);
                    extension = '.aes256';
                } else {
                    // Check if file is properly encrypted
                    const dataView = new Uint8Array(fileData);
                    if (!aesCrypto.isEncryptedFile(dataView)) {
                        throw new Error('File is not a valid AES encrypted file');
                    }
                    
                    // Decrypt file
                    const result = await aesCrypto.decrypt(dataView, password);
                    processedData = result.data;
                    if (result.mimeType) {
                        fileMimeType = result.mimeType;
                    }
                    
                    // Extract original file extension from encrypted file metadata
                    const originalName = file.name.replace('.aes256', '');
                    extension = ''; // Remove extension to restore original file
                }
                
                // Create download link with proper MIME type
                let mimeType = currentMode === 'decrypt' ? fileMimeType : 'application/octet-stream';
                
                const blob = new Blob([processedData], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                const originalName = currentMode === 'encrypt' ? file.name : file.name.replace('.aes256', '');
                const processedName = currentMode === 'encrypt' ? 
                    file.name + extension : 
                    originalName;
                
                results.push({
                    originalName: file.name,
                    processedName: processedName,
                    url: url,
                    size: fileData.byteLength,
                    processedSize: processedData.byteLength,
                    success: true
                });
                
            } catch (error) {
                results.push({
                    originalName: file.name,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Complete progress
        updateProgress(100, 'Complete!');
        
        // Show results and store shared state for visualizer and audit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        hideProgress();

        const firstSuccess = results.find(result => result.success);
        let payload = null;

        if (selectedFiles.length > 0 && firstSuccess) {
            try {
                const firstFile = selectedFiles[0].file;
                const firstFileData = await firstFile.arrayBuffer();
                const firstProcessed = firstSuccess.processedSize ? await fetch(firstSuccess.url).then(r => r.arrayBuffer()) : null;

                if (firstProcessed) {
                    payload = JSON.stringify({
                        originalBase64: bytesToBase64(firstFileData),
                        processedBase64: bytesToBase64(firstProcessed),
                        fileName: firstSuccess.originalName,
                        mode: currentMode
                    });
                }
            } catch (e) {
                console.warn('Unable to capture payload for shared state', e);
            }
        }

        saveSharedState(
            password,
            currentMode,
            selectedFiles,
            {
                action: currentMode,
                fileName: firstSuccess ? firstSuccess.originalName : '',
                status: firstSuccess ? 'success' : 'failed',
                timestamp: new Date().toISOString()
            },
            payload
        );

        showResults(results);
        
    } catch (error) {
        hideProgress();
        showToast('Processing failed: ' + error.message, 'error');
    } finally {
        isProcessing = false;
        updateProcessButton();
    }
}

// UI functions
function showProgress() {
    if (progressSection) progressSection.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    if (currentFileText) currentFileText.textContent = 'Preparing...';
}

function updateProgress(percent, filename) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = Math.round(percent) + '%';
    if (currentFileText) currentFileText.textContent = filename;
}

function hideProgress() {
    if (progressSection) progressSection.style.display = 'none';
}

function showResults(results) {
    if (!resultsContainer) return;
    
    if (resultsSection) resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    
    let successCount = 0;
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = result.success ? 'result-item' : 'result-item error';
        
        if (result.success) {
            successCount++;
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-filename">${result.originalName}</span>
                    <span class="result-status success">Success</span>
                </div>
                <div class="result-details">
                    Original size: ${formatFileSize(result.size)}<br>
                    ${currentMode === 'encrypt' ? 'Encrypted' : 'Decrypted'} size: ${formatFileSize(result.processedSize)}
                </div>
                <button class="btn-success download-btn" onclick="downloadFile('${result.url}', '${result.processedName}')">
                    <i class="fas fa-download"></i> Download
                </button>
            `;
        } else {
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-filename">${result.originalName}</span>
                    <span class="result-status error">Failed</span>
                </div>
                <div class="result-details">${result.error}</div>
            `;
        }
        
        resultsContainer.appendChild(resultItem);
    });
    
    if (successCount > 0) {
        showToast(`Successfully processed ${successCount} file(s)`, 'success');
    }
}

function hideResults() {
    if (resultsSection) resultsSection.style.display = 'none';
}

// Download functions
function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastMessage = document.getElementById('toastMessage');
    const toastContent = toast.querySelector('.toast-content');
    const icon = toastContent.querySelector('i');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon and class based on type
    toast.className = 'toast ' + type;
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
    } else {
        icon.className = 'fas fa-info-circle';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to process files
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (processBtn && !processBtn.disabled) {
            processFiles();
        }
    }
    
    // Escape to clear files
    if (e.key === 'Escape') {
        clearFiles();
    }
});
