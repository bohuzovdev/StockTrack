/**
 * Server-side encryption utilities for secure token handling
 * Uses Node.js crypto module for strong encryption
 */

import crypto from 'crypto';

/**
 * Get master encryption key from environment
 */
function getMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    // Generate a random master key for development
    const randomKey = crypto.randomBytes(32).toString('hex');
    console.warn(`⚠️  No ENCRYPTION_MASTER_KEY found. Using random key: ${randomKey}`);
    console.warn('⚠️  Set ENCRYPTION_MASTER_KEY environment variable for production!');
    return randomKey;
  }
  return masterKey;
}

/**
 * Encrypt sensitive data on server
 */
export function encryptServerData(data: string): string {
  try {
    console.log('🔐 Starting server encryption...');
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    // Use createCipheriv (not the deprecated createCipher)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt, iv, and encrypted data
    const combined = `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
    const result = Buffer.from(combined, 'utf8').toString('base64');
    
    console.log('✅ Server encryption successful');
    return result;
  } catch (error) {
    console.error('❌ Server encryption failed:', error);
    throw new Error('Failed to encrypt server data');
  }
}

/**
 * Decrypt sensitive data on server
 */
export function decryptServerData(encryptedData: string): string {
  try {
    console.log('🔓 Starting server decryption...');
    const masterKey = getMasterKey();
    
    // Handle base64 encoded data
    let combined: string;
    try {
      combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (error) {
      // If base64 decoding fails, try using the data as-is
      combined = encryptedData;
    }
    
    const parts = combined.split(':');
    
    if (parts.length !== 3) {
      console.error('❌ Invalid encrypted data format. Expected 3 parts, got:', parts.length);
      console.error('❌ Data parts:', parts);
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
    
    // Use createDecipheriv (not the deprecated createDecipher)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('✅ Server decryption successful');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    console.error('❌ Encrypted data length:', encryptedData?.length);
    console.error('❌ Encrypted data preview:', encryptedData?.substring(0, 50) + '...');
    throw error;
  }
}

/**
 * Secure environment variable manager
 */
export class SecureEnv {
  private static cache = new Map<string, string>();
  
  static get(key: string): string | undefined {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const value = process.env[key];
    if (!value) return undefined;
    
    // Try to decrypt if it looks like encrypted data
    if (value.includes('=') && value.length > 50) {
      try {
        const decrypted = decryptServerData(value);
        this.cache.set(key, decrypted);
        return decrypted;
      } catch {
        // Not encrypted, use as-is
        this.cache.set(key, value);
        return value;
      }
    }
    
    this.cache.set(key, value);
    return value;
  }
  
  static set(key: string, value: string, encrypt = true): void {
    if (encrypt) {
      const encrypted = encryptServerData(value);
      process.env[key] = encrypted;
      this.cache.set(key, value); // Cache the decrypted value
    } else {
      process.env[key] = value;
      this.cache.set(key, value);
    }
  }
  
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * Validate token format and basic security
 */
export function validateTokenSecurity(token: string): {
  isValid: boolean;
  reason?: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  if (!token || token.length < 10) {
    return { isValid: false, reason: 'Token too short', strength: 'weak' };
  }
  
  if (token.length < 20) {
    return { isValid: true, strength: 'weak' };
  }
  
  if (token.length < 40) {
    return { isValid: true, strength: 'medium' };
  }
  
  // Check for variety of characters
  const hasNumbers = /\d/.test(token);
  const hasLetter = /[a-zA-Z]/.test(token);
  const hasSpecial = /[^a-zA-Z0-9]/.test(token);
  
  if (hasNumbers && hasLetter && hasSpecial) {
    return { isValid: true, strength: 'strong' };
  }
  
  return { isValid: true, strength: 'medium' };
}

/**
 * Hash token for logging/debugging (one-way)
 */
export function hashTokenForLogging(token: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(token);
  const fullHash = hash.digest('hex');
  // Return first 8 chars for debugging
  return `${fullHash.substring(0, 8)}...`;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Rate limiting for token operations
 */
export class TokenRateLimit {
  private static attempts = new Map<string, { count: number; resetTime: number }>();
  
  static checkLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    const now = Date.now();
    const key = crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
    
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  static reset(identifier: string): void {
    const key = crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
    this.attempts.delete(key);
  }
} 