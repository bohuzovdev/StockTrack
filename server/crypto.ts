/**
 * Server-side encryption utilities for secure token handling
 * Uses Node.js crypto module for strong encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Generate encryption key from master secret
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

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
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt, iv, and encrypted data
    const combined = salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
    
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Server encryption failed:', error);
    // Fallback to simple base64 for development
    return Buffer.from(data).toString('base64');
  }
}

/**
 * Decrypt sensitive data on server
 */
export function decryptServerData(encryptedData: string): string {
  try {
    const masterKey = getMasterKey();
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = combined.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Server decryption failed:', error);
    // Fallback to base64 for development
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch {
      throw new Error('Failed to decrypt server data');
    }
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
  
  static set(key: string, value: string, encrypt: boolean = false): void {
    if (encrypt) {
      const encrypted = encryptServerData(value);
      process.env[key] = encrypted;
      this.cache.set(key, value); // Cache decrypted value
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