/**
 * Client-side encryption utilities for secure token storage
 * Uses Web Crypto API for strong encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a cryptographic key from a password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a unique device fingerprint as encryption password
 */
function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.beginPath();
  ctx?.arc(50, 50, 20, 0, 2 * Math.PI);
  ctx?.stroke();
  
  const canvasFingerprint = canvas.toDataURL();
  const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const languageFingerprint = navigator.language;
  const userAgentFingerprint = navigator.userAgent.slice(0, 100); // Truncate for consistency
  
  return `${canvasFingerprint}-${screenFingerprint}-${timezoneFingerprint}-${languageFingerprint}-${userAgentFingerprint}`;
}

/**
 * Encrypt a token using device-specific encryption
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    // Generate salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key from device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    const key = await deriveKey(deviceFingerprint, salt);
    
    // Encrypt the token
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );
    
    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...Array.from(combined)));
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fallback to base64 encoding if crypto fails
    return btoa(token);
  }
}

/**
 * Decrypt a token using device-specific decryption
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const encrypted = combined.slice(16 + IV_LENGTH);
    
    // Derive key from device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    const key = await deriveKey(deviceFingerprint, salt);
    
    // Decrypt the token
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Fallback to base64 decoding if crypto fails
    try {
      return atob(encryptedToken);
    } catch {
      throw new Error('Failed to decrypt token');
    }
  }
}

/**
 * Secure token storage wrapper
 */
export class SecureStorage {
  private static prefix = 'stocktrack_secure_';
  
  static async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encryptToken(value);
      const storageKey = this.prefix + key;
      localStorage.setItem(storageKey, encrypted);
    } catch (error) {
      console.error('Secure storage set failed:', error);
      throw new Error('Failed to securely store token');
    }
  }
  
  static async getItem(key: string): Promise<string | null> {
    try {
      const storageKey = this.prefix + key;
      const encrypted = localStorage.getItem(storageKey);
      if (!encrypted) return null;
      
      return await decryptToken(encrypted);
    } catch (error) {
      console.error('Secure storage get failed:', error);
      // Clean up corrupted data
      this.removeItem(key);
      return null;
    }
  }
  
  static removeItem(key: string): void {
    const storageKey = this.prefix + key;
    localStorage.removeItem(storageKey);
  }
  
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoSupported(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}

/**
 * Generate a random token for testing
 */
export function generateRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
} 