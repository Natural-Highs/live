import {createServerFn} from '@tanstack/react-start'
import {adminDb} from '@/lib/firebase/firebase.admin'
import {requireAuth, requireConsent} from '@/server/middleware/auth'
import {
	getAccessibleSurveysSchema,
	getSurveyByIdSchema,
	getSurveyQuestionsSchema,
	submitResponseSchema,
	submitUserResponseSchema
} from '../schemas/surveys'
import {ConflictError, NotFoundError} from './utils/errors'

/**
 * Submit survey response
 * Requires consent form to be signed
 */
export const submitResponse = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => submitResponseSchema.parse(d))
	.handler(async ({data}) => {
		const user = await requireConsent()

		const {eventId, surveyType, responses} = data

		// Check if user is registered for event
		const eventDoc = await adminDb.collection('events').doc(eventId).get()

		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()
		const participants = eventData?.participants || []

		if (!participants.includes(user.uid)) {
			throw new ConflictError('User not registered for this event')
		}

		// Check if response already exists
		const existingResponse = await adminDb
			.collection('responses')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventId)
			.where('surveyType', '==', surveyType)
			.limit(1)
			.get()

		if (!existingResponse.empty) {
			throw new ConflictError(`${surveyType} survey response already submitted`)
		}

		// Create response document
		const responseData = {
			userId: user.uid,
			eventId,
			surveyType,
			responses,
			submittedAt: new Date(),
			createdAt: new Date()
		}

		const responseRef = await adminDb.collection('responses').add(responseData)

		return {
			id: responseRef.id,
			...responseData,
			submittedAt: responseData.submittedAt.toISOString(),
			createdAt: responseData.createdAt.toISOString(),
			// biome-ignore lint/suspicious/noExplicitAny: TanStack Start serialization requires flexible object types
			responses: responseData.responses as Record<string, any>
		}
	})

/**
 * Get survey questions template
 * Public endpoint - no auth required
 */
export const getSurveyQuestions = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => getSurveyQuestionsSchema.parse(d))
	.handler(async ({data}) => {
		const {surveyType} = data

		const snapshot = await adminDb
			.collection('surveyTemplates')
			.where('type', '==', surveyType)
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (snapshot.empty) {
			throw new NotFoundError(`No active ${surveyType} survey template found`)
		}

		const doc = snapshot.docs[0]
		const templateData = doc.data()

		return {
			id: doc.id,
			...templateData,
			createdAt: templateData.createdAt?.toDate?.()?.toISOString() ?? templateData.createdAt,
			updatedAt: templateData.updatedAt?.toDate?.()?.toISOString() ?? templateData.updatedAt
		}
	})

/**
 * Get accessible surveys for user and event
 * Returns which surveys (pre/post) are available based on timing and status
 */
export const getAccessibleSurveys = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => getAccessibleSurveysSchema.parse(d))
	.handler(async ({data}) => {
		const user = await requireAuth()

		const {eventId} = data

		// Get event data
		const eventDoc = await adminDb.collection('events').doc(eventId).get()

		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()
		if (!eventData) {
			throw new NotFoundError('Event data not found')
		}
		const now = new Date()
		const startDate = eventData.startDate?.toDate?.() ?? new Date(eventData.startDate)
		const endDate = eventData.endDate?.toDate?.() ?? new Date(eventData.endDate)

		// Check if user is registered
		const participants = eventData.participants || []
		const isRegistered = participants.includes(user.uid)

		if (!isRegistered) {
			return {
				preSurveyAccessible: false,
				postSurveyAccessible: false,
				reason: 'Not registered for event'
			}
		}

		// Check existing responses
		const responsesSnapshot = await adminDb
			.collection('responses')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventId)
			.get()

		const hasPreResponse = responsesSnapshot.docs.some(doc => doc.data().surveyType === 'pre')
		const hasPostResponse = responsesSnapshot.docs.some(doc => doc.data().surveyType === 'post')

		// Pre-survey: accessible before event starts (unless already submitted)
		const preSurveyEnabled = eventData.preSurveyEnabled ?? true
		const preSurveyAccessible = preSurveyEnabled && now < startDate && !hasPreResponse

		// Post-survey: accessible after event ends (unless already submitted)
		const postSurveyEnabled = eventData.postSurveyEnabled ?? true
		const postSurveyAccessible = postSurveyEnabled && now > endDate && !hasPostResponse

		return {
			preSurveyAccessible,
			postSurveyAccessible,
			hasPreResponse,
			hasPostResponse,
			eventStarted: now >= startDate,
			eventEnded: now >= endDate
		}
	})

/**
 * Get all accessible surveys for current user across all their events
 * Used by surveys index page
 */
