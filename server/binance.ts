import crypto from "crypto";

export interface BinanceAsset {
  asset: string;
  free: string;
  locked: string;
  total?: number;
  usdValue?: number;
}

export interface BinanceAccountResponse {
  assets: BinanceAsset[];
  totalUsdValue: number;
  lastUpdated: string;
}

export interface BinancePrice {
  symbol: string;
  price: string;
}

export class BinanceProvider {
  private baseUrl = "https://api.binance.com";
  
  /**
   * Create signature for Binance API requests
   */
  private createSignature(queryString: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Get current server time from Binance
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/time`);
      const data = await response.json();
      return data.serverTime;
    } catch (error) {
      console.error('❌ Failed to get Binance server time:', error);
      return Date.now();
    }
  }

  /**
   * Get account information and balances
   */
  async getAccountAssets(apiKey: string, secretKey: string): Promise<BinanceAccountResponse> {
    try {
      console.log('🟡 Binance: Fetching account assets from API');
      
      const timestamp = await this.getServerTime();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.createSignature(queryString, secretKey);
      
      const url = `${this.baseUrl}/api/v3/account?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'User-Agent': 'PFT/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Binance API rate limit exceeded. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid Binance API credentials. Please check your API key and secret.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Binance API error: ${errorData.msg || response.statusText}`);
        }
      }

      const accountData = await response.json();
      
      // Filter out assets with zero balance
      const nonZeroAssets = accountData.balances.filter((balance: any) => {
        const total = parseFloat(balance.free) + parseFloat(balance.locked);
        return total > 0;
      });

      // Get USD prices for assets
      const assetsWithPrices = await this.enrichAssetsWithPrices(nonZeroAssets);
      
      // Calculate total USD value
      const totalUsdValue = assetsWithPrices.reduce((sum, asset) => sum + (asset.usdValue || 0), 0);

      console.log(`🟡 Binance: Retrieved ${assetsWithPrices.length} assets with balances`);
      
      return {
        assets: assetsWithPrices,
        totalUsdValue,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Binance getAccountAssets error:', error);
      throw new Error(`Failed to fetch assets: ${error.message}`);
    }
  }

  /**
   * Enrich assets with USD prices
   */
  private async enrichAssetsWithPrices(assets: any[]): Promise<BinanceAsset[]> {
    try {
      // Get all current prices
      const pricesResponse = await fetch(`${this.baseUrl}/api/v3/ticker/price`);
      const allPrices = await pricesResponse.json();
      
      // Create price lookup map
      const priceMap = new Map<string, number>();
      allPrices.forEach((price: BinancePrice) => {
        priceMap.set(price.symbol, parseFloat(price.price));
      });

      return assets.map((balance: any) => {
        const asset = balance.asset;
        const free = parseFloat(balance.free);
        const locked = parseFloat(balance.locked);
        const total = free + locked;
        
        let usdValue = 0;
        
        // Special case for USDT, USDC, BUSD (stablecoins)
        if (['USDT', 'USDC', 'BUSD', 'USD'].includes(asset)) {
          usdValue = total;
        } else {
          // Try to find USD price (asset/USDT pair)
          const usdtSymbol = `${asset}USDT`;
          const btcSymbol = `${asset}BTC`;
          
          if (priceMap.has(usdtSymbol)) {
            usdValue = total * priceMap.get(usdtSymbol)!;
          } else if (priceMap.has(btcSymbol) && priceMap.has('BTCUSDT')) {
            // Calculate via BTC if direct USDT pair doesn't exist
            const btcPrice = priceMap.get(btcSymbol)!;
            const btcUsdPrice = priceMap.get('BTCUSDT')!;
            usdValue = total * btcPrice * btcUsdPrice;
          }
        }

        return {
          asset,
          free: balance.free,
          locked: balance.locked,
          total,
          usdValue
        };
      });
    } catch (error) {
      console.error('❌ Failed to enrich assets with prices:', error);
      // Return assets without USD values if price fetching fails
      return assets.map((balance: any) => ({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
        total: parseFloat(balance.free) + parseFloat(balance.locked),
        usdValue: 0
      }));
    }
  }

  /**
   * Test API credentials
   */
  async testConnection(apiKey: string, secretKey: string): Promise<boolean> {
    try {
      console.log('🧪 Testing Binance API connection...');
      
      const timestamp = await this.getServerTime();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.createSignature(queryString, secretKey);
      
      const url = `${this.baseUrl}/api/v3/account?${queryString}&signature=${signature}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'User-Agent': 'PFT/1.0',
        },
      });

      if (response.ok) {
        console.log('✅ Binance API connection test successful');
        return true;
      } else {
        console.log('❌ Binance API connection test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Binance API connection test error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const binanceService = new BinanceProvider(); 