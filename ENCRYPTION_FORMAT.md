# AES File Encryption Format Documentation

## 🔐 Improved Encryption Format

The encrypted files now use a structured format that ensures proper identification and validation.

### File Structure

```
[6 bytes] Signature: "AES256"
[1 byte]  Version: 1
[16 bytes] Salt (random)
[12 bytes] IV (random)
[Variable] Encrypted Data
```

**Total Header Size:** 35 bytes

### Format Details

#### 1. Signature (6 bytes)
- **Value**: "AES256" (ASCII)
- **Purpose**: Identifies the file as an AES encrypted file
- **Validation**: Prevents attempting to decrypt non-encrypted files

#### 2. Version (1 byte)  
- **Value**: 1
- **Purpose**: Format version for future compatibility
- **Range**: 1-255

#### 3. Salt (16 bytes)
- **Type**: Cryptographically secure random bytes
- **Purpose**: Key derivation with PBKDF2
- **Security**: Prevents rainbow table attacks

#### 4. IV/Nonce (12 bytes)
- **Type**: Cryptographically secure random bytes  
- **Purpose**: AES-GCM initialization vector
- **Security**: Ensures unique encryption for same data

#### 5. Encrypted Data (Variable)
- **Algorithm**: AES-256-GCM
- **Authentication**: Built-in GCM authentication tag
- **Size**: Same as original data + 16 bytes (GCM tag)

### Security Features

#### 🔒 Key Derivation
- **Algorithm**: PBKDF2
- **Iterations**: 100,000
- **Hash**: SHA-256
- **Output**: 256-bit key

#### 🛡️ Encryption
- **Mode**: GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **Authentication**: Built-in integrity protection
- **Padding**: Not required (GCM is stream-like)

### File Extensions

#### Encrypted Files
- **Extension**: `.aes256`
- **MIME Type**: `application/octet-stream`
- **Example**: `document.pdf.aes256`

#### Decrypted Files  
- **Extension**: `.decrypted` (temporary)
- **Final**: Original extension restored

### Validation Process

#### Encryption Validation
1. Generate secure random salt and IV
2. Derive key using PBKDF2
3. Encrypt data with AES-256-GCM
4. Assemble file with proper header
5. Return complete encrypted file

#### Decryption Validation
1. Check file signature ("AES256")
2. Verify version compatibility
3. Extract salt, IV, and encrypted data
4. Derive key using extracted salt
5. Decrypt and verify integrity
6. Return original data

### Error Handling

#### Common Errors
- **"Invalid encrypted file format"**: File doesn't have "AES256" signature
- **"File too small"**: File is smaller than 35 bytes (minimum header size)
- **"Unsupported version"**: File was created with different format version
- **"Decryption failed"**: Wrong password or corrupted file

#### Security Considerations
- **No password hints**: Errors don't reveal if password is partially correct
- **Timing attack protection**: Consistent error handling
- **Memory security**: Sensitive data cleared when possible

### Examples

#### Test Encryption
```javascript
const data = new TextEncoder().encode("Hello, World!");
const encrypted = await aesCrypto.encrypt(data, "password123");
// Result: Uint8Array with proper format
```

#### Test Decryption
```javascript
const decrypted = await aesCrypto.decrypt(encrypted, "password123");
// Result: Original "Hello, World!" data
```

### Browser Compatibility

#### Required APIs
- **Web Crypto API**: For encryption operations
- **Typed Arrays**: For binary data handling
- **Blob API**: For file downloads

#### Supported Browsers
- ✅ Chrome 37+
- ✅ Firefox 34+
- ✅ Safari 7+
- ✅ Edge 12+
- ❌ Internet Explorer

### Migration from Old Format

#### Old Format Issues
- No file signature
- No version information
- Basic salt+IV+data structure
- Poor error messages

#### New Format Benefits
- ✅ Proper file identification
- ✅ Version compatibility
- ✅ Better error handling
- ✅ Enhanced security
- ✅ Detailed logging

#### Migration Steps
1. Old encrypted files won't work with new format
2. Re-encrypt files with new version
3. Use `.aes256` extension for clarity
4. Update any automation scripts

### Debug Information

#### Console Logging
The improved version includes detailed console logging:
- Encryption progress
- Component sizes
- Format validation
- Error details

#### File Analysis
Use `test_encryption.html` to:
- Verify encryption/decryption
- Test file format
- Validate error handling
- Check compatibility

### Security Best Practices

#### Password Security
- Use strong, unique passwords
- Minimum 8 characters recommended
- Include uppercase, lowercase, numbers, special characters

#### File Handling
- Encrypt sensitive files before sharing
- Store passwords securely
- Delete original files after encryption
- Verify decryption before deleting originals

#### Operational Security
- Use HTTPS if sharing encrypted files
- Consider file compression before encryption
- Keep software updated
- Regular security audits

---

**Format Version**: 1.0  
**Last Updated**: 2024  
**Compatibility**: Web Crypto API browsers
