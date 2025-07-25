#!/usr/bin/env node

/**
 * Utility script to encrypt environment variables for secure storage
 * Usage: node scripts/encrypt-env.js <variable_name> <value>
 * 
 * Example:
 * node scripts/encrypt-env.js ALPHA_VANTAGE_API_KEY your_api_key_here
 * node scripts/encrypt-env.js MONOBANK_WEBHOOK_SECRET your_webhook_secret
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
}

function getMasterKey() {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    console.error('❌ ENCRYPTION_MASTER_KEY environment variable is required');
    console.error('💡 Generate one with: openssl rand -hex 32');
    process.exit(1);
  }
  return masterKey;
}

function encryptValue(value) {
  try {
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt, iv, and encrypted data
    const combined = salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
    
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔐 StockTrack Environment Variable Encryptor');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/encrypt-env.js <variable_name> <value>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/encrypt-env.js ALPHA_VANTAGE_API_KEY your_api_key_here');
    console.log('  node scripts/encrypt-env.js MONOBANK_WEBHOOK_SECRET your_webhook_secret');
    console.log('');
    console.log('Prerequisites:');
    console.log('  Set ENCRYPTION_MASTER_KEY environment variable');
    console.log('  Generate with: openssl rand -hex 32');
    console.log('');
    return;
  }
  
  if (args.length < 2) {
    console.error('❌ Both variable name and value are required');
    process.exit(1);
  }
  
  const varName = args[0];
  const varValue = args.slice(1).join(' '); // Allow spaces in values
  
  console.log('🔐 Encrypting environment variable...');
  console.log(`📝 Variable: ${varName}`);
  console.log(`📏 Value length: ${varValue.length} characters`);
  
  const encrypted = encryptValue(varValue);
  
  console.log('');
  console.log('✅ Encryption successful!');
  console.log('');
  console.log('📋 Add this to your .env file:');
  console.log(`${varName}=${encrypted}`);
  console.log('');
  console.log('🔒 Security notes:');
  console.log('• Keep your ENCRYPTION_MASTER_KEY secure and separate');
  console.log('• Never commit the master key to version control');
  console.log('• Store the master key in your deployment environment');
  console.log('• The encrypted value is safe to commit to repositories');
}

if (require.main === module) {
  main();
} 