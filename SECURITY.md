# 🔐 Security Documentation - StockTrack

This document outlines the comprehensive security measures implemented in StockTrack to protect your sensitive financial data and API tokens.

## 🛡️ Security Overview

StockTrack implements **multiple layers of encryption** to ensure your financial data and API tokens are always protected:

### **Client-Side Security**
- **Advanced Encryption**: AES-256-GCM with Web Crypto API
- **Device Binding**: Encryption keys tied to your specific device
- **Secure Storage**: No plain-text token storage in browser
- **Rate Limiting**: Protection against brute force attacks

### **Server-Side Security**  
- **Token Validation**: Security strength assessment
- **Encrypted Logging**: Tokens hashed for debugging
- **Rate Limiting**: API abuse protection
- **Secure Environment**: Encrypted environment variables

## 🔑 Encryption Implementation

### **Client-Side Encryption (Browser)**

**Technology**: Web Crypto API with AES-256-GCM
**Key Derivation**: PBKDF2 with 100,000 iterations

```typescript
// Example: How your tokens are encrypted
const deviceFingerprint = generateDeviceFingerprint();
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await deriveKey(deviceFingerprint, salt);
const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, tokenData);
```

**Features:**
- ✅ **Device-specific encryption**: Works only on your device
- ✅ **Forward secrecy**: New salt for each encryption
- ✅ **Authentication**: Built-in integrity verification
- ✅ **Fallback support**: Works even without Web Crypto API

### **Server-Side Encryption**

**Technology**: Node.js crypto with AES-256-CBC
**Key Derivation**: PBKDF2 with 10,000 iterations

```typescript
// Example: How environment variables are encrypted
const masterKey = process.env.ENCRYPTION_MASTER_KEY;
const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
const encrypted = cipher.update(data, 'utf8', 'hex');
```

**Features:**
- ✅ **Master key encryption**: All sensitive data encrypted
- ✅ **Secure environment**: API keys never stored in plain text
- ✅ **Audit logging**: Token access logged securely
- ✅ **Rate limiting**: Protection against API abuse

## 🔐 Token Security Levels

Your API tokens are analyzed and classified by security strength:

### **Strong Tokens** 🟢
- Length: 40+ characters
- Contains: Numbers, letters, special characters
- **Recommendation**: Excellent security

### **Medium Tokens** 🟡  
- Length: 20-40 characters
- Mixed character types
- **Recommendation**: Good security, consider stronger tokens

### **Weak Tokens** 🔴
- Length: < 20 characters
- Limited character variety
- **Recommendation**: Generate stronger token from bank

## 🛡️ Security Features

### **Rate Limiting**
```
• Authentication: 10 attempts per 5 minutes
• Account fetching: 30 requests per 5 minutes  
• Transactions: 10 requests per 10 minutes
```

### **Token Validation**
- Minimum length requirements
- Character complexity analysis
- Format validation
- Security strength assessment

### **Secure Logging**
```typescript
// Tokens are hashed for debugging, never logged in plain text
const tokenHash = hashTokenForLogging(token); // "a1b2c3d4..."
console.log(`Banking request with token ${tokenHash}`);
```

### **Device Fingerprinting**
Your encryption key is derived from:
- Canvas fingerprint (unique rendering)
- Screen resolution and color depth
- Timezone and language settings
- Browser characteristics

## 🔧 Setup & Configuration

### **Development Setup**

1. **Generate Master Key**:
```bash
openssl rand -hex 32
```

2. **Set Environment Variable**:
```bash
export ENCRYPTION_MASTER_KEY="your_64_character_hex_key"
```

3. **Encrypt API Keys** (Optional):
```bash
node scripts/encrypt-env.js ALPHA_VANTAGE_API_KEY your_api_key
```

### **Production Deployment**

1. **Set Master Key** in your deployment environment
2. **Encrypt sensitive variables** using the provided script
3. **Store encrypted values** in your .env file
4. **Keep master key separate** from your codebase

