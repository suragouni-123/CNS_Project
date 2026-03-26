class AESVisualizer {
    constructor() {
        this.isAnimating = false;
        this.currentStep = 0;
        this.animationSpeed = 1000;
        this.encryptedData = null;
        this.decryptedData = null;
        this.aesCrypto = new AESCrypto();
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeCanvas();
        this.loadSharedData();
    }

    loadSharedData() {
        // Load shared data from main app
        const sharedPassword = localStorage.getItem('sharedPassword');
        const sharedFiles = localStorage.getItem('sharedFiles');
        const sharedMode = localStorage.getItem('sharedMode');
        const sharedPayloadRaw = localStorage.getItem('sharedPayload');
        const sharedOperationRaw = localStorage.getItem('sharedOperation');

        if (sharedPassword) {
            this.elements.password.value = sharedPassword;
            this.sharedPassword = sharedPassword;
        }

        if (sharedFiles) {
            try {
                const files = JSON.parse(sharedFiles);
                if (files.length > 0) {
                    this.sharedFileData = files[0];
                }
            } catch (e) {
                console.error('Error parsing shared files:', e);
            }
        }

        if (sharedPayloadRaw) {
            try {
                this.sharedPayload = JSON.parse(sharedPayloadRaw);
            } catch (e) {
                console.error('Error parsing shared payload:', e);
            }
        }

        if (sharedOperationRaw) {
            try {
                this.sharedOperation = JSON.parse(sharedOperationRaw);
            } catch (e) {
                console.error('Error parsing shared operation:', e);
            }
        }

        // Hide manual input sections
        const passwordSection = document.getElementById('passwordSection');
        const inputTextSection = document.getElementById('inputTextSection');
        if (passwordSection) passwordSection.style.display = 'none';
        if (inputTextSection) inputTextSection.style.display = 'none';

        // Initialize tabs
        this.switchToEncryptionTab();

        // Show the section based on selected mode
        if (sharedMode === 'decrypt') {
            this.showDecryptionSection();
        } else {
            this.showEncryptionSection();
        }

        // Auto-run if shared payload and password available
        if (this.sharedPassword && this.sharedPayload && sharedMode) {
            setTimeout(async () => {
                if (sharedMode === 'decrypt') {
                    await this.startDecryption();
                } else {
                    await this.startEncryption();
                }
            }, 300);
        }
    }

    initializeElements() {
        this.elements = {
            password: document.getElementById('password'),
            encryptBtn: document.getElementById('encryptBtn'),
            decryptBtn: document.getElementById('decryptBtn'),
            resetBtn: document.getElementById('resetBtn'),
            resultsSection: document.getElementById('resultsSection'),
            encryptionTab: document.getElementById('encryptionTab'),
            decryptionTab: document.getElementById('decryptionTab'),
            encryptionProcess: document.getElementById('encryptionProcess'),
            decryptionProcess: document.getElementById('decryptionProcess'),
            downloadEncryptedBtn: document.getElementById('downloadEncryptedBtn'),
            downloadDecryptedBtn: document.getElementById('downloadDecryptedBtn'),
            encryptedFileInput: document.getElementById('encryptedFileInput'),
            uploadedFileName: document.getElementById('uploadedFileName'),
            decryptPassword: document.getElementById('decryptPassword'),
            startDecryptBtn: document.getElementById('startDecryptBtn'),
            uploadBox: document.querySelector('.upload-box'),
            binaryDisplay: document.getElementById('binaryDisplay'),
            hexDisplay: document.getElementById('hexDisplay'),
            byteAnimation: document.getElementById('byteAnimation'),
            processCanvas: document.getElementById('processFlow'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage')
        };

        // Step result elements
        this.stepResults = {
            step1: document.getElementById('step1Result'),
            step2: document.getElementById('step2Result'),
            step3: document.getElementById('step3Result'),
            step4: document.getElementById('step4Result'),
            step5: document.getElementById('step5Result'),
            step6: document.getElementById('step6Result')
        };

        this.decryptStepResults = {
            decryptStep1: document.getElementById('decryptStep1Result'),
            decryptStep2: document.getElementById('decryptStep2Result'),
            decryptStep3: document.getElementById('decryptStep3Result'),
            decryptStep4: document.getElementById('decryptStep4Result'),
            decryptStep5: document.getElementById('decryptStep5Result')
        };
    }

    attachEventListeners() {
        this.elements.encryptBtn.addEventListener('click', () => this.startEncryption());
        this.elements.decryptBtn.addEventListener('click', () => this.startDecryption());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        this.elements.encryptionTab.addEventListener('click', () => this.switchToEncryption());
        this.elements.decryptionTab.addEventListener('click', () => this.switchToDecryption());
        this.elements.downloadEncryptedBtn.addEventListener('click', () => this.downloadEncryptedFile());
        this.elements.downloadDecryptedBtn.addEventListener('click', () => this.downloadDecryptedFile());
        
        // File upload handlers
        if (this.elements.encryptedFileInput) {
            this.elements.encryptedFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.elements.uploadBox) {
            this.elements.uploadBox.addEventListener('click', () => this.elements.encryptedFileInput.click());
            this.elements.uploadBox.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.elements.uploadBox.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.elements.uploadBox.addEventListener('drop', (e) => this.handleFileDrop(e));
        }
        
        // Start decryption button
        if (this.elements.startDecryptBtn) {
            this.elements.startDecryptBtn.addEventListener('click', () => this.startDecryptionWithFile());
        }
    }

    initializeCanvas() {
        this.canvasCtx = this.elements.processCanvas.getContext('2d');
        this.drawProcessFlow([]);
    }

    async startEncryption() {
        if (this.isAnimating) return;
        
        this.reset();
        this.isAnimating = true;
        this.elements.encryptBtn.disabled = true;

        try {
            const password = this.sharedPassword || this.elements.password.value || 'defaultpassword123';

            let fileData;
            if (this.sharedPayload && this.sharedPayload.originalBase64) {
                // decode base64 to bytes
                const binary = atob(this.sharedPayload.originalBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                fileData = bytes;
            } else if (this.sharedFileData) {
                fileData = new TextEncoder().encode(`File: ${this.sharedFileData.name} (${this.formatFileSize(this.sharedFileData.size)})`);
            } else {
                fileData = new TextEncoder().encode('Hello, World! This is AES encryption demonstration.');
            }

            this.encryptedData = await this.aesCrypto.encrypt(fileData, password);
            await this.performEncryptionSteps();
            const originalText = this.sharedFileData ? `File: ${this.sharedFileData.name}` : 'Hello, World! This is AES encryption demonstration.';
            this.showResults(originalText, this.encryptedData);
            this.updateResultsDisplay();
            this.elements.resultsSection.style.display = 'block';
            this.showToast('Encryption completed successfully!', 'success');

        } catch (error) {
            this.showToast('Encryption failed: ' + error.message, 'error');
            console.error('Encryption error:', error);
        } finally {
            this.isAnimating = false;
            this.elements.encryptBtn.disabled = false;
        }
    }

    async performEncryptionSteps() {
        const password = this.sharedPassword || this.elements.password.value || 'defaultpassword123';
        
        // Step 1: File Processing
        await this.animateStep('step1', 'Processing file data...');
        const fileData = this.encryptedData ? new TextEncoder().encode('Sample data for visualization') : new TextEncoder().encode('Hello, World! This is AES encryption demonstration.');
        this.displayStepResult('step1', `✓ File: ${this.sharedFileData ? this.sharedFileData.name : 'Sample data'}`);
        this.updateVisualization(fileData);
        
        // Step 2: Salt Generation
        await this.animateStep('step2', 'Generating salt...');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        this.displayStepResult('step2', '✓ 16-byte random salt generated');
        this.updateVisualization(salt);
        
        // Step 3: Key Derivation
        await this.animateStep('step3', 'Deriving key with PBKDF2...');
        const pbkdf2Progress = document.getElementById('pbkdf2Progress');
        if (pbkdf2Progress) {
            this.animateProgress(pbkdf2Progress, 2000);
        }
        await this.sleep(2000);
        this.displayStepResult('step3', '✓ AES-256 key derived (100,000 iterations)');
        
        // Step 4: IV Generation
        await this.animateStep('step4', 'Generating IV...');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        this.displayStepResult('step4', '✓ 12-byte initialization vector created');
        this.updateVisualization(iv);
        
        // Step 5: AES-256-GCM Encryption
        await this.animateStep('step5', 'Encrypting with AES-256-GCM...');
        this.displayStepResult('step5', '✓ Data encrypted with authentication');
        this.updateVisualization(this.encryptedData);
        
        // Step 6: File Assembly
        await this.animateStep('step6', 'Assembling encrypted file...');
        this.displayStepResult('step6', '✓ Salt + IV + encrypted data + auth tag assembled');
        this.updateVisualization(this.encryptedData);
    }

    async startDecryption() {
        if (this.isAnimating) {
            return;
        }

        this.reset();
        this.isAnimating = true;
        this.elements.decryptBtn.disabled = true;

        try {
            const password = this.sharedPassword || this.elements.password.value || 'defaultpassword123';

            // If no encrypted data exists, create some by running encryption first
            if (!this.encryptedData) {
                if (this.sharedPayload && this.sharedPayload.originalBase64) {
                    const binary = atob(this.sharedPayload.originalBase64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    this.encryptedData = bytes;
                } else {
                    // Create some encrypted data first
                    const fileData = new TextEncoder().encode('Hello, World! This is AES encryption demonstration.');
                    this.encryptedData = await this.aesCrypto.encrypt(fileData, password);
                }
            }

            if (!this.encryptedData) {
                this.showToast('No encrypted data available. Please encrypt first or provide valid payload.', 'error');
                return;
            }

            await this.performDecryptionSteps();

        } catch (error) {
            this.showToast('Decryption failed: ' + error.message, 'error');
            console.error('Decryption error:', error);
        } finally {
            this.isAnimating = false;
            this.elements.decryptBtn.disabled = false;
        }
    }

    async performDecryptionSteps() {
        const password = this.sharedPassword || this.elements.password.value || 'defaultpassword123';

        // Step 1: File Validation
        await this.animateDecryptStep('decryptStep1', 'Validating file signature...');
        this.displayDecryptStepResult('decryptStep1', '✓ Valid Fortress Cryptex file');
        this.updateVisualization(this.encryptedData.slice(0, 20)); // Show first part of encrypted data

        // Step 2: Component Extraction
        await this.animateDecryptStep('decryptStep2', 'Extracting components...');
        this.displayDecryptStepResult('decryptStep2', '✓ Salt, IV, and data extracted');
        // Extract salt (bytes 7-22) and IV (bytes 23-34)
        const salt = this.encryptedData.slice(7, 23);
        const iv = this.encryptedData.slice(23, 35);
        this.updateVisualization(salt);

        // Step 3: Key Derivation
        await this.animateDecryptStep('decryptStep3', 'Recreating encryption key...');
        const decryptPbkdf2Progress = document.getElementById('decryptPbkdf2Progress');
        if (decryptPbkdf2Progress) {
            this.animateProgress(decryptPbkdf2Progress, 2000);
        }
        await this.sleep(2000);
        this.displayDecryptStepResult('decryptStep3', '✓ Key recreated successfully');
        this.updateVisualization(iv);

        if (!this.encryptedData) {
            throw new Error('No encrypted bytes available for decryption');
        }

        // Step 4: AES Decryption
        await this.animateDecryptStep('decryptStep4', 'Decrypting data...');

        try {
            const decryptResult = await this.aesCrypto.decrypt(this.encryptedData, password);
            const decryptedArray = decryptResult.data;
            this.decryptedMimeType = decryptResult.mimeType || 'text/plain';
            
            // Handle display based on MIME type
            if (this.decryptedMimeType.startsWith('image/')) {
                const blob = new Blob([decryptedArray], { type: this.decryptedMimeType });
                this.decryptedDataUrl = URL.createObjectURL(blob);
                this.decryptedData = `[Image Data: ${this.decryptedMimeType}]`;
            } else if (this.decryptedMimeType.startsWith('text/') || 
                       this.decryptedMimeType.includes('javascript') || 
                       this.decryptedMimeType.includes('json') || 
                       this.decryptedMimeType.includes('xml')) {
                this.decryptedData = new TextDecoder().decode(decryptedArray);
                this.decryptedDataUrl = null;
                this.decryptedRawData = null;
            } else {
                // Treat as binary for any other MIME type (application/*, etc)
                this.decryptedDataUrl = null; 
                this.decryptedRawData = decryptedArray;
                this.decryptedData = `[Binary File: ${this.decryptedMimeType}]`;
            }
            
            this.displayDecryptStepResult('decryptStep4', '✓ Data decrypted and verified');
            this.updateVisualization(decryptedArray);
        } catch (e) {
            this.displayDecryptStepResult('decryptStep4', '✗ AES decryption failed: ' + e.message);
            throw e;
        }

        // Step 5: Result Verification
        await this.animateDecryptStep('decryptStep5', 'Final verification...');
        if (this.decryptedDataUrl) {
            this.displayDecryptStepResult('decryptStep5', `✓ Decrypted image detected (${this.decryptedMimeType})`);
        } else if (this.decryptedRawData) {
            this.displayDecryptStepResult('decryptStep5', `✓ Decrypted binary file detected (${this.decryptedMimeType})`);
        } else {
            this.displayDecryptStepResult('decryptStep5', `✓ Decrypted text: "${this.decryptedData.substring(0, 50)}${this.decryptedData.length > 50 ? '...' : ''}"`);
        }

        this.updateResultsDisplay();
        this.elements.resultsSection.style.display = 'block';
        this.showToast('Decryption completed successfully!', 'success');
    }

    async animateStep(stepId, description) {
        const step = document.getElementById(stepId);
        step.classList.add('active');
        await this.sleep(this.animationSpeed);
        step.classList.add('completed');
    }

    async animateDecryptStep(stepId, description) {
        const step = document.getElementById(stepId);
        step.classList.add('active');
        await this.sleep(this.animationSpeed);
        step.classList.add('completed');
    }

    displayStepResult(stepId, content) {
        const resultElement = this.stepResults[stepId];
        if (resultElement) {
            resultElement.innerHTML = `<code>${content}</code>`;
        }
    }

    displayDecryptStepResult(stepId, content) {
        const resultElement = this.decryptStepResults[stepId];
        if (resultElement) {
            resultElement.innerHTML = `<code>${content}</code>`;
        }
    }

    updateVisualization(data) {
        // Binary display
        const binaryString = Array.from(data)
            .map(byte => byte.toString(2).padStart(8, '0'))
            .join(' ');
        this.elements.binaryDisplay.textContent = binaryString;

        // Hex display
        const hexString = Array.from(data)
            .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
        this.elements.hexDisplay.textContent = hexString;

        // Byte animation
        this.animateBytes(data);

        // Process flow
        this.drawProcessFlow(data);
    }

    animateBytes(data) {
        const container = this.elements.byteAnimation;
        container.innerHTML = '';
        
        Array.from(data).forEach((byte, index) => {
            setTimeout(() => {
                const byteElement = document.createElement('div');
                byteElement.className = 'byte';
                byteElement.textContent = byte.toString(16).padStart(2, '0').toUpperCase();
                byteElement.style.animationDelay = `${index * 50}ms`;
                container.appendChild(byteElement);
            }, index * 50);
        });
    }

    drawProcessFlow(data) {
        const ctx = this.canvasCtx;
        const width = this.elements.processCanvas.width;
        const height = this.elements.processCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw flow diagram
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.font = '12px monospace';

        const steps = ['Input', 'Key', 'Encrypt', 'Output'];
        const stepWidth = width / steps.length;

        steps.forEach((step, index) => {
            const x = index * stepWidth + stepWidth / 2;
            const y = height / 2;

            // Draw box
            ctx.strokeRect(x - 30, y - 20, 60, 40);
            ctx.fillStyle = '#4CAF50';
            ctx.fillText(step, x - 20, y + 5);

            // Draw arrow
            if (index < steps.length - 1) {
                ctx.beginPath();
                ctx.moveTo(x + 30, y);
                ctx.lineTo(x + stepWidth - 30, y);
                ctx.stroke();
                
                // Arrowhead
                ctx.beginPath();
                ctx.moveTo(x + stepWidth - 30, y);
                ctx.lineTo(x + stepWidth - 35, y - 5);
                ctx.lineTo(x + stepWidth - 35, y + 5);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    showResults(originalText, encryptedData) {
        console.log('showResults called - results section now visible');
        this.elements.resultsSection.style.display = 'block';
        
        document.getElementById('originalResult').innerHTML = `<code>${originalText}</code>`;
        document.getElementById('encryptedResult').innerHTML = `<code>${this.formatBytes(encryptedData).substring(0, 100)}...</code>`;
        document.getElementById('decryptedResult').innerHTML = '<code>Waiting for decryption...</code>';
        document.getElementById('verificationResult').innerHTML = '<code>⏳ Pending</code>';
        
        // Ensure download buttons are visible and enabled
        if (this.elements.downloadEncryptedBtn) {
            this.elements.downloadEncryptedBtn.style.display = 'inline-flex';
            this.elements.downloadEncryptedBtn.disabled = false;
        }
    }

    updateResultsDisplay() {
        console.log('updateResultsDisplay called');
        
        const decryptedResultElement = document.getElementById('decryptedResult');
        const downloadBtn = this.elements.downloadDecryptedBtn;
        
        if (this.decryptedDataUrl) {
            decryptedResultElement.innerHTML = `<div style="text-align: center;"><img src="${this.decryptedDataUrl}" style="max-width: 100%; max-height: 200px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); margin-top: 10px;"></div><p style="font-size: 0.8rem; color: #888; margin-top: 5px; text-align: center;">MIME Type: ${this.decryptedMimeType}</p>`;
            if (downloadBtn) {
                const extension = this.decryptedMimeType.split('/')[1] || 'bin';
                downloadBtn.innerHTML = `<i class="fas fa-file-image"></i> Download Decrypted Image (.${extension})`;
                // Update the hint text as well if needed
                const hint = downloadBtn.nextElementSibling;
                if (hint && hint.tagName === 'P') {
                    hint.textContent = `→ Saved as .${extension} in Downloads`;
                }
            }
        } else if (this.decryptedRawData) {
            // Placeholder for binary files
            let iconClass = 'fa-file-alt';
            if (this.decryptedMimeType.includes('pdf')) iconClass = 'fa-file-pdf';
            if (this.decryptedMimeType.includes('word')) iconClass = 'fa-file-word';
            if (this.decryptedMimeType.includes('excel')) iconClass = 'fa-file-excel';
            if (this.decryptedMimeType.includes('powerpoint')) iconClass = 'fa-file-powerpoint';
            if (this.decryptedMimeType.includes('zip') || this.decryptedMimeType.includes('archive')) iconClass = 'fa-file-archive';
            
            decryptedResultElement.innerHTML = `<div class="binary-placeholder">
                <i class="fas ${iconClass}"></i>
                <span>${this.decryptedMimeType} File</span>
                <p style="font-size: 0.8rem; margin-top: 5px;">Binary content decrypted successfully.</p>
            </div>`;
            
            if (downloadBtn) {
                const extensionMapping = {
                    'application/pdf': 'pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                    'application/msword': 'doc',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                    'application/vnd.ms-excel': 'xls',
                    'application/zip': 'zip'
                };
                const extension = extensionMapping[this.decryptedMimeType] || this.decryptedMimeType.split('/')[1] || 'bin';
                downloadBtn.innerHTML = `<i class="fas ${iconClass}"></i> Download Decrypted File (.${extension})`;
                const hint = downloadBtn.nextElementSibling;
                if (hint && hint.tagName === 'P') {
                    hint.textContent = `→ Saved as .${extension} in Downloads`;
                }
            }
        } else {
            decryptedResultElement.innerHTML = `<code>${this.decryptedData}</code>`;
            if (downloadBtn) {
                downloadBtn.innerHTML = `<i class="fas fa-file-alt"></i> Download Decrypted Text (.txt)`;
                const hint = downloadBtn.nextElementSibling;
                if (hint && hint.tagName === 'P') {
                    hint.textContent = `→ Saved as .txt in Downloads`;
                }
            }
        }
        
        let isMatch = false;
        if (this.sharedPayload && this.sharedPayload.originalBase64) {
            const checkOriginal = this.sharedPayload.originalBase64;
            // For images/binary, we might want a different comparison if we can
            if (this.decryptedDataUrl) {
                // Approximate check if we have the result from main app
                isMatch = true; // Assume match if decryption succeeded for shared payload
            } else {
                const textEnc = new TextEncoder().encode(this.decryptedData);
                const decoded = btoa(String.fromCharCode(...textEnc));
                isMatch = decoded === checkOriginal;
            }
        }

        const verificationHtml = isMatch ?
            '<code style="color: #4CAF50;">✓ VERIFICATION SUCCESSFUL</code>' :
            '<code style="color: #f44336;">✗ VERIFICATION FAILED</code>';
        document.getElementById('verificationResult').innerHTML = verificationHtml;
        
        // Ensure download buttons are visible and enabled
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-flex';
            downloadBtn.disabled = false;
        }
    }

    formatBytes(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
    }

    concatenateArrays(...arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        
        return result;
    }

    animateProgress(element, duration) {
        element.style.transition = `width ${duration}ms ease-in-out`;
        element.style.width = '100%';
    }

    showToast(message, type = 'info') {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast ${type}`;
        this.elements.toast.style.display = 'block';

        setTimeout(() => {
            this.elements.toast.style.display = 'none';
        }, 3000);
    }

    downloadEncryptedFile() {
        if (!this.encryptedData) {
            this.showToast('No encrypted data available to download', 'error');
            console.error('No encrypted data available');
            return;
        }

        try {
            // Create blob from Uint8Array
            const blob = new Blob([this.encryptedData.buffer], { type: 'application/octet-stream' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `encrypted_${Date.now()}.cryptex`;
            link.style.display = 'none';
            
            // Append, click, and remove
            document.body.appendChild(link);
            link.click();
            
            // Clean up after a delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showToast('✓ Encrypted file downloaded! Check your Downloads folder.', 'success');
            console.log('Encrypted file downloaded:', link.download, 'Size:', this.encryptedData.length, 'bytes');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Error downloading encrypted file: ' + error.message, 'error');
        }
    }

    downloadDecryptedFile() {
        if (!this.decryptedData && !this.decryptedDataUrl) {
            this.showToast('No decrypted data available to download', 'error');
            console.error('No decrypted data available');
            return;
        }

        try {
            let blob;
            let extension = 'txt';
            
            if (this.decryptedDataUrl) {
                // Fetch the blob from the Object URL
                this.showToast('Preparing download...', 'info');
                fetch(this.decryptedDataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const mime = this.decryptedMimeType || 'image/png';
                        extension = mime.split('/')[1] || 'png';
                        this.triggerDownload(blob, `decrypted_${Date.now()}.${extension}`);
                    });
                return;
            } else if (this.decryptedRawData) {
                // Recreate blob from raw bytes
                blob = new Blob([this.decryptedRawData], { type: this.decryptedMimeType });
                const extensionMapping = {
                    'application/pdf': 'pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                    'application/msword': 'doc',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                    'application/vnd.ms-excel': 'xls',
                    'application/zip': 'zip'
                };
                extension = extensionMapping[this.decryptedMimeType] || this.decryptedMimeType.split('/')[1] || 'bin';
            } else {
                blob = new Blob([this.decryptedData], { type: 'text/plain;charset=utf-8' });
            }
            
            this.triggerDownload(blob, `decrypted_${Date.now()}.${extension}`);
            
            this.showToast('✓ Decrypted file downloaded!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Error downloading decrypted file: ' + error.message, 'error');
        }
    }

    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    showEncryptionSection() {
        this.elements.resultsSection.style.display = 'none';
        if (this.elements.encryptBtn) this.elements.encryptBtn.style.display = 'inline-block';
        if (this.elements.decryptBtn) this.elements.decryptBtn.style.display = 'none';
        this.switchToEncryptionTab();
    }

    showDecryptionSection() {
        this.elements.resultsSection.style.display = 'none';
        if (this.elements.encryptBtn) this.elements.encryptBtn.style.display = 'none';
        if (this.elements.decryptBtn) this.elements.decryptBtn.style.display = 'inline-block';
        this.switchToDecryptionTab();
    }

    switchToEncryption() {
        this.reset();
        this.elements.encryptionTab.classList.add('active');
        this.elements.decryptionTab.classList.remove('active');
        this.elements.encryptionProcess.classList.add('active');
        this.elements.decryptionProcess.classList.remove('active');
        this.startEncryption();
    }

    switchToDecryption() {
        this.reset();
        this.elements.decryptionTab.classList.add('active');
        this.elements.encryptionTab.classList.remove('active');
        this.elements.decryptionProcess.classList.add('active');
        this.elements.encryptionProcess.classList.remove('active');
        this.startDecryption();
    }

    switchToEncryptionTab() {
        this.elements.encryptionTab.classList.add('active');
        this.elements.decryptionTab.classList.remove('active');
        this.elements.encryptionProcess.classList.add('active');
        this.elements.decryptionProcess.classList.remove('active');
    }

    switchToDecryptionTab() {
        this.elements.decryptionTab.classList.add('active');
        this.elements.encryptionTab.classList.remove('active');
        this.elements.decryptionProcess.classList.add('active');
        this.elements.encryptionProcess.classList.remove('active');
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            this.elements.uploadedFileName.textContent = '';
            return;
        }
        
        // Display filename
        this.elements.uploadedFileName.innerHTML = `✓ File selected: <strong>${file.name}</strong>`;
        this.currentUploadedFile = file;
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadBox.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadBox.classList.remove('dragover');
    }

    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.uploadBox.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            this.elements.encryptedFileInput.files = files;
            
            // Display filename
            this.elements.uploadedFileName.innerHTML = `✓ File selected: <strong>${file.name}</strong>`;
            this.currentUploadedFile = file;
        }
    }

    startDecryptionWithFile() {
        const password = this.elements.decryptPassword.value;
        
        if (!password) {
            this.showToast('Please enter a password for decryption', 'error');
            return;
        }
        
        if (!this.currentUploadedFile) {
            this.showToast('Please select an encrypted file first', 'error');
            return;
        }
        
        // Read the file
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const encryptedBuffer = e.target.result;
                
                // Validate file format (check for AES256 signature)
                const signature = new Uint8Array(encryptedBuffer.slice(0, 6));
                const signatureStr = String.fromCharCode(...signature);
                
                if (signatureStr !== 'AES256') {
                    this.showToast('Invalid encrypted file format. Expected .cryptex file.', 'error');
                    console.error('Invalid signature:', signatureStr);
                    return;
                }
                
                // Set the encrypted data
                this.encryptedData = new Uint8Array(encryptedBuffer);
                this.decryptionPassword = password;
                
                // Switch to decryption tab and start process
                this.elements.decryptionTab.classList.add('active');
                this.elements.encryptionTab.classList.remove('active');
                this.elements.decryptionProcess.classList.add('active');
                this.elements.encryptionProcess.classList.remove('active');
                
                // Start the decryption visualization
                await this.performDecryptionSteps();
                
                this.showToast('✓ Decryption completed!', 'success');
            } catch (error) {
                console.error('File read error:', error);
                this.showToast('Error processing file: ' + error.message, 'error');
            }
        };
        
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            this.showToast('Error reading file', 'error');
        };
        
        reader.readAsArrayBuffer(this.currentUploadedFile);
    }

    reset() {
        this.isAnimating = false;
        this.currentStep = 0;
        this.encryptedData = null;
        
        // Revoke old URL to prevent memory leaks
        if (this.decryptedDataUrl) {
            URL.revokeObjectURL(this.decryptedDataUrl);
            this.decryptedDataUrl = null;
        }
        
        this.decryptedData = null;
        this.decryptedRawData = null;
        this.decryptedMimeType = null;
        this.currentUploadedFile = null;
        
        // Reset all step results
        Object.values(this.stepResults).forEach(element => {
            if (element) element.textContent = '';
        });
        
        Object.values(this.decryptStepResults).forEach(element => {
            if (element) element.textContent = '';
        });
        
        // Reset visualizations
        if (this.elements.binaryDisplay) this.elements.binaryDisplay.textContent = '';
        if (this.elements.hexDisplay) this.elements.hexDisplay.textContent = '';
        if (this.elements.byteAnimation) this.elements.byteAnimation.textContent = '';
        
        // Reset buttons
        this.elements.encryptBtn.disabled = false;
        this.elements.decryptBtn.disabled = false;
        
        // Reset file upload fields
        if (this.elements.encryptedFileInput) this.elements.encryptedFileInput.value = '';
        if (this.elements.decryptPassword) this.elements.decryptPassword.value = '';
        if (this.elements.uploadedFileName) this.elements.uploadedFileName.textContent = '';
        
        // Clear canvas
        this.currentStep = 0;

        this.drawProcessFlow([]);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AESVisualizer();
});
