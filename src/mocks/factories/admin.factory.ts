/**
 * Admin Factory for MSW Unit Tests
 *
 * Provides mock admin dashboard data, stats, and export data.
 *
 * @example
 * ```typescript
 * import {server} from '@/mocks/server'
 * import {http, HttpResponse} from 'msw'
 * import {createAdminStatsResponse} from '@/mocks/factories'
 *
 * beforeEach(() => {
 *   server.use(
 *     http.get('/api/admin/stats', () =>
 *       HttpResponse.json(createAdminStatsResponse({totalUsers: 150}))
 *     )
 *   )
 * })
 * ```
 */

export interface MockAdminStats {
	totalUsers: number
	totalEvents: number
	totalResponses: number
	activeEvents: number
	completedEvents: number
	averageResponseRate: number
}

export interface MockEventType {
	id: string
	name: string
	description: string
	color: string
	isActive: boolean
}

export interface MockFormTemplate {
	id: string
	name: string
	type: 'consent' | 'survey' | 'registration'
	fields: number
	isActive: boolean
	createdAt: string
}

/**
 * Create mock admin dashboard stats.
 */
export function createMockAdminStats(overrides: Partial<MockAdminStats> = {}): MockAdminStats {
	return {
		totalUsers: 100,
		totalEvents: 25,
		totalResponses: 500,
		activeEvents: 5,
		completedEvents: 20,
		averageResponseRate: 0.75,
		...overrides
	}
}

/**
 * Create admin stats API response.
 */
export function createAdminStatsResponse(stats: Partial<MockAdminStats> = {}) {
	return {
		success: true,
		stats: createMockAdminStats(stats)
	}
}

/**
 * Create a mock event type.
 */
export function createMockEventType(overrides: Partial<MockEventType> = {}): MockEventType {
	return {
		id: `event-type-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		name: 'Workshop',
		description: 'Interactive workshop session',
		color: '#22c55e',
		isActive: true,
		...overrides
	}
}

/**
 * Create event types list response.
 */
export function createEventTypesResponse(eventTypes: MockEventType[] = []) {
	if (eventTypes.length === 0) {
		eventTypes = [
			createMockEventType({name: 'Workshop', color: '#22c55e'}),
			createMockEventType({name: 'Seminar', color: '#3b82f6'}),
			createMockEventType({name: 'Training', color: '#f59e0b'})
		]
	}
	return {
		success: true,
		eventTypes
	}
}

/**
 * Create a mock form template.
 */
export function createMockFormTemplate(
	overrides: Partial<MockFormTemplate> = {}
): MockFormTemplate {
	const now = new Date().toISOString()

	return {
		id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		name: 'Default Consent Form',
		type: 'consent',
		fields: 5,
		isActive: true,
		createdAt: now,
		...overrides
	}
}

/**
 * Create form templates list response.
 */
export function createFormTemplatesResponse(templates: MockFormTemplate[] = []) {
	if (templates.length === 0) {
		templates = [
			createMockFormTemplate({name: 'Consent Form', type: 'consent'}),
			createMockFormTemplate({name: 'Pre-Survey', type: 'survey'}),
			createMockFormTemplate({name: 'Registration', type: 'registration'})
		]
	}
	return {
		success: true,
		templates
	}
}

/**
 * Create export data response.
 */
export function createExportDataResponse(format: 'json' | 'csv' = 'json', data: unknown[] = []) {
	if (format === 'csv') {
		return {
			success: true,
			format: 'csv',
			data: 'id,userId,eventId,submittedAt\n1,user-1,event-1,2024-01-15T10:00:00Z'
		}
	}
	return {
		success: true,
		format: 'json',
		data
	}
}

/**
 * Create a generic admin success response.
 */
export function createAdminSuccessResponse(data: Record<string, unknown> = {}) {
	return {
		success: true,
		...data
	}
}

/**
 * Create an admin error response.
 */
export function createAdminErrorResponse(error: string, code = 'ADMIN_ERROR') {
	return {
		success: false,
		error,
		code
	}
}
