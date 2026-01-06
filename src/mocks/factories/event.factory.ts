/**
 * Event Factory for Unit Tests
 *
 * Provides mock event data for unit tests.
 *
 * @example
 * ```typescript
 * import {createMockEvent, createMockEventList} from '@/mocks/factories'
 *
 * const event = createMockEvent({name: 'Test Event'})
 * const events = createMockEventList(5)
 * ```
 */

export interface MockEvent {
	id: string
	name: string
	eventCode: string
	eventTypeId: string
	startDate: string
	endDate: string
	location: string
	description: string
	isActive: boolean
	requiresConsent: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Create a mock event with sensible defaults.
 */
export function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
	const now = new Date().toISOString()
	const tomorrow = new Date(Date.now() + 86400000).toISOString()

	return {
		id: `event-${crypto.randomUUID().slice(0, 8)}`,
		name: 'Test Event',
		eventCode: '1234',
		eventTypeId: 'event-type-1',
		startDate: tomorrow,
		endDate: new Date(Date.now() + 172800000).toISOString(),
		location: 'Test Location',
		description: 'A test event for unit testing',
		isActive: true,
		requiresConsent: true,
		createdAt: now,
		updatedAt: now,
		...overrides
	}
}

/**
 * Create a list of mock events.
 */
export function createMockEventList(count: number = 3): MockEvent[] {
	return Array.from({length: count}, (_, i) =>
		createMockEvent({
			name: `Test Event ${i + 1}`,
			eventCode: `${1000 + i}`
		})
	)
}

/**
 * Create an events list API response.
 */
export function createEventsResponse(events: MockEvent[] = []) {
	return {
		success: true,
		events
	}
}

/**
 * Create an event activation API response.
 */
export function createEventActivationResponse(eventId: string, activated: boolean = true) {
	return {
		success: true,
		eventId,
		activated,
		message: activated ? 'Event activated' : 'Event deactivated'
	}
}

/**
 * Create an event code validation API response.
 */
export function createEventCodeValidationResponse(
	valid: boolean = true,
	event: MockEvent | null = null
) {
	if (!valid) {
		return {
			success: false,
			valid: false,
			error: 'Invalid event code'
		}
	}
	return {
		success: true,
		valid: true,
		event: event || createMockEvent()
	}
}

/**
 * Create an event error response.
 */
export function createEventErrorResponse(error: string, code = 'EVENT_ERROR') {
	return {
		success: false,
		error,
		code
	}
}