export const getAllAccessibleSurveys = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	// Get all events user is registered for
	const eventsSnapshot = await adminDb
		.collection('events')
		.where('participants', 'array-contains', user.uid)
		.get()

	if (eventsSnapshot.empty) {
		return {surveys: []}
	}

	const now = new Date()
	const surveys: Array<{
		eventId: string
		eventName: string
		eventDate?: string
		surveyId: string
		surveyName: string
		accessibleAt?: string
		isAccessible: boolean
		completed?: boolean
	}> = []

	// Get user's existing responses
	const responsesSnapshot = await adminDb
		.collection('responses')
		.where('userId', '==', user.uid)
		.get()

	const userResponses = new Map<string, Set<string>>()
	for (const doc of responsesSnapshot.docs) {
		const data = doc.data()
		const key = data.eventId
		if (!userResponses.has(key)) {
			userResponses.set(key, new Set())
		}
		userResponses.get(key)?.add(data.surveyType)
	}

	for (const eventDoc of eventsSnapshot.docs) {
		const eventData = eventDoc.data()
		const eventId = eventDoc.id
		const eventName = eventData.name || 'Unnamed Event'
		const startDate = eventData.startDate?.toDate?.() ?? new Date(eventData.startDate)
		const endDate = eventData.endDate?.toDate?.() ?? new Date(eventData.endDate)
		const completedSurveys = userResponses.get(eventId) || new Set()

		// Pre-survey (accessible before event starts)
		const preSurveyEnabled = eventData.preSurveyEnabled ?? true
		if (preSurveyEnabled) {
			const hasPreResponse = completedSurveys.has('pre')
			const isAccessible = now < startDate && !hasPreResponse
			surveys.push({
				eventId,
				eventName,
				eventDate: startDate.toISOString(),
				surveyId: `${eventId}-pre`,
				surveyName: 'Pre-Event Survey',
				accessibleAt: startDate.toISOString(),
				isAccessible,
				completed: hasPreResponse
			})
		}

		// Post-survey (accessible after event ends)
		const postSurveyEnabled = eventData.postSurveyEnabled ?? true
		if (postSurveyEnabled) {
			const hasPostResponse = completedSurveys.has('post')
			const isAccessible = now > endDate && !hasPostResponse
			surveys.push({
				eventId,
				eventName,
				eventDate: endDate.toISOString(),
				surveyId: `${eventId}-post`,
				surveyName: 'Post-Event Survey',
				accessibleAt: endDate.toISOString(),
				isAccessible,
				completed: hasPostResponse
			})
		}
	}

	return {surveys}
})

/**
 * Get survey template by ID
 * The surveyId format is `{eventId}-{pre|post}`
 */
export const getSurveyById = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => getSurveyByIdSchema.parse(d))
	.handler(async ({data}) => {
		const {surveyId} = data

		// Parse surveyId format: eventId-surveyType
		const lastDashIndex = surveyId.lastIndexOf('-')
		if (lastDashIndex === -1) {
			throw new NotFoundError('Invalid survey ID format')
		}

		const eventId = surveyId.substring(0, lastDashIndex)
		const surveyType = surveyId.substring(lastDashIndex + 1)

		if (surveyType !== 'pre' && surveyType !== 'post') {
			throw new NotFoundError('Invalid survey type')
		}

		// Get event to find associated survey template
		const eventDoc = await adminDb.collection('events').doc(eventId).get()
		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()
		const templateId = eventData?.surveyTemplateId

		// If event has a specific template, use it; otherwise find default
		let templateDoc: FirebaseFirestore.DocumentSnapshot | undefined
		if (templateId) {
			templateDoc = await adminDb.collection('formTemplates').doc(templateId).get()
		}

		if (!templateDoc?.exists) {
			// Fall back to default survey template
			const defaultSnapshot = await adminDb
				.collection('formTemplates')
				.where('type', '==', 'survey')
				.where('isActive', '==', true)
				.limit(1)
				.get()

			if (defaultSnapshot.empty) {
				throw new NotFoundError('No survey template found')
			}
			templateDoc = defaultSnapshot.docs[0]
		}

		const templateData = templateDoc.data()
		if (!templateData) {
			throw new NotFoundError('Survey template data not found')
		}

		return {
			name: `${surveyType === 'pre' ? 'Pre' : 'Post'}-Event Survey`,
			questions: templateData.questions || [],
			surveyJson: templateData.surveyJson
		}
	})

/**
 * Submit user response (from survey form)
 * Accepts surveyId format and converts to eventId/surveyType
 */
export const submitUserResponse = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => submitUserResponseSchema.parse(d))
	.handler(async ({data}) => {
		const user = await requireConsent()

		const {surveyId, responses} = data

		// Parse surveyId format: eventId-surveyType
		const lastDashIndex = surveyId.lastIndexOf('-')
		if (lastDashIndex === -1) {
			throw new NotFoundError('Invalid survey ID format')
		}

		const eventId = surveyId.substring(0, lastDashIndex)
		const surveyType = surveyId.substring(lastDashIndex + 1) as 'pre' | 'post'

		if (surveyType !== 'pre' && surveyType !== 'post') {
			throw new NotFoundError('Invalid survey type')
		}

		// Check if user is registered for event
		const eventDoc = await adminDb.collection('events').doc(eventId).get()
		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()
		const participants = eventData?.participants || []

		if (!participants.includes(user.uid)) {
			throw new ConflictError('User not registered for this event')
		}

		// Check if response already exists
		const existingResponse = await adminDb
			.collection('responses')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventId)
			.where('surveyType', '==', surveyType)
			.limit(1)
			.get()

		if (!existingResponse.empty) {
			throw new ConflictError(`${surveyType} survey response already submitted`)
		}

		// Convert array format to record format
		const responsesRecord: Record<string, string> = {}
		for (const r of responses) {
			responsesRecord[r.questionId] = r.responseText
		}

		// Create response document
		const responseData = {
			userId: user.uid,
			eventId,
			surveyType,
			responses: responsesRecord,
			submittedAt: new Date(),
			createdAt: new Date()
		}

		const responseRef = await adminDb.collection('responses').add(responseData)

		return {
			success: true,
			id: responseRef.id
		}
	})
