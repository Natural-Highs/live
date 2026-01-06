/**
 * Form Template Server Functions
 *
 * Provides server functions for retrieving form templates.
 * These are public endpoints that don't require admin access.
 *
 * @module server/functions/forms
 */

import {createServerFn} from '@tanstack/react-start'
import {adminDb} from '@/lib/firebase/firebase.admin'

interface FormQuestion {
	id?: string
	text?: string
	type?: string
	required?: boolean
	options?: string[]
	placeholder?: string
}

// JSON-serializable value type for SurveyJS JSON
type JsonValue = string | number | boolean | null | JsonValue[] | {[key: string]: JsonValue}

interface FormTemplate {
	id: string
	type: 'consent' | 'demographics' | 'survey' | 'facilitator-training' | 'feedback'
	name: string
	description?: string
	questions?: FormQuestion[]
	surveyJson?: {[key: string]: JsonValue}
	isActive?: boolean
	ageCategory?: 'under18' | 'adult' | 'senior'
	createdAt?: string
}

/**
 * Get active consent form template
 * Public endpoint - no auth required
 */
export const getConsentFormTemplate = createServerFn({method: 'GET'}).handler(
	async (): Promise<FormTemplate | null> => {
		const snapshot = await adminDb
			.collection('formTemplates')
			.where('type', '==', 'consent')
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (snapshot.empty) {
			return null
		}

		const doc = snapshot.docs[0]
		const data = doc.data()

		return {
			id: doc.id,
			type: data.type,
			name: data.name,
			description: data.description,
			questions: data.questions,
			surveyJson: data.surveyJson,
			isActive: data.isActive,
			createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
		}
	}
)

/**
 * Get active demographics form template
 * Returns template based on user's age category if available
 * Public endpoint - no auth required (for guest flow)
 */
export const getDemographicsFormTemplate = createServerFn({method: 'GET'}).handler(
	async (): Promise<{template: FormTemplate | null; ageCategory?: string}> => {
		const snapshot = await adminDb
			.collection('formTemplates')
			.where('type', '==', 'demographics')
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (snapshot.empty) {
			return {template: null}
		}

		const doc = snapshot.docs[0]
		const data = doc.data()

		return {
			template: {
				id: doc.id,
				type: data.type,
				name: data.name,
				description: data.description,
				questions: data.questions,
				surveyJson: data.surveyJson,
				isActive: data.isActive,
				ageCategory: data.ageCategory,
				createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
			},
			ageCategory: data.ageCategory
		}
	}
)
