/**
 * A collection of helper utilities for working with Express and TypeScript
 */

/**
 * This is a no-op function that's used to help TypeScript understand
 * that a response object should be ignored as a return value.
 * 
 * Usage:
 * 
 * router.get('/', (req, res) => {
 *   // Some code here
 *   noReturn(res.json({ success: true }));
 * });
 */
export function noReturn(value: any): void {
  // This function does nothing, it just helps TypeScript understand
  // that we're intentionally not returning the value
} 