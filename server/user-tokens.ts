import { encryptServerData, decryptServerData } from "./crypto";
import type { UserApiToken } from "../shared/schema";
import fs from "fs/promises";
import path from "path";

// File-based persistence for development
const TOKENS_FILE = path.join(process.cwd(), ".tokens-cache.json");

// In-memory storage as primary store
const userTokens = new Map<string, UserApiToken[]>();

export class UserTokenService {
  constructor() {
    // Load tokens from file on startup (if exists)
    this.loadTokensFromFile().catch(err => {
      console.log('📁 No existing token cache found (this is normal on first run)');
    });
  }

  // Load tokens from file
  private async loadTokensFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(TOKENS_FILE, "utf8");
      const tokenData = JSON.parse(data);
      
      // Restore to in-memory storage
      for (const [userId, tokens] of Object.entries(tokenData)) {
        userTokens.set(userId, tokens as UserApiToken[]);
      }
      
      console.log(`📁 Loaded ${Object.keys(tokenData).length} user(s) tokens from cache`);
    } catch (error) {
      // File doesn't exist or is corrupted - that's fine
      console.log('📁 Starting with empty token cache');
    }
  }

  // Save tokens to file
  private async saveTokensToFile(): Promise<void> {
    try {
      const tokenData: Record<string, UserApiToken[]> = {};
      
      // Convert Map to plain object using Array.from for better compatibility
      Array.from(userTokens.entries()).forEach(([userId, tokens]) => {
        tokenData[userId] = tokens;
      });
      
      await fs.writeFile(TOKENS_FILE, JSON.stringify(tokenData, null, 2));
      console.log(`💾 Saved tokens for ${Object.keys(tokenData).length} user(s) to cache`);
    } catch (error) {
      console.error('❌ Failed to save tokens to file:', error);
    }
  }

  // Clear all tokens globally on startup (for fixing corruption issues)
  async clearAllTokensOnStartup(): Promise<void> {
    console.log('🧹 Startup: Clearing all tokens to fix encryption issues...');
    userTokens.clear();
    
    // Also clear the file cache
    try {
      await fs.unlink(TOKENS_FILE);
      console.log('🗑️ Deleted token cache file');
    } catch (error) {
      // File might not exist, that's fine
    }
    
    console.log('✅ All tokens cleared - ready for fresh connections');
  }

  // Set (or update) a user's API token
  async setUserToken(
    userId: string, 
    provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage', 
    token: string, 
    tokenName?: string
  ): Promise<UserApiToken> {
    
    try {
      console.log(`🔐 Encrypting ${provider} token for user ${userId}...`);
      
      // Encrypt the token before storing
      const encryptedToken = encryptServerData(token);
      
      const userToken: UserApiToken = {
        id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        provider,
        encryptedToken,
        tokenName: tokenName || `${provider} API Key`,
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: new Date()
      };

      // Get user's existing tokens
      let tokens = userTokens.get(userId) || [];
      
      // Remove any existing token for this provider (replace, don't duplicate)
      tokens = tokens.filter(t => t.provider !== provider || !t.isActive);
      
      // Add the new token
      tokens.push(userToken);
      userTokens.set(userId, tokens);

      // Save to file after each change
      await this.saveTokensToFile();

      console.log(`✅ User ${userId} successfully added ${provider} API token (${tokenName})`);
      return userToken;
      
    } catch (error) {
      console.error(`❌ Failed to encrypt ${provider} token for user ${userId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      throw new Error(`Failed to encrypt ${provider} token: ${errorMessage}`);
    }
  }

  // Get decrypted API token for a user
  async getUserToken(userId: string, provider: string): Promise<string | null> {
    const tokens = userTokens.get(userId) || [];
    const token = tokens.find(t => t.provider === provider && t.isActive);
    
    if (!token) {
      console.log(`🔍 No ${provider} token found for user ${userId}`);
      return null;
    }

    try {
      console.log(`🔓 Decrypting ${provider} token for user ${userId}...`);
      
      // Decrypt the token
      const decryptedToken = decryptServerData(token.encryptedToken);
      
      // Update last used timestamp
      token.lastUsedAt = new Date();
      userTokens.set(userId, tokens);
      
      // Save to file after each change
      await this.saveTokensToFile();

      console.log(`✅ Successfully decrypted ${provider} token for user ${userId}`);
      return decryptedToken;
    } catch (error) {
      console.error(`❌ Failed to decrypt ${provider} token for user ${userId}:`, error);
      
      // Mark the corrupted token as inactive
      token.isActive = false;
      userTokens.set(userId, tokens);
      
      // Save to file after each change
      await this.saveTokensToFile();

      console.log(`🧹 Marked corrupted ${provider} token as inactive for user ${userId}`);
      return null;
    }
  }

  // Get all API tokens for a user (without decrypting)
  async getUserTokens(userId: string): Promise<UserApiToken[]> {
    const tokens = userTokens.get(userId) || [];
    return tokens.filter(t => t.isActive);
  }

  // Check if user has a specific API token
  async hasUserToken(userId: string, provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage'): Promise<boolean> {
    const tokens = userTokens.get(userId) || [];
    return tokens.some(t => t.provider === provider && t.isActive);
  }

  // Delete a user's API token (specific provider)
  async deleteUserToken(userId: string, provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage'): Promise<boolean> {
    const tokens = userTokens.get(userId) || [];
    const tokenIndex = tokens.findIndex(t => t.provider === provider && t.isActive);
    
    if (tokenIndex === -1) {
      return false;
    }

    // Mark as inactive instead of deleting (for audit trail)
    tokens[tokenIndex].isActive = false;
    userTokens.set(userId, tokens);

    // Save to file after each change
    await this.saveTokensToFile();

    console.log(`🗑️ User ${userId} removed ${provider} API token`);
    return true;
  }

  // Legacy method name for backward compatibility
  async removeUserToken(userId: string, provider: 'monobank' | 'binance' | 'binance_key' | 'binance_secret' | 'alpha_vantage'): Promise<boolean> {
    return this.deleteUserToken(userId, provider);
  }

  // Test if a token is valid (without storing it)
  async testTokenValidity(
    provider: 'monobank' | 'binance' | 'alpha_vantage', 
    token: string
  ): Promise<{ valid: boolean; error?: string }> {
    
    try {
      switch (provider) {
        case 'monobank':
          // Test Monobank token by calling client-info endpoint
          const monobankResponse = await fetch('https://api.monobank.ua/personal/client-info', {
            method: 'GET',
            headers: {
              'X-Token': token,
              'User-Agent': 'PFT/1.0',
            },
          });
          
          if (monobankResponse.ok) {
            return { valid: true };
          } else {
            return { valid: false, error: `Monobank API error: ${monobankResponse.status}` };
          }
          
        case 'alpha_vantage':
          // Test Alpha Vantage token by calling a lightweight endpoint
          const alphaResponse = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${token}`
          );
          const alphaData = await alphaResponse.json();
          
          if (alphaData['Error Message'] || alphaData['Note']) {
            return { valid: false, error: 'Invalid Alpha Vantage API key or rate limit exceeded' };
          }
          
          return { valid: true };
          
        case 'binance':
          // For Binance, we test in the Binance service directly
          return { valid: true }; // Placeholder - actual validation happens in binance.ts
          
        default:
          return { valid: false, error: 'Unknown provider' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `Network error: ${errorMessage}` };
    }
  }

  // Get user token statistics
  getUserTokenStats(userId: string): { total: number; byProvider: Record<string, number> } {
    const tokens = userTokens.get(userId) || [];
    const activeTokens = tokens.filter(t => t.isActive);
    
    const byProvider: Record<string, number> = {};
    activeTokens.forEach(token => {
      byProvider[token.provider] = (byProvider[token.provider] || 0) + 1;
    });

    return {
      total: activeTokens.length,
      byProvider
    };
  }

  // Clear all tokens for a user (for user deletion/cleanup)
  async clearUserTokens(userId: string): Promise<void> {
    userTokens.delete(userId);
    console.log(`🧹 Cleared all API tokens for user ${userId}`);
  }

  // Clean up corrupted tokens for a user
  async cleanupCorruptedTokens(userId: string): Promise<number> {
    const tokens = userTokens.get(userId) || [];
    const initialCount = tokens.length;
    
    // Filter out inactive tokens (these were marked as corrupted)
    const cleanTokens = tokens.filter(token => token.isActive);
    
    if (cleanTokens.length !== initialCount) {
      userTokens.set(userId, cleanTokens);
      const removedCount = initialCount - cleanTokens.length;
      console.log(`🧹 Removed ${removedCount} corrupted tokens for user ${userId}`);
      return removedCount;
    }
    
    return 0;
  }

  // Force clear all tokens for a user (emergency cleanup)
  async clearAllTokensForUser(userId: string): Promise<number> {
    const tokens = userTokens.get(userId) || [];
    const count = tokens.length;
    
    if (count > 0) {
      userTokens.delete(userId);
      console.log(`🚮 Force cleared all ${count} tokens for user ${userId}`);
    }
    
    return count;
  }

  // Reset all corrupted tokens globally (migration helper)
  async resetAllCorruptedTokens(): Promise<number> {
    let totalRemoved = 0;
    const allUserIds = Array.from(userTokens.keys());
    
    for (const userId of allUserIds) {
      const removed = await this.cleanupCorruptedTokens(userId);
      totalRemoved += removed;
    }
    
    console.log(`🔄 Global cleanup: Removed ${totalRemoved} corrupted tokens across all users`);
    return totalRemoved;
  }

  // Get global statistics (for admin/debugging)
  getGlobalStats(): { totalUsers: number; totalTokens: number; tokensByProvider: Record<string, number> } {
    let totalTokens = 0;
    const tokensByProvider: Record<string, number> = {};
    
    const allTokenArrays = Array.from(userTokens.values());
    for (const tokens of allTokenArrays) {
      const activeTokens = tokens.filter((t: UserApiToken) => t.isActive);
      totalTokens += activeTokens.length;
      
      activeTokens.forEach((token: UserApiToken) => {
        tokensByProvider[token.provider] = (tokensByProvider[token.provider] || 0) + 1;
      });
    }

    return {
      totalUsers: userTokens.size,
      totalTokens,
      tokensByProvider
    };
  }
}

// Export singleton instance
export const userTokenService = new UserTokenService(); 