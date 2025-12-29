/**
 * Survey Data Factory
 *
 * Generates test survey and response data for E2E and integration tests.
 * Uses faker for realistic random data with override support.
 *
 * Pattern: data-factories.md
 *
 * Usage:
 *   const response = createSurveyResponse()
 *   const template = createSurveyTemplate({ name: 'Post-Event Survey' })
 */

import {faker} from '@faker-js/faker'

/**
 * Survey template structure
 */
export interface TestSurveyTemplate {
	id: string
	name: string
	type: 'consent' | 'demographics' | 'survey'
	questions: TestSurveyQuestion[]
	createdAt: string
	updatedAt: string
}

/**
 * Survey question structure
 */
export interface TestSurveyQuestion {
	id: string
	text: string
	type: 'text' | 'checkbox' | 'radio' | 'scale' | 'boolean'
	required: boolean
	options?: string[]
}

/**
 * Survey response structure
 */
export interface TestSurveyResponse {
	id: string
	userId: string
	surveyId: string
	eventId: string
	isComplete: boolean
	createdAt: string
	user: {
		id: string
		email: string
		firstName: string
		lastName: string
	}
	survey: {
		id: string
		name: string
	}
	questionResponses: TestQuestionResponse[]
}

/**
 * Individual question response
 */
export interface TestQuestionResponse {
	id: string
	questionId: string
	responseText: string
}

/**
 * Create a single survey question
 *
 * @example
 * const question = createSurveyQuestion({ text: 'How satisfied are you?' })
 */
export function createSurveyQuestion(
	overrides: Partial<TestSurveyQuestion> = {}
): TestSurveyQuestion {
	return {
		id: faker.string.uuid(),
		text: faker.lorem.sentence(),
		type: 'text',
		required: true,
		...overrides
	}
}

/**
 * Create a survey template with optional overrides
 *
 * @example
 * const template = createSurveyTemplate({ name: 'Post-Event Survey' })
 */
export function createSurveyTemplate(
	overrides: Partial<TestSurveyTemplate> = {}
): TestSurveyTemplate {
	const now = new Date().toISOString()
	return {
		id: faker.string.uuid(),
		name: `${faker.company.buzzPhrase()} Survey`,
		type: 'survey',
		questions: [
			createSurveyQuestion({text: 'How would you rate your overall experience?', type: 'scale'}),
			createSurveyQuestion({text: 'What did you enjoy most?', type: 'text'}),
			createSurveyQuestion({text: 'Would you recommend this to others?', type: 'boolean'})
		],
		createdAt: now,
		updatedAt: now,
		...overrides
	}
}

/**
 * Create a consent form template
 *
 * @example
 * const consent = createConsentTemplate()
 */
export function createConsentTemplate(
	overrides: Partial<TestSurveyTemplate> = {}
): TestSurveyTemplate {
	return createSurveyTemplate({
		name: 'Standard Consent Form',
		type: 'consent',
		questions: [
			createSurveyQuestion({
				text: 'I understand the terms of participation',
				type: 'checkbox',
				required: true
			}),
			createSurveyQuestion({
				text: 'I agree to have my data collected',
				type: 'checkbox',
				required: true
			})
		],
		...overrides
	})
}

/**
 * Create a demographics form template
 *
 * @example
 * const demographics = createDemographicsTemplate()
 */
export function createDemographicsTemplate(
	overrides: Partial<TestSurveyTemplate> = {}
): TestSurveyTemplate {
	return createSurveyTemplate({
		name: 'Standard Demographics',
		type: 'demographics',
		questions: [
			createSurveyQuestion({text: 'What is your age range?', type: 'radio'}),
			createSurveyQuestion({text: 'What is your gender?', type: 'radio'}),
			createSurveyQuestion({text: 'What is your ethnicity?', type: 'radio'})
		],
		...overrides
	})
}

/**
 * Create a question response
 *
 * @example
 * const qr = createQuestionResponse({ questionId: 'q1', responseText: 'Very satisfied' })
 */
export function createQuestionResponse(
	overrides: Partial<TestQuestionResponse> = {}
): TestQuestionResponse {
	return {
		id: faker.string.uuid(),
		questionId: faker.string.uuid(),
		responseText: faker.lorem.sentence(),
		...overrides
	}
}

/**
 * Create a survey response with optional overrides
 *
 * @example
 * const response = createSurveyResponse()
 * const completeResponse = createSurveyResponse({ isComplete: true })
 */
export function createSurveyResponse(
	overrides: Partial<TestSurveyResponse> = {}
): TestSurveyResponse {
	const userId = faker.string.uuid()
	const surveyId = faker.string.uuid()

	return {
		id: `response-${Date.now()}-${faker.string.alphanumeric(4)}`,
		userId,
		surveyId,
		eventId: faker.string.uuid(),
		isComplete: true,
		createdAt: new Date().toISOString(),
		user: {
			id: userId,
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName()
		},
		survey: {
			id: surveyId,
			name: 'Post-Event Survey'
		},
		questionResponses: [
			createQuestionResponse({questionId: 'q1', responseText: 'Very satisfied'}),
			createQuestionResponse({questionId: 'q2', responseText: 'Great experience'})
		],
		...overrides
	}
}

/**
 * Create multiple survey responses
 *
 * @example
 * const responses = createSurveyResponses(10)
 */
export function createSurveyResponses(count: number): TestSurveyResponse[] {
	return Array.from({length: count}, (_, i) => createSurveyResponse({id: `response-${i + 1}`}))
}

/**
 * Standard survey templates for consistent testing
 */
export const TEST_TEMPLATES = {
	CONSENT: createConsentTemplate({id: 'consent-1', name: 'Standard Consent'}),
	DEMOGRAPHICS: createDemographicsTemplate({id: 'demo-1', name: 'Standard Demographics'}),
	SURVEY: createSurveyTemplate({id: 'survey-1', name: 'Post-Event Survey'})
} as const
