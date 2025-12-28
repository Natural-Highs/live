/**
 * Survey Factory for MSW Unit Tests
 *
 * Provides mock survey, question, and response data for unit tests.
 *
 * @example
 * ```typescript
 * import {server} from '@/mocks/server'
 * import {http, HttpResponse} from 'msw'
 * import {createMockSurvey, createSurveysResponse} from '@/mocks/factories'
 *
 * beforeEach(() => {
 *   server.use(
 *     http.get('/api/surveys/*', () =>
 *       HttpResponse.json(createSurveysResponse([createMockSurvey()]))
 *     )
 *   )
 * })
 * ```
 */

export interface MockSurveyQuestion {
	id: string
	text: string
	type: 'text' | 'number' | 'select' | 'multiselect' | 'scale'
	required: boolean
	options?: string[]
	minValue?: number
	maxValue?: number
}

export interface MockSurvey {
	id: string
	name: string
	description: string
	type: 'pre' | 'post' | 'consent'
	questions: MockSurveyQuestion[]
	isActive: boolean
	createdAt: string
	updatedAt: string
}

export interface MockSurveyResponse {
	id: string
	surveyId: string
	userId: string
	eventId: string
	answers: Record<string, unknown>
	submittedAt: string
	createdAt: string
}

/**
 * Create a mock survey question.
 */
export function createMockQuestion(
	overrides: Partial<MockSurveyQuestion> = {}
): MockSurveyQuestion {
	return {
		id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		text: 'How are you feeling today?',
		type: 'scale',
		required: true,
		minValue: 1,
		maxValue: 10,
		...overrides
	}
}

/**
 * Create a mock survey.
 */
export function createMockSurvey(overrides: Partial<MockSurvey> = {}): MockSurvey {
	const now = new Date().toISOString()

	return {
		id: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		name: 'Test Survey',
		description: 'A test survey for unit testing',
		type: 'pre',
		questions: [
			createMockQuestion({text: 'Rate your mood', type: 'scale'}),
			createMockQuestion({text: 'Any comments?', type: 'text', required: false})
		],
		isActive: true,
		createdAt: now,
		updatedAt: now,
		...overrides
	}
}

/**
 * Create a mock survey response.
 */
export function createMockSurveyResponse(
	overrides: Partial<MockSurveyResponse> = {}
): MockSurveyResponse {
	const now = new Date().toISOString()

	return {
		id: `response-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		surveyId: 'survey-1',
		userId: 'user-1',
		eventId: 'event-1',
		answers: {
			'question-1': 8,
			'question-2': 'Feeling great!'
		},
		submittedAt: now,
		createdAt: now,
		...overrides
	}
}

/**
 * Create a surveys list API response.
 */
export function createSurveysResponse(surveys: MockSurvey[] = []) {
	return {
		success: true,
		surveys
	}
}

/**
 * Create a survey questions API response.
 */
export function createQuestionsResponse(questions: MockSurveyQuestion[] = []) {
	return {
		success: true,
		questions
	}
}

/**
 * Create a survey responses API response.
 */
export function createSurveyResponsesResponse(responses: MockSurveyResponse[] = []) {
	return {
		success: true,
		responses
	}
}
