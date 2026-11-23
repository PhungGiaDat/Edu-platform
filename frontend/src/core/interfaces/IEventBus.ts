// src/core/interfaces/IEventBus.ts
/**
 * Event Bus Interface
 * Contract for pub/sub communication system
 */

export interface IEventBus {
  /**
   * Subscribe to an event
   */
  on<T>(event: string, callback: (data: T) => void): void;

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: string, data: T): void;

  /**
   * Unsubscribe from an event
   */
  off<T>(event: string, callback: (data: T) => void): void;

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<T>(event: string, callback: (data: T) => void): void;

  /**
   * Clear all listeners
   */
  clear(): void;
}