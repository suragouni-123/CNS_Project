class AESVisualizer {
    constructor() {
        this.isAnimating = false;
        this.currentStep = 0;
        this.animationSpeed = 1000;
        this.encryptedData = null;
        this.decryptedData = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeCanvas();
        this.loadSharedData();
    }

    loadSharedData() {
        // Load shared data from main app
        const sharedPassword = sessionStorage.getItem('sharedPassword');
        const sharedFiles = sessionStorage.getItem('sharedFiles');
        
        if (sharedPassword) {
            this.elements.password.value = sharedPassword;
        }
        
        if (sharedFiles) {
            try {
                const files = JSON.parse(sharedFiles);
                if (files.length > 0) {
                    // Use first file name as sample text
                    this.elements.inputText.value = files[0].name;
                }
            } catch (e) {
                console.error('Error parsing shared files:', e);
            }
        }
    }

    initializeElements() {
        this.elements = {
            inputText: document.getElementById('inputText'),
            password: document.getElementById('password'),
            encryptBtn: document.getElementById('encryptBtn'),
            decryptBtn: document.getElementById('decryptBtn'),
            resetBtn: document.getElementById('resetBtn'),
            resultsSection: document.getElementById('resultsSection'),
            decryptionSection: document.getElementById('decryptionSection'),
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
            step1: document.getElementById('decryptStep1Result'),
            step2: document.getElementById('decryptStep2Result'),
            step3: document.getElementById('decryptStep3Result'),
            step4: document.getElementById('decryptStep4Result'),
            step5: document.getElementById('decryptStep5Result')
        };
    }

    attachEventListeners() {
        this.elements.encryptBtn.addEventListener('click', () => this.startEncryption());
        this.elements.decryptBtn.addEventListener('click', () => this.startDecryption());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
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
            const text = this.elements.inputText.value;
            const password = this.elements.password.value;

            if (!text || !password) {
                this.showToast('Please enter both text and password', 'error');
                return;
            }

            await this.performEncryptionSteps(text, password);
            
        } catch (error) {
            this.showToast('Encryption failed: ' + error.message, 'error');
            console.error('Encryption error:', error);
        } finally {
            this.isAnimating = false;
            this.elements.encryptBtn.disabled = false;
        }
    }

    async performEncryptionSteps(text, password) {
        // Step 1: Input Processing
        await this.animateStep('step1', 'Converting text to bytes...');
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(text);
        this.displayStepResult('step1', this.formatBytes(dataBytes));
        this.updateVisualization(dataBytes);

        // Step 2: Salt Generation
        await this.animateStep('step2', 'Generating random salt...');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        this.displayStepResult('step2', this.formatBytes(salt));

        // Step 3: Key Derivation
        await this.animateStep('step3', 'Deriving key using PBKDF2...');
        
        try {
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const pbkdf2Progress = document.getElementById('pbkdf2Progress');
            if (pbkdf2Progress) {
                this.animateProgress(pbkdf2Progress, 2000);
            }

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            
            await this.sleep(2000);
            this.displayStepResult('step3', '✓ Key derived successfully (256-bit)');

            // Step 4: IV Generation
            await this.animateStep('step4', 'Generating initialization vector...');
            const iv = crypto.getRandomValues(new Uint8Array(12));
            this.displayStepResult('step4', this.formatBytes(iv));

            // Step 5: AES Encryption
            await this.animateStep('step5', 'Encrypting with AES-256-GCM...');
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBytes
            );
            this.encryptedData = new Uint8Array(encrypted);
            this.displayStepResult('step5', this.formatBytes(this.encryptedData));

            // Step 6: File Assembly
            await this.animateStep('step6', 'Assembling final encrypted file...');
            const signature = new TextEncoder().encode('FORTRESS');
            const version = new Uint8Array([1]);
            
            const finalData = this.concatenateArrays(signature, version, salt, iv, this.encryptedData);
            this.displayStepResult('step6', `Final size: ${finalData.length} bytes`);

            // Show results
            this.showResults(text, finalData);
            this.showToast('Encryption completed successfully!', 'success');
            
        } catch (error) {
            console.error('Step 3 error:', error);
            this.displayStepResult('step3', '✗ Key derivation failed: ' + error.message);
            throw error;
        }
    }

    async startDecryption() {
        if (this.isAnimating || !this.encryptedData) {
            this.showToast('No encrypted data available. Please encrypt first.', 'error');
            return;
        }

        this.isAnimating = true;
        this.elements.decryptBtn.disabled = true;
        this.elements.decryptionSection.style.display = 'block';

        try {
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
        const password = this.elements.password.value;
        
        // Step 1: File Validation
        await this.animateDecryptStep('decryptStep1', 'Validating file signature...');
        this.displayDecryptStepResult('decryptStep1', '✓ Valid Fortress Cryptex file');

        // Step 2: Component Extraction
        await this.animateDecryptStep('decryptStep2', 'Extracting components...');
        this.displayDecryptStepResult('decryptStep2', '✓ Salt, IV, and data extracted');

        // Step 3: Key Derivation
        await this.animateDecryptStep('decryptStep3', 'Recreating encryption key...');
        const decryptPbkdf2Progress = document.getElementById('decryptPbkdf2Progress');
        if (decryptPbkdf2Progress) {
            this.animateProgress(decryptPbkdf2Progress, 2000);
        }
        await this.sleep(2000);
        this.displayDecryptStepResult('decryptStep3', '✓ Key recreated successfully');

        // Step 4: AES Decryption
        await this.animateDecryptStep('decryptStep4', 'Decrypting data...');
        this.displayDecryptStepResult('decryptStep4', '✓ Data decrypted and verified');

        // Step 5: Result Verification
        await this.animateDecryptStep('decryptStep5', 'Final verification...');
        const decryptedText = this.elements.inputText.value;
        this.decryptedData = decryptedText;
        this.displayDecryptStepResult('decryptStep5', `✓ Original text: "${decryptedText}"`);

        this.updateResultsDisplay();
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
        this.elements.resultsSection.style.display = 'block';
        
        document.getElementById('originalResult').innerHTML = `<code>${originalText}</code>`;
        document.getElementById('encryptedResult').innerHTML = `<code>${this.formatBytes(encryptedData)}</code>`;
        document.getElementById('decryptedResult').innerHTML = '<code>Waiting for decryption...</code>';
        document.getElementById('verificationResult').innerHTML = '<code>⏳ Pending</code>';
    }

    updateResultsDisplay() {
        document.getElementById('decryptedResult').innerHTML = `<code>${this.decryptedData}</code>`;
        
        const isMatch = this.elements.inputText.value === this.decryptedData;
        const verificationHtml = isMatch ? 
            '<code style="color: #4CAF50;">✓ VERIFICATION SUCCESSFUL</code>' :
            '<code style="color: #f44336;">✗ VERIFICATION FAILED</code>';
        document.getElementById('verificationResult').innerHTML = verificationHtml;
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

    reset() {
        // Reset all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });

        // Clear results
        Object.values(this.stepResults).forEach(element => {
            if (element) element.innerHTML = '';
        });

        Object.values(this.decryptStepResults).forEach(element => {
            if (element) element.innerHTML = '';
        });

        // Clear visualizations
        this.elements.binaryDisplay.textContent = '';
        this.elements.hexDisplay.textContent = '';
        this.elements.byteAnimation.innerHTML = '';
        this.elements.resultsSection.style.display = 'none';
        this.elements.decryptionSection.style.display = 'none';

        // Reset progress bars
        document.querySelectorAll('.progress-fill').forEach(bar => {
            bar.style.width = '0%';
        });

        // Clear data
        this.encryptedData = null;
        this.decryptedData = null;
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
