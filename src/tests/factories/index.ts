/**
 * Factory Index - Barrel exports for test data factories
 *
 * All factories follow the pattern: create{Entity}(overrides?: Partial<T>): T
 * - Pure functions with no side effects
 * - Support partial overrides for customization
 * - Use faker for realistic random data
 *
 * Usage Pattern:
 * - Import factories for creating test data
 * - Use overrides to customize specific fields
 * - Factories are deterministic when seeded (faker.seed())
 *
 * @example
 * ```typescript
 * import {createUser, createEvent, createSurveyResponse} from '../factories'
 *
 * const user = createUser({email: 'specific@example.com'})
 * const event = createActiveEvent({code: '1234'})
 * const response = createSurveyResponse({isComplete: true})
 * ```
 */

export type {GuestCheckInRequest, TestEvent, TestEventType} from './events.factory'
// Event factories
export {
	createActiveEvent,
	createEvent,
	createEvents,
	createEventType,
	createEventTypes,
	createGuestCheckInRequest,
	generateEventCode,
	TEST_CODES
} from './events.factory'
export type {
	TestQuestionResponse,
	TestSurveyQuestion,
	TestSurveyResponse,
	TestSurveyTemplate
} from './surveys.factory'
// Survey factories
export {
	createConsentTemplate,
	createDemographicsTemplate,
	createQuestionResponse,
	createSurveyQuestion,
	createSurveyResponse,
	createSurveyResponses,
	createSurveyTemplate,
	TEST_TEMPLATES
} from './surveys.factory'
export type {
	AuthenticatedTestUser,
	FirebaseAuthError,
	MagicLinkRequest,
	TestUser,
	TokenClaims
} from './user.factory'
// User factories
export {
	createAdminUser,
	createAuthenticatedUser,
	createGuestUser,
	createMagicLinkRequest,
	createMayaUser,
	createUser,
	createUsers,
	FIREBASE_AUTH_ERRORS
} from './user.factory'
