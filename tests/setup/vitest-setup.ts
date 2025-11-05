import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll } from 'vitest';

// Configure test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_PROJECT_ID = 'test-project';
process.env.VITE_APIKEY = 'test-api-key';
process.env.VITE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Setup Firebase emulators for testing
beforeAll(() => {
  // Verify emulators are accessible
  // Tests will fail if emulators aren't running
});

afterAll(() => {
  // Cleanup if needed
});
