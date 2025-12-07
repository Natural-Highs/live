/**
 * Utility functions for generating event codes
 */

/**
 * Generate a random 4-digit event code
 * @returns A string containing a 4-digit number between 1000 and 9999
 */
export function generateUniqueEventCode(): string {
  const min = 1000;
  const max = 9999;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
