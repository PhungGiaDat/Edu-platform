// frontend-web/src/services/sessionApi.ts
/**
 * Session API Service
 * Handles session management, app lock, and time tracking with Redis backend.
 */

import { api } from './axiosConfig';

export interface LockState {
  user_id: string;
  is_active: boolean;
  is_locked: boolean;
  started_at?: string;
  last_activity?: string;
  active_topic?: string;
  idle_seconds?: number;
  duration_seconds?: number;
  lock_reason?: string;
  state?: 'active' | 'warning' | 'locked' | 'paused' | 'unlocked';
  ttl_seconds?: number;
  remaining_seconds?: number;
  warning_threshold_seconds?: number;
  is_paused?: boolean;
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
  /**
   * Start a new app lock session (POST /session-lock/start).
   */
  async startLock(
    ttlMinutes?: number,
    metadata?: Record<string, unknown>
  ): Promise<LockState> {
    const response = await api.post('/api/v1/session-lock/start', {
      active_topic: metadata?.active_topic as string | undefined,
      device_info: metadata?.device_info as Record<string, unknown> | undefined,
    });
    return response.data;
  }

  /**
   * Get current lock status (GET /session-lock/status).
   */
  async getLockState(): Promise<LockState | null> {
    try {
      const response = await api.get('/api/v1/session-lock/status');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Send heartbeat to keep session alive (POST /session-lock/heartbeat).
   * Called every 60s by SessionContext.
   */
  async heartbeat(activeTopic?: string): Promise<unknown> {
    try {
      const response = await api.post('/api/v1/session-lock/heartbeat', {
        active_topic: activeTopic,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Pause the session timer (POST /session-lock/pause).
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
   * Resume the session timer (POST /session-lock/resume).
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
   * End/unlock session (POST /session-lock/unlock).
   */
  async unlock(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/unlock');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extend lock time by extra_minutes (POST /session-lock/extend).
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
   * End tracked session (POST /session-lock/end).
   */
  async endSession(): Promise<boolean> {
    try {
      await api.post('/api/v1/session-lock/end');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get today's usage statistics (GET /session-lock/usage/today).
   */
  async getUsageToday(): Promise<UsageStats | null> {
    try {
      const response = await api.get('/api/v1/session-lock/usage/today');
      return response.data;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const sessionApi = new SessionApiService();
export default sessionApi;
