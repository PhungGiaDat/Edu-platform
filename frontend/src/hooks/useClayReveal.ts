import { useEffect, useRef } from 'react';

/**
 * useClayReveal - Hook for scroll-triggered reveal animations with stagger effect
 * 
 * Automatically observes elements with the 'clay-reveal' class and adds
 * the 'revealed' class when they enter the viewport.
 * 
 * Features:
 * - Intersection Observer for performance
 * - Respects prefers-reduced-motion
 * - Automatic cleanup
 * - One-time reveal (doesn't re-trigger)
 * 
 * @param threshold - Percentage of element visible before triggering (0-1)
 * @param rootMargin - Margin around viewport for earlier/later triggering
 * 
 * @example
 * function MyPage() {
 *   useClayReveal(0.1);
 *   
 *   return (
 *     <div>
 *       <div className="clay-card clay-reveal">Card 1</div>
 *       <div className="clay-card clay-reveal clay-stagger-1">Card 2</div>
 *       <div className="clay-card clay-reveal clay-stagger-2">Card 3</div>
 *     </div>
 *   );
 * }
 */
export const useClayReveal = (threshold: number = 0.1, rootMargin: string = '0px') => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReduced) {
      // If reduced motion is preferred, immediately reveal all elements
      document.querySelectorAll('.clay-reveal').forEach((el) => {
        (el as HTMLElement).classList.add('revealed');
      });
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add revealed class when element enters viewport
            (entry.target as HTMLElement).classList.add('revealed');
            
            // Stop observing this element (one-time reveal)
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Observe all elements with clay-reveal class
    document.querySelectorAll('.clay-reveal').forEach((el) => {
      observerRef.current?.observe(el);
    });

    // Cleanup on unmount
    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin]);
};

/**
 * Helper function to calculate stagger delay for multiple items
 * 
 * @param index - Item index (0-based)
 * @param delayMs - Delay per item in milliseconds (default: 100ms)
 * @returns Style object with transitionDelay
 * 
 * @example
 * {items.map((item, i) => (
 *   <div className="clay-reveal" style={getStaggerDelay(i)}>
 *     {item}
 *   </div>
 * ))}
 */
export function getStaggerDelay(index: number, delayMs: number = 100) {
  return {
    transitionDelay: `${index * delayMs}ms`,
  };
}
