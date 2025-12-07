/**
 * Environment configuration
 * All environment detection should use these constants
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const useEmulators = isDevelopment; // Always use emulators in dev

if (isDevelopment && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.warn('⚠️  FIREBASE_AUTH_EMULATOR_HOST not set - emulator tokens may not work correctly');
}

export default {
  isDevelopment,
  isProduction,
  useEmulators,
};
