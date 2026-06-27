// frontend-web/src/services/sessionApi.ts
/**
 * Session API Service
 * Handles session management, app lock, and time tracking with Redis backend.
 */

import { api } from './axiosConfig';

export interface LockState {
  state: 'active' | 'warning' | 'locked' | 'paused' | 'unlocked';
  user_id: string;
  started_at: string;
  expires_at: string;
  ttl_seconds: number;
  warning_threshold_seconds: number;
  is_paused: boolean;
  remaining_seconds: number;
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  session_id: string;
  user_id: string;
  jti: string;
  created_at: string;
  last_activity: string;
  metadata?: Record<string, unknown>;
}

export interface UsageStats {
  date: string;
  total_minutes: number;
  sessions: Array<{
    start: string;
    end: string;
    minutes: number;
  }>;
}

export interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
  window_seconds: number;
  type: string;
}

class SessionApiService {
  private sessionId: string | null = null;
  private keepAliveInterval: number | null = null;

  /**
   * Start a new app lock session.
   */
  async startLock(
    ttlMinutes?: number,
    metadata?: Record<string, unknown>
  ): Promise<LockState> {
    const response = await api.post('/api/v1/session-lock/start', {
      ttl_minutes: ttlMinutes,
      metadata,
    });
    return response.data;
  }

  /**
   * Get current lock state.
   */
  async getLockState(): Promise<LockState | null> {
    try {
      const response = await api.get('/api/v1/session-lock/state');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is locked.
   */
  async isLocked(): Promise<boolean> {
    try {
      const response = await api.get('/api/v1/session-lock/is-locked');
      return response.data.is_locked;
    } catch {
      return false;
    }
  }

  /**
   * Pause the lock timer.
   */
  async pauseLock(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/pause');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resume the lock timer.
   */
  async resumeLock(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/resume');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Unlock/end the session.
   */
  async unlock(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/unlock');
      this.stopKeepAlive();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extend lock time (parent override).
   */
  async extendLock(
    extraMinutes: number,
    extendedBy: string = 'parent'
  ): Promise<LockState | null> {
    try {
      const response = await api.post('/api/v1/session-lock/extend', {
        extra_minutes: extraMinutes,
        extended_by: extendedBy,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Record activity to keep session active.
   */
  async recordActivity(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/activity');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get usage statistics for today.
   */
  async getUsageToday(): Promise<UsageStats> {
    const response = await api.get('/api/v1/session-lock/usage/today');
    return response.data;
  }

  /**
   * Get usage statistics for a date range.
   */
  async getUsageRange(startDate: string, endDate: string): Promise<{
    start_date: string;
    end_date: string;
    total_minutes: number;
    daily_breakdown: Array<{ date: string; minutes: number }>;
  }> {
    const response = await api.get('/api/v1/session-lock/usage/range', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  }

  // ==================== Session Management ====================

  /**
   * Create a new session (after login).
   */
  async createSession(jti: string, metadata?: Record<string, unknown>): Promise<SessionData> {
    const response = await api.post('/api/v1/sessions', {
      jti,
      metadata,
    });
    this.sessionId = response.data.session_id;
    this.startKeepAlive();
    return response.data;
  }

  /**
   * Validate current session.
   */
  async validateSession(): Promise<SessionData | null> {
    if (!this.sessionId) return null;
    
    try {
      const response = await api.get(`/api/v1/sessions/${this.sessionId}`);
      return response.data;
    } catch {
      this.sessionId = null;
      return null;
    }
  }

  /**
   * Refresh session to extend TTL.
   */
  async refreshSession(): Promise<boolean> {
    if (!this.sessionId) return false;
    
    try {
      await api.post(`/api/v1/sessions/${this.sessionId}/refresh`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete/logout session.
   */
  async deleteSession(): Promise<boolean> {
    if (!this.sessionId) return true;
    
    try {
      await api.delete(`/api/v1/sessions/${this.sessionId}`);
      this.stopKeepAlive();
      this.sessionId = null;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all sessions for current user.
   */
  async getUserSessions(): Promise<SessionData[]> {
    const response = await api.get('/api/v1/sessions');
    return response.data;
  }

  /**
   * Logout from all devices.
   */
  async logoutAllSessions(): Promise<boolean> {
    try {
      await api.delete('/api/v1/sessions/all');
      this.stopKeepAlive();
      this.sessionId = null;
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Keep Alive ====================

  /**
   * Start periodic keep-alive to maintain session.
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;

    // Send keep-alive every 5 minutes
    this.keepAliveInterval = window.setInterval(async () => {
      await this.recordActivity();
      await this.refreshSession();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic keep-alive.
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Manually trigger keep-alive.
   */
  async keepAlive(): Promise<void> {
    await this.recordActivity();
    await this.refreshSession();
  }
}

// Export singleton instance
export const sessionApi = new SessionApiService();
export default sessionApi;
