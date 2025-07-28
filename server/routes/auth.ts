/**
 * AUTHENTICATION ROUTES
 * 
 * This file demonstrates breaking down the monolithic server/routes.ts (779 lines)
 * into smaller, domain-specific route files for better maintainability
 */

import { Router, Request, Response, NextFunction } from 'express';
import { userTokenService } from '../user-tokens';
import type { AuthResponse, TokensResponse, TokenSaveResponse, TokenDeleteResponse } from '../../client/src/types/api';

const router = Router();

/**
 * Authentication middleware
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: "Authentication required" 
    });
  }
  next();
};

/**
 * Add user context middleware
 */
export const addUserContext = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    (req as any).userId = (req.user as any).googleId;
  }
  next();
};

/**
 * Get current user information
 */
router.get('/me', (req: Request, res: Response) => {
  const response: AuthResponse = req.user ? {
    success: true,
    user: req.user as any
  } : {
    success: false,
    error: "Not authenticated"
  };
  
  res.json(response);
});

/**
 * USER TOKEN MANAGEMENT ROUTES
 */

/**
 * Get all user tokens
 */
router.get('/tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).googleId;
    const tokens = await userTokenService.getUserTokens(userId);
    
    const response: TokensResponse = {
      success: true,
      tokens: tokens
    };
    
    res.json(response);
    
  } catch (error) {
    console.error("Failed to fetch user tokens:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch tokens" 
    });
  }
});

/**
 * Save a new user token
 */
router.post('/tokens', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).googleId;
    const { provider, token, tokenName } = req.body;

    if (!provider || !token) {
      return res.status(400).json({ 
        success: false, 
        error: "Provider and token are required" 
      });
    }

    const savedToken = await userTokenService.setUserToken(
      userId,
      provider, 
      token, 
      tokenName
    );

    const response: TokenSaveResponse = {
      success: true,
      token: savedToken,
      message: `${provider} token saved successfully`
    };

    res.json(response);

  } catch (error) {
    console.error("Failed to save user token:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save token" 
    });
  }
});

/**
 * Delete a specific user token
 */
router.delete('/tokens/:provider', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).googleId;
    const { provider } = req.params;

    const success = await userTokenService.removeUserToken(userId, provider as any);

    if (success) {
      const response: TokenDeleteResponse = {
        success: true,
        message: `${provider} token deleted successfully`,
        removedCount: 1
      };
      res.json(response);
    } else {
      res.status(404).json({ 
        success: false, 
        error: `No active ${provider} token found` 
      });
    }

  } catch (error) {
    console.error("Failed to delete user token:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete token" 
    });
  }
});

/**
 * Clear all user tokens (emergency cleanup)
 */
router.delete('/tokens/clear-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).googleId;
    
    console.log(`🚮 Emergency: Force clearing all tokens for user ${userId}`);

    const removedCount = await userTokenService.clearAllTokensForUser(userId);

    const response: TokenDeleteResponse = {
      success: true,
      message: `Successfully cleared ${removedCount} tokens`,
      removedCount
    };

    res.json(response);
    
  } catch (error) {
    console.error("Failed to clear all tokens:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to clear tokens" 
    });
  }
});

/**
 * Test a token connection without saving it
 */
router.post('/tokens/test/:provider', requireAuth, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: "Token is required for testing" 
      });
    }

    const result = await userTokenService.testTokenValidity(provider as any, token);

    res.json({
      success: true,
      valid: result.valid,
      message: result.valid ? "Token is valid" : result.error,
      error: result.error
    });

  } catch (error) {
    console.error("Failed to test token:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to test token" 
    });
  }
});

export default router; 