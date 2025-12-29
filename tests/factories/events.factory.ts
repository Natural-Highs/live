/**
 * Event Data Factory
 *
 * Generates test event data for E2E and integration tests.
 * Uses faker for realistic random data with override support.
 *
 * Pattern: data-factories.md
 *
 * Usage:
 *   const event = createEvent({ code: '1234' })
 *   const events = createEvents(5)
 */

import {faker} from '@faker-js/faker'

/**
 * Event entity matching Firestore event document structure
 */
export interface TestEvent {
	id: string
	name: string
	code: string
	eventTypeId: string
	eventDate: string
	isActive: boolean
	activatedAt?: string
	surveyAccessibleAt?: string
	surveyAccessibleOverride?: boolean
	collectAdditionalDemographics: boolean
	consentFormTemplateId?: string
	demographicsFormTemplateId?: string
	surveyTemplateId?: string
	createdAt: string
	updatedAt: string
}

/**
 * Event type entity
 */
export interface TestEventType {
	id: string
	name: string
	defaultConsentFormTemplateId?: string
	defaultDemographicsFormTemplateId?: string
	defaultSurveyTemplateId?: string
	createdAt: string
}

/**
 * Create a single test event with optional overrides
 *
 * @example
 * const event = createEvent()
 * const activeEvent = createEvent({ code: '1234', isActive: true })
 */
export function createEvent(overrides: Partial<TestEvent> = {}): TestEvent {
	const now = new Date().toISOString()
	return {
		id: faker.string.uuid(),
		name: `${faker.company.name()} Event`,
		code: faker.string.numeric(4),
		eventTypeId: faker.string.uuid(),
		eventDate: faker.date.future().toISOString(),
		isActive: false,
		collectAdditionalDemographics: false,
		createdAt: now,
		updatedAt: now,
		...overrides
	}
}

/**
 * Create multiple test events
 *
 * @example
 * const events = createEvents(5)
 */
export function createEvents(count: number): TestEvent[] {
	return Array.from({length: count}, () => createEvent())
}

/**
 * Create an active event with code
 *
 * @example
 * const activeEvent = createActiveEvent({ code: '5678' })
 */
export function createActiveEvent(overrides: Partial<TestEvent> = {}): TestEvent {
	const now = new Date().toISOString()
	const surveyAccessibleAt = new Date(Date.now() + 7200000).toISOString() // 2 hours from now

	return createEvent({
		isActive: true,
		activatedAt: now,
		surveyAccessibleAt,
		...overrides
	})
}

/**
 * Create a test event type with optional overrides
 *
 * @example
 * const eventType = createEventType()
 */
export function createEventType(overrides: Partial<TestEventType> = {}): TestEventType {
	return {
		id: faker.string.uuid(),
		name: faker.company.buzzPhrase(),
		createdAt: faker.date.recent().toISOString(),
		...overrides
	}
}

/**
 * Create multiple test event types
 *
 * @example
 * const eventTypes = createEventTypes(3)
 */
export function createEventTypes(count: number): TestEventType[] {
	return Array.from({length: count}, () => createEventType())
}

/**
 * Generate a unique 4-digit event code
 */
export function generateEventCode(): string {
	return faker.string.numeric(4)
}

/**
 * Standard test codes for consistent testing
 */
export const TEST_CODES = {
	VALID: '1234',
	INVALID: '0000',
	EXPIRED: '9999'
} as const

/**
 * Create a guest check-in request
 */
export interface GuestCheckInRequest {
	eventCode: string
	firstName: string
	lastName: string
	email?: string
	phone?: string
	agreed: boolean
}

/**
 * Create guest check-in request data
 */
export function createGuestCheckInRequest(
	overrides: Partial<GuestCheckInRequest> = {}
): GuestCheckInRequest {
	return {
		eventCode: TEST_CODES.VALID,
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		email: faker.internet.email(),
		agreed: true,
		...overrides
	}
}