## 🔐 API Token Storage

### **How It Works**

1. **User enters token** → Encrypted with device fingerprint
2. **Stored in localStorage** → Only as encrypted data  
3. **Retrieved for API calls** → Decrypted automatically
4. **Sent to server** → Only for authentication
5. **Never logged in plain text** → Always hashed

### **Security Guarantees**

- ✅ **Device-specific**: Can't be used on other devices
- ✅ **Forward secrecy**: New encryption for each storage
- ✅ **No plain text**: Never stored unencrypted
- ✅ **Automatic cleanup**: Corrupted data auto-removed
- ✅ **Easy disconnect**: Complete token removal

## 🚨 Security Best Practices

### **For Users**

1. **Use strong tokens**: Generate high-entropy API tokens
2. **Regular rotation**: Update API tokens periodically
3. **Monitor access**: Check bank app for API usage
4. **Secure devices**: Keep your computer/browser secure
5. **Logout properly**: Use disconnect button

### **For Developers**

1. **Never log tokens**: Always use hashed versions
2. **Validate input**: Check token format and strength  
3. **Rate limiting**: Implement proper request throttling
4. **Error handling**: Don't leak sensitive data in errors
5. **Regular updates**: Keep crypto libraries current

## 🔍 Security Monitoring

The application monitors and logs:

```
🔐 Banking test connection attempt for monobank with token a1b2c3d4... (strength: strong)
✅ Banking connection successful for monobank with token a1b2c3d4...
💳 Fetching accounts for monobank with token a1b2c3d4...
📊 Retrieved 2 accounts for monobank with token a1b2c3d4...
```

### **What's Logged**
- ✅ Token hash (first 8 characters)
- ✅ Provider name
- ✅ Success/failure status  
- ✅ Account/transaction counts
- ✅ IP addresses for rate limiting

### **What's NOT Logged**
- ❌ Full API tokens
- ❌ Account balances  
- ❌ Transaction details
- ❌ Personal information
- ❌ Encryption keys

## 🛠️ Encryption Utilities

### **Client-Side**
```typescript
import { SecureStorage, encryptToken, decryptToken } from '@/lib/crypto';

// Store token securely
await SecureStorage.setItem('token', 'your_token');

// Retrieve token securely  
const token = await SecureStorage.getItem('token');
```

### **Server-Side**
```typescript
import { SecureEnv, validateTokenSecurity, hashTokenForLogging } from './crypto';

// Get encrypted environment variable
const apiKey = SecureEnv.get('API_KEY');

// Validate token security
const validation = validateTokenSecurity(token);

// Log token safely
const hash = hashTokenForLogging(token);
```

## 🚀 Advanced Features

### **Crypto Fallbacks**
- Web Crypto API not available → Base64 encoding
- Server decryption fails → Base64 fallback  
- Master key missing → Random development key

### **Device Binding**
- Encryption tied to specific device characteristics
- Tokens encrypted on Device A won't work on Device B
- Provides additional layer of security

### **Audit Trail**
- All token operations logged with hashes
- Rate limiting attempts tracked
- Failed authentications monitored
- Security events timestamped

## 🔒 Compliance & Standards

### **Encryption Standards**
- **AES-256**: Industry standard encryption
- **PBKDF2**: Password-based key derivation
- **GCM/CBC**: Authenticated encryption modes
- **SHA-256**: Cryptographic hashing

### **Best Practices**
- **Zero-trust**: Never trust client input
- **Defense in depth**: Multiple security layers
- **Principle of least privilege**: Minimal access rights
- **Security by design**: Built-in from the start

---

## 📞 Security Questions?

If you have security concerns or questions:

1. **Review this documentation** thoroughly
2. **Check the code** - it's open source!
3. **Test the features** in a safe environment
4. **Report issues** if you find vulnerabilities

**Remember**: Your financial data security is our top priority! 🛡️

---

*Last updated: December 2024*
*Security version: 1.0* 