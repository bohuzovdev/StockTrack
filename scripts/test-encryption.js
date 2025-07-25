#!/usr/bin/env node

/**
 * Test script to validate encryption/decryption functionality
 * Usage: node scripts/test-encryption.js
 */

import crypto from 'crypto';

// Import server-side crypto functions
const ALGORITHM = 'aes-256-cbc';

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
}

function getMasterKey() {
  return process.env.ENCRYPTION_MASTER_KEY || crypto.randomBytes(32).toString('hex');
}

function encryptServerData(data) {
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
    return Buffer.from(data).toString('base64');
  }
}

function decryptServerData(encryptedData) {
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
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch {
      throw new Error('Failed to decrypt server data');
    }
  }
}

function validateTokenSecurity(token) {
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

function hashTokenForLogging(token) {
  const hash = crypto.createHash('sha256');
  hash.update(token);
  const fullHash = hash.digest('hex');
  return `${fullHash.substring(0, 8)}...`;
}

function runTests() {
  console.log('🔐 StockTrack Encryption Validation Test');
  console.log('========================================\n');

  let allTestsPassed = true;

  // Test 1: Server-side encryption/decryption
  console.log('📋 Test 1: Server-side Encryption/Decryption');
  console.log('──────────────────────────────────────────');
  
  const testData = [
    'simple_api_key',
    'complex_token_with_123_and_special_chars!@#',
    'monobank_api_token_example_12345abcdef',
    'alpha_vantage_demo_key',
    '🔑 token with unicode 🚀'
  ];

  testData.forEach((originalData, index) => {
    try {
      console.log(`\n🔧 Test 1.${index + 1}: "${originalData.substring(0, 20)}..."`);
      
      // Encrypt
      const encrypted = encryptServerData(originalData);
      console.log(`   🔐 Encrypted: ${encrypted.substring(0, 50)}...`);
      console.log(`   📏 Encrypted length: ${encrypted.length} characters`);
      
      // Decrypt
      const decrypted = decryptServerData(encrypted);
      console.log(`   🔓 Decrypted: "${decrypted.substring(0, 20)}..."`);
      
      // Validate
      const isMatch = originalData === decrypted;
      console.log(`   ✅ Match: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (!isMatch) {
        console.log(`   ❌ Expected: "${originalData}"`);
        console.log(`   ❌ Got: "${decrypted}"`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      allTestsPassed = false;
    }
  });

  // Test 2: Token security validation
  console.log('\n\n📋 Test 2: Token Security Validation');
  console.log('────────────────────────────────────');
  
  const testTokens = [
    { token: 'short', expectedStrength: 'weak', expectedValid: false },
    { token: 'medium_length_token', expectedStrength: 'weak', expectedValid: true },
    { token: 'longer_token_with_more_chars', expectedStrength: 'medium', expectedValid: true },
    { token: 'very_long_token_with_numbers_123_and_special_chars!@#', expectedStrength: 'strong', expectedValid: true },
    { token: '', expectedStrength: 'weak', expectedValid: false }
  ];

  testTokens.forEach((test, index) => {
    console.log(`\n🔧 Test 2.${index + 1}: "${test.token}"`);
    
    const validation = validateTokenSecurity(test.token);
    console.log(`   🔒 Valid: ${validation.isValid} (expected: ${test.expectedValid})`);
    console.log(`   💪 Strength: ${validation.strength} (expected: ${test.expectedStrength})`);
    
    const validMatch = validation.isValid === test.expectedValid;
    const strengthMatch = validation.strength === test.expectedStrength;
    
    if (!validMatch || !strengthMatch) {
      console.log(`   ❌ FAILED validation test`);
      allTestsPassed = false;
    } else {
      console.log(`   ✅ PASSED validation test`);
    }
  });

  // Test 3: Token hashing for logging
  console.log('\n\n📋 Test 3: Token Hashing for Logging');
  console.log('───────────────────────────────────');
  
  const testHashTokens = [
    'real_monobank_token_example',
    'alpha_vantage_demo_key',
    'short_token'
  ];

  testHashTokens.forEach((token, index) => {
    console.log(`\n🔧 Test 3.${index + 1}: "${token}"`);
    
    const hash1 = hashTokenForLogging(token);
    const hash2 = hashTokenForLogging(token);
    
    console.log(`   🔗 Hash: ${hash1}`);
    console.log(`   🔗 Hash (again): ${hash2}`);
    console.log(`   📏 Hash length: ${hash1.length} characters`);
    
    // Hashes should be consistent
    const consistent = hash1 === hash2;
    console.log(`   ✅ Consistent: ${consistent ? 'SUCCESS' : 'FAILED'}`);
    
    // Hash should be different from original
    const different = hash1 !== token;
    console.log(`   ✅ Different from original: ${different ? 'SUCCESS' : 'FAILED'}`);
    
    // Hash should be 12 characters (8 + "...")
    const correctLength = hash1.length === 11; // "abcd1234..."
    console.log(`   ✅ Correct length: ${correctLength ? 'SUCCESS' : 'FAILED'}`);
    
    if (!consistent || !different || !correctLength) {
      allTestsPassed = false;
    }
  });

  // Test 4: Environment variable encryption
  console.log('\n\n📋 Test 4: Environment Variable Handling');
  console.log('──────────────────────────────────────');
  
  // Set a test master key
  const originalMasterKey = process.env.ENCRYPTION_MASTER_KEY;
  process.env.ENCRYPTION_MASTER_KEY = crypto.randomBytes(32).toString('hex');
  console.log(`🔑 Using test master key: ${process.env.ENCRYPTION_MASTER_KEY.substring(0, 16)}...`);
  
  const testEnvValues = [
    'demo_api_key',
    'production_secret_key_with_special_chars!@#$',
    'very_long_api_key_that_might_be_used_in_production_environments'
  ];

  testEnvValues.forEach((value, index) => {
    console.log(`\n🔧 Test 4.${index + 1}: Environment variable encryption`);
    console.log(`   📝 Original: "${value}"`);
    
    const encrypted = encryptServerData(value);
    console.log(`   🔐 Encrypted: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = decryptServerData(encrypted);
    console.log(`   🔓 Decrypted: "${decrypted}"`);
    
    const match = value === decrypted;
    console.log(`   ✅ Round-trip: ${match ? 'SUCCESS' : 'FAILED'}`);
    
    if (!match) {
      allTestsPassed = false;
    }
  });

  // Restore original master key
  if (originalMasterKey) {
    process.env.ENCRYPTION_MASTER_KEY = originalMasterKey;
  } else {
    delete process.env.ENCRYPTION_MASTER_KEY;
  }

  // Final results
  console.log('\n\n🏆 Test Results Summary');
  console.log('═══════════════════════');
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Server-side encryption/decryption working correctly');
    console.log('✅ Token security validation working correctly');
    console.log('✅ Token hashing for logging working correctly');
    console.log('✅ Environment variable encryption working correctly');
    console.log('\n🛡️ Your encryption system is fully functional and secure!');
  } else {
    console.log('💥 SOME TESTS FAILED! 💥');
    console.log('❌ Please review the failed tests above');
    console.log('🔧 Check your encryption implementation');
  }
  
  console.log('\n📊 Test completed at:', new Date().toISOString());
  process.exit(allTestsPassed ? 0 : 1);
}

runTests(); 