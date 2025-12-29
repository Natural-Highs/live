/**
 * Fixture Index - Barrel exports with mergeTests composition
 *
 * This file provides the standard test fixture for E2E tests by
 * composing multiple specialized fixtures using Playwright's mergeTests().
 *
 * Usage Pattern:
 * - Import `test` and `expect` from this file for E2E tests
 * - All fixtures from auth, events, session are available
 * - For admin-specific tests, import from admin.fixture.ts instead
 *
 * Fixture Composition Architecture:
 * - base (Playwright) → auth → admin
 * - base (Playwright) → events
 * - Merged: auth + events = test
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 *
 * test('user can check in to event', async ({
 *   page,
 *   authenticatedUser,
 *   mockActiveEvent,
 *   mockEventCodeValidation
 * }) => {
 *   await mockEventCodeValidation(mockActiveEvent)
 *   await page.goto('/check-in')
 *   // ... test implementation
 * })
 * ```
 */

import {mergeTests} from '@playwright/test'
import {test as authTest} from './auth.fixture'
import {test as eventsTest} from './events.fixture'
import {test as firebaseResetTest} from './firebase-reset.fixture'
import {test as networkTest} from './network.fixture'

/**
 * Merged test fixture combining auth, events, network, and firebase-reset fixtures.
 *
 * Provides:
 * - From auth.fixture: authenticatedUser, setMagicLinkEmail, clearMagicLinkEmail,
 *   mockSuccessfulMagicLinkSignIn, mockFailedMagicLinkSignIn
 * - From events.fixture: mockActiveEvent, mockEventCodeValidation, mockEventCheckIn,
 *   mockEventList, mockEventCreation, mockEventActivation
 * - From network.fixture: mockApi (MockApiHelper for typed, chainable API mocking)
 * - From firebase-reset.fixture: autoCleanFirestore (auto-cleanup before each test)
 */
export const test = mergeTests(authTest, eventsTest, networkTest, firebaseResetTest)

/**
 * Re-export expect from Playwright for convenience.
 */
export {expect} from '@playwright/test'
export {test as adminTest} from './admin.fixture'
/**
 * Re-export individual fixtures for selective composition.
 * Use these when you need specific fixtures without full merge.
 */
/**
 * Re-export pure functions from fixtures for unit test compatibility.
 */
export {
	buildFirebaseAuthResponse,
	buildFirebaseErrorResponse,
	createMockUser,
	test as authTest
} from './auth.fixture'
export type {MockEvent} from './events.fixture'
export {
	buildCheckInErrorResponse,
	buildCheckInSuccessResponse,
	buildEventActivationResponse,
	buildEventCodeValidationResponse,
	buildEventCreationResponse,
	buildEventsListResponse,
	createMockEvent,
	test as eventsTest
} from './events.fixture'
export {test as firebaseResetTest} from './firebase-reset.fixture'
export type {MinorDemographicsData, TestUserDocument} from './firestore.fixture'
/**
 * Re-export Firestore helpers for data seeding.
 */
export {
	clearFirestoreEmulator,
	createTestUser,
	createTestUserDocument,
	deleteTestUser,
	deleteTestUserDocument,
	isFirestoreEmulatorAvailable
} from './firestore.fixture'
export {MockApiHelper, test as networkTest} from './network.fixture'
export type {SessionData, TestClaims, TestUser, TestUserDocData} from './session.fixture'
/**
 * Re-export session helpers for direct session manipulation.
 */
export {
	buildTestSessionCookie,
	clearAuthenticatedUser,
	clearSessionCookie,
	injectAdminSessionCookie,
	injectAuthenticatedUser,
	injectSessionCookie,
	unsealTestSessionCookie
} from './session.fixture'
