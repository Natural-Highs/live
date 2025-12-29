/**
 * MSW Default Handlers
 *
 * Provides default API responses for unit tests.
 * Uses factories for realistic mock data.
 *
 * Override in individual tests using server.use():
 * @example
 * ```typescript
 * import {server} from '@/mocks/server'
 * import {http, HttpResponse} from 'msw'
 * import {createEventsResponse, createMockEvent} from '@/mocks/factories'
 *
 * beforeEach(() => {
 *   server.use(
 *     http.get('/api/events', () =>
 *       HttpResponse.json(createEventsResponse([
 *         createMockEvent({name: 'Custom Event'})
 *       ]))
 *     )
 *   )
 * })
 * ```
 */

import {HttpResponse, http} from 'msw'
import {
	createAdminStatsResponse,
	createEventsResponse,
	createEventTypesResponse,
	createFormTemplatesResponse,
	createMockEvent,
	createProfileResponse,
	createQuestionsResponse,
	createSurveysResponse
} from './factories'

export const handlers = [
	// Events API - returns sample event data
	http.get('/api/events', () => {
		return HttpResponse.json(createEventsResponse([createMockEvent()]))
	}),

	// Users/Profile API
	http.get('/api/users/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.post('/api/users/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.get('/api/profile', () => {
		return HttpResponse.json(createProfileResponse(null))
	}),

	// Admin API
	http.get('/api/admin/stats', () => {
		return HttpResponse.json(createAdminStatsResponse())
	}),
	http.get('/api/admin/*', () => {
		return HttpResponse.json({success: true, data: []})
	}),

	// Forms API
	http.get('/api/forms/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.post('/api/forms/*', () => {
		return HttpResponse.json({success: true})
	}),

	// Surveys API
	http.get('/api/surveys/*', () => {
		return HttpResponse.json(createSurveysResponse([]))
	}),
	http.get('/api/surveyQuestions', () => {
		return HttpResponse.json(createQuestionsResponse([]))
	}),

	// Event Types API
	http.get('/api/eventTypes', () => {
		return HttpResponse.json(createEventTypesResponse())
	}),

	// Form Templates API
	http.get('/api/formTemplates', () => {
		return HttpResponse.json(createFormTemplatesResponse())
	})
]
