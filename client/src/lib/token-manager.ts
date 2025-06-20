
<new_str>/**
 * Token Manager for Math Rush micro-updates
 * Handles local storage mirroring and queue management
 */

interface TokenUpdate {
  operator: string;
  correctAnswers: number;
  timestamp: number;
}

interface TokenState {
  balance: number;
  queue: TokenUpdate[];
  lastSync: number;
}

class TokenManager {
  private static instance: TokenManager;
  private tokenState: TokenState;
  private isFlushingQueue = false;

  private constructor() {
    this.tokenState = this.loadFromStorage();
    this.setupBeforeUnloadHandler();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private loadFromStorage(): TokenState {
    try {
      const stored = sessionStorage.getItem('math_rush_token_state');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading token state from storage:', error);
    }
    
    return {
      balance: 0,
      queue: [],
      lastSync: Date.now()
    };
  }

  private saveToStorage(): void {
    try {
      sessionStorage.setItem('math_rush_token_state', JSON.stringify(this.tokenState));
    } catch (error) {
      console.error('Error saving token state to storage:', error);
    }
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this.tokenState.queue.length > 0) {
        this.flushQueueSync();
      }
    });
  }

  /**
   * Update local token balance and add to queue for server sync
   */
  updateTokens(operator: string, correctAnswers: number): number {
    const tokensEarned = Math.floor(correctAnswers / 3);
    
    if (tokensEarned > 0) {
      // Update local balance immediately
      this.tokenState.balance += tokensEarned;
      
      // Add to queue for server sync
      this.tokenState.queue.push({
        operator,
        correctAnswers,
        timestamp: Date.now()
      });
      
      this.saveToStorage();
      
      // Flush queue if not already flushing
      if (!this.isFlushingQueue) {
        this.flushQueue();
      }
    }
    
    return tokensEarned;
  }

  /**
   * Set the authoritative token balance from server
   */
  setBalance(balance: number): void {
    this.tokenState.balance = balance;
    this.tokenState.lastSync = Date.now();
    this.saveToStorage();
  }

  /**
   * Get current local token balance
   */
  getBalance(): number {
    return this.tokenState.balance;
  }

  /**
   * Flush queue asynchronously
   */
  private async flushQueue(): Promise<void> {
    if (this.isFlushingQueue || this.tokenState.queue.length === 0) {
      return;
    }

    this.isFlushingQueue = true;

    try {
      // Process queue in chunks
      while (this.tokenState.queue.length > 0) {
        const update = this.tokenState.queue[0];
        
        const response = await fetch('/api/rush/micro-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operator: update.operator,
            correctAnswers: update.correctAnswers
          }),
        });

        if (response.ok) {
          const result = await response.json();
          
          // Remove processed update from queue
          this.tokenState.queue.shift();
          
          // Sync balance with server if provided
          if (result.newBalance !== null) {
            this.tokenState.balance = result.newBalance;
          }
          
          this.saveToStorage();
        } else {
          console.error('Failed to flush token update:', response.statusText);
          break; // Stop processing on error
        }
      }
    } catch (error) {
      console.error('Error flushing token queue:', error);
    } finally {
      this.isFlushingQueue = false;
    }
  }

  /**
   * Synchronous queue flush for beforeunload
   */
  private flushQueueSync(): void {
    if (this.tokenState.queue.length === 0) return;

    // Use sendBeacon for reliable sending during page unload
    const update = this.tokenState.queue[0];
    const data = JSON.stringify({
      operator: update.operator,
      correctAnswers: update.correctAnswers
    });

    try {
      navigator.sendBeacon('/api/rush/micro-tokens', data);
    } catch (error) {
      console.error('Error sending beacon:', error);
    }
  }

  /**
   * Clear all stored data (for testing/reset)
   */
  reset(): void {
    this.tokenState = {
      balance: 0,
      queue: [],
      lastSync: Date.now()
    };
    sessionStorage.removeItem('math_rush_token_state');
  }
}

export const tokenManager = TokenManager.getInstance();
</new_str>
