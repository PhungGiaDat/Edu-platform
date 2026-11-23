/**
 * HapticService - Vibration feedback for mobile interactions
 * 
 * Provides tactile feedback for various user interactions.
 * Falls back gracefully on devices that don't support vibration.
 * 
 * Usage:
 *   HapticService.tap();         // Light tap feedback
 *   HapticService.success();     // Success pattern
 *   HapticService.error();       // Error pattern
 *   HapticService.combo();       // Exciting combo discovery
 */

type VibrationPattern = number | number[];

interface HapticPatterns {
  tap: VibrationPattern;
  success: VibrationPattern;
  error: VibrationPattern;
  warning: VibrationPattern;
  combo: VibrationPattern;
  levelUp: VibrationPattern;
  buttonPress: VibrationPattern;
  cardFlip: VibrationPattern;
  match: VibrationPattern;
  notification: VibrationPattern;
  reward: VibrationPattern;
  chestOpen: VibrationPattern;
}

// Vibration patterns in milliseconds
// Single number = vibrate for that duration
// Array = alternating vibrate/pause pattern
const HAPTIC_PATTERNS: HapticPatterns = {
  // Light tap for buttons
  tap: 10,
  
  // Success feedback (short-pause-short)
  success: [30, 50, 30],
  
  // Error feedback (longer, more noticeable)
  error: [80, 30, 80],
  
  // Warning (single medium buzz)
  warning: 50,
  
  // Combo discovered! (exciting pattern)
  combo: [30, 30, 30, 30, 100],
  
  // Level up celebration
  levelUp: [50, 50, 50, 50, 50, 50, 150],
  
  // Button press (very light)
  buttonPress: 8,
  
  // Card flip in memory game
  cardFlip: 15,
  
  // Match found
  match: [40, 40, 40],
  
  // Notification received
  notification: [20, 100, 20],
  
  // Reward/treasure chest
  reward: [40, 60, 40, 60, 80],
  
  // Chest opening
  chestOpen: [50, 40, 50, 40, 100],
};

class HapticServiceClass {
  private enabled: boolean = true;
  private supported: boolean = false;

  constructor() {
    // Check if vibration is supported
    this.supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    
    // Load user preference from localStorage
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('haptic_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    }
  }

  /**
   * Check if haptic feedback is available
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Check if haptic feedback is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.supported;
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('haptic_enabled', String(enabled));
    }
  }

  /**
   * Toggle haptic feedback on/off
   */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Core vibration method
   */
  private vibrate(pattern: VibrationPattern): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    
    try {
      return navigator.vibrate(pattern);
    } catch {
      // Silently fail - vibration may not work in all contexts
      return false;
    }
  }

  /**
   * Stop any ongoing vibration
   */
  stop(): void {
    if (this.supported) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore errors
      }
    }
  }

  // ========== Preset Patterns ==========

  /**
   * Light tap - for buttons, toggles
   */
  tap(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.tap);
  }

  /**
   * Success feedback - correct answer, completed action
   */
  success(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.success);
  }

  /**
   * Error feedback - wrong answer, failed action
   */
  error(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.error);
  }

  /**
   * Warning feedback - attention needed
   */
  warning(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.warning);
  }

  /**
   * Combo discovered - exciting pattern
   */
  combo(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.combo);
  }

  /**
   * Level up celebration
   */
  levelUp(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.levelUp);
  }

  /**
   * Button press - very light
   */
  buttonPress(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.buttonPress);
  }

  /**
   * Card flip in memory game
   */
  cardFlip(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.cardFlip);
  }

  /**
   * Match found in game
   */
  match(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.match);
  }

  /**
   * Notification received
   */
  notification(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.notification);
  }

  /**
   * Reward received - exciting celebration pattern
   */
  reward(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.reward);
  }

  /**
   * Chest opening - treasure reveal
   */
  chestOpen(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.chestOpen);
  }

  /**
   * Custom vibration pattern
   */
  custom(pattern: VibrationPattern): boolean {
    return this.vibrate(pattern);
  }
}

// Export singleton instance
export const HapticService = new HapticServiceClass();

// Export class for testing
export { HapticServiceClass };

// Default export for convenience
export default HapticService;
