# AES Visualizer - Download Guide

## How Downloads Work (Client-Side Only)

All encryption and decryption happens **100% in your browser** - nothing is sent to any server!

### Downloading Encrypted Files

1. **Click "Encryption" Tab** 
   - The encryption process starts automatically
   
2. **Scroll to "Final Results" Section**
   - You'll see 4 cards: Original Data, Encrypted Data, Decrypted Data, and Verification

3. **Click "Download Encrypted File (.cryptex)"**
   - The file will be downloaded to your **Downloads folder**
   - File name: `encrypted_[timestamp].cryptex`

### Downloading Decrypted Files

1. **Click "Decryption" Tab**
   - The decryption process starts automatically
   
2. **Scroll to "Final Results" Section**

3. **Click "Download Decrypted File (.txt)"**
   - The file will be downloaded to your **Downloads folder**
   - File name: `decrypted_[timestamp].txt`

---

## Where Are My Downloads?

### Windows:
```
C:\Users\[YourUsername]\Downloads\
```

### Mac:
```
~/Downloads/
```

### Linux:
```
~/Downloads/
```

---

## Troubleshooting

### Files Not Appearing?

1. **Check Downloads Folder Location:**
   - The default browser download location is your Downloads folder
   - You can check in browser settings where downloads are saved

2. **Verify the Process Completed:**
   - Make sure you see the "Final Results" section
   - The download button should be green and clickable
   - Look for a success message (checkmark notification)

3. **Check Console for Errors:**
   - Open Developer Tools (F12 or Right-click → Inspect)
   - Go to "Console" tab
   - Look for any error messages
   - The console will show the file name and size when downloaded

4. **Browser-Specific Issues:**
   - **Chrome/Edge:** Check if pop-ups are blocked (downloads might be hidden in the top-right)
   - **Firefox:** Check if you need to grant download permission
   - **Safari:** Check if "Ask where to save each file" is enabled

---

## File Information

### Encrypted Files (.cryptex)
- Format: Binary encrypted data
- Contains: Signature + Version + Salt + IV + Encrypted Data
- Can only be decrypted with the correct password
- The file includes all necessary data for decryption (salt & IV are embedded)

### Decrypted Files (.txt)
- Format: Plain text
- Contains: The original message/text
- Can be opened with any text editor
- Timestamps are added to filenames to avoid overwrites

---

## Security Notes

- ✅ All encryption/decryption happens **in your browser** (client-side)
- ✅ No data is sent to any server
- ✅ No internet connection needed after page is loaded
- ✅ Files are processed locally on your machine
- ✅ Each download uses a timestamped filename to prevent overwrites

---

## Tips

1. **Test the System:**
   - First encrypt some test text
   - Download the encrypted file
   - Then decrypt and download the decrypted file
   - Compare them to verify everything works

2. **Batch Encryption:**
   - You can encrypt multiple files from the main "Encrypt" tab
   - Switch to "Visualizer" to see the detailed step-by-step process

3. **Multiple Downloads:**
   - Each click generates a new timestamped file
   - This prevents accidental overwrites
   - You can compare different encryption results

---

## Need Help?

If downloads still don't appear:
1. Open Developer Console (F12)
2. Re-run the encryption/decryption
3. Check the console output for error messages
4. Share those error messages for troubleshooting

---

**Enjoy secure, client-side encryption! 🔐**
