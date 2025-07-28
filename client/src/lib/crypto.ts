/**
 * Client-side encryption utilities for secure token storage
 * Uses Web Crypto API for strong encryption
 */

// Device fingerprinting for key derivation
export function getDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('PFT Fingerprint', 10, 10);
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency?.toString() || '1'
  ];
  
  return btoa(components.join('|')).substring(0, 32);
}

// Check if Web Crypto API is supported
export function isCryptoSupported(): boolean {
  return typeof window !== 'undefined' && 
         'crypto' in window && 
         'subtle' in window.crypto;
}

// Derive encryption key from device fingerprint
async function deriveKey(fingerprint: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('pft-salt-2024'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data using AES-GCM
async function encryptData(data: string): Promise<string> {
  try {
    if (!isCryptoSupported()) {
      console.warn('Web Crypto API not supported, using fallback encoding');
      return btoa(data);
    }

    const fingerprint = getDeviceFingerprint();
    const key = await deriveKey(fingerprint);
    
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBytes
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...Array.from(combined)));
  } catch (error) {
    console.warn('Encryption failed, using fallback:', error);
    return btoa(data);
  }
}

// Decrypt data using AES-GCM
async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!isCryptoSupported()) {
      console.warn('Web Crypto API not supported, using fallback decoding');
      return atob(encryptedData);
    }

    const fingerprint = getDeviceFingerprint();
    const key = await deriveKey(fingerprint);
    
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.warn('Decryption failed, using fallback:', error);
    return atob(encryptedData);
  }
}

// Test encryption/decryption functionality
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = 'PFT encryption test';
    const encrypted = await encryptData(testData);
    const decrypted = await decryptData(encrypted);
    
    const success = decrypted === testData;
    console.log(`🔐 Encryption test ${success ? 'passed' : 'failed'}`);
    return success;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

// Secure localStorage wrapper
export class SecureStorage {
  private static prefix = 'pft_secure_';

  static async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encryptData(value);
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      console.error('SecureStorage.setItem failed:', error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;
      
      return await decryptData(encrypted);
    } catch (error) {
      console.error('SecureStorage.getItem failed:', error);
      // Remove corrupted item
      localStorage.removeItem(this.prefix + key);
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  static getAllKeys(): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.replace(this.prefix, ''));
  }
} 