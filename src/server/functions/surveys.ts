import {createServerFn} from '@tanstack/react-start'
import {db} from '../../lib/firebase/firebase'
import {
	getAccessibleSurveysSchema,
	getSurveyQuestionsSchema,
	submitResponseSchema
} from '../schemas/surveys'
import {ConflictError, NotFoundError} from './utils/errors'
import {requireConsent, validateSession} from './utils/auth'

/**
 * Submit survey response
 * Requires consent form to be signed
 */
export const submitResponse = createServerFn({method: 'POST'})
	.validator(submitResponseSchema)
	.handler(async ({data}) => {
		const user = await requireConsent()

		const {eventId, surveyType, responses} = data

		// Check if user is registered for event
		const eventDoc = await db.collection('events').doc(eventId).get()

		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()
		const participants = eventData?.participants || []

		if (!participants.includes(user.uid)) {
			throw new ConflictError('User not registered for this event')
		}

		// Check if response already exists
		const existingResponse = await db
			.collection('responses')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventId)
			.where('surveyType', '==', surveyType)
			.limit(1)
			.get()

		if (!existingResponse.empty) {
			throw new ConflictError(
				`${surveyType} survey response already submitted`
			)
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

		const responseRef = await db.collection('responses').add(responseData)

		return {
			id: responseRef.id,
			...responseData,
			submittedAt: responseData.submittedAt.toISOString(),
			createdAt: responseData.createdAt.toISOString()
		}
	})

/**
 * Get survey questions template
 * Public endpoint - no auth required
 */
export const getSurveyQuestions = createServerFn({method: 'GET'})
	.validator(getSurveyQuestionsSchema)
	.handler(async ({data}) => {
		const {surveyType} = data

		const snapshot = await db
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
	.validator(getAccessibleSurveysSchema)
	.handler(async ({data}) => {
		const user = await validateSession()

		const {eventId} = data

		// Get event data
		const eventDoc = await db.collection('events').doc(eventId).get()

		if (!eventDoc.exists) {
			throw new NotFoundError('Event not found')
		}

		const eventData = eventDoc.data()!
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
		const responsesSnapshot = await db
			.collection('responses')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventId)
			.get()

		const hasPreResponse = responsesSnapshot.docs.some(
			(doc) => doc.data().surveyType === 'pre'
		)
		const hasPostResponse = responsesSnapshot.docs.some(
			(doc) => doc.data().surveyType === 'post'
		)

		// Pre-survey: accessible before event starts (unless already submitted)
		const preSurveyEnabled = eventData.preSurveyEnabled ?? true
		const preSurveyAccessible =
			preSurveyEnabled && now < startDate && !hasPreResponse

		// Post-survey: accessible after event ends (unless already submitted)
		const postSurveyEnabled = eventData.postSurveyEnabled ?? true
		const postSurveyAccessible =
			postSurveyEnabled && now > endDate && !hasPostResponse

		return {
			preSurveyAccessible,
			postSurveyAccessible,
			hasPreResponse,
			hasPostResponse,
			eventStarted: now >= startDate,
			eventEnded: now >= endDate
		}
	})
