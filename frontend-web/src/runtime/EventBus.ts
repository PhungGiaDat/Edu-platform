// src/runtime/EventBus.ts
import type { IEventBus } from '@/core/interfaces/IEventBus';

/**
 * EventBus Implementation - Singleton Pattern
 * Pub/sub system cho AR events
 */
class EventBus implements IEventBus {
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Subscribe to an event
   */
  on<T>(event: string, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe from an event
   */
  off<T>(event: string, callback: (data: T) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<T>(event: string, callback: (data: T) => void): void {
    const onceWrapper = (data: T) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size || 0;
    }
    let total = 0;
    this.listeners.forEach(set => total += set.size);
    return total;
  }
}

/**
 * Export singleton instance
 */
export const eventBus = new EventBus();

/**
 * Export class for testing
 */
export { EventBus };