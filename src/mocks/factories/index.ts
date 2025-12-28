/**
 * MSW Test Data Factories
 *
 * Barrel export for all mock data factories.
 * Use these in unit tests to create realistic test data.
 *
 * @example
 * ```typescript
 * import {server} from '@/mocks/server'
 * import {http, HttpResponse} from 'msw'
 * import {createMockEvent, createEventsResponse} from '@/mocks/factories'
 *
 * beforeEach(() => {
 *   server.use(
 *     http.get('/api/events', () =>
 *       HttpResponse.json(createEventsResponse([createMockEvent()]))
 *     )
 *   )
 * })
 * ```
 */

// Admin factories
export {
	createAdminErrorResponse,
	createAdminStatsResponse,
	createAdminSuccessResponse,
	createEventTypesResponse,
	createExportDataResponse,
	createFormTemplatesResponse,
	createMockAdminStats,
	createMockEventType,
	createMockFormTemplate,
	type MockAdminStats,
	type MockEventType,
	type MockFormTemplate
} from './admin.factory'
// Event factories
export {
	createEventActivationResponse,
	createEventCodeValidationResponse,
	createEventErrorResponse,
	createEventsResponse,
	createMockEvent,
	createMockEventList,
	type MockEvent
} from './event.factory'

// Survey factories
export {
	createMockQuestion,
	createMockSurvey,
	createMockSurveyResponse,
	createQuestionsResponse,
	createSurveyResponsesResponse,
	createSurveysResponse,
	type MockSurvey,
	type MockSurveyQuestion,
	type MockSurveyResponse
} from './survey.factory'
// User factories
export {
	createMockAdminUser,
	createMockUser,
	createMockUserClaims,
	createProfileResponse,
	createUserErrorResponse,
	createUsersListResponse,
	type MockUser,
	type MockUserClaims
} from './user.factory'
