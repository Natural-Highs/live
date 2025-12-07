/**
 * Utility functions to convert between Firestore form templates and SurveyJS JSON format
 */

import type {SurveyJSJson} from '@/components/forms/SurveyRenderer'

export interface FormQuestion {
	id?: string
	text?: string
	type?: 'text' | 'paragraph' | 'checkbox' | 'radio' | 'heading' | 'info'
	required?: boolean
	options?: readonly string[]
	placeholder?: string
	allowOther?: boolean
	[key: string]: unknown
}

export interface FormTemplate {
	id: string
	name: string
	type?:
		| 'consent'
		| 'demographics'
		| 'survey'
		| 'facilitator-training'
		| 'feedback'
	description?: string
	questions?: readonly FormQuestion[]
	surveyJson?: SurveyJSJson
	isActive?: boolean
	ageCategory?: 'under18' | 'adult' | 'senior'
	[key: string]: unknown
}

/**
 * Convert Firestore form template to SurveyJS JSON format
 *
 * This function converts a Firestore form template (with questions array or surveyJson)
 * into SurveyJS-compatible JSON format. If the template already has surveyJson, it returns
 * that directly. Otherwise, it converts the questions array into SurveyJS elements.
 *
 * @param template - The Firestore form template to convert
 * @returns SurveyJS JSON object with pages and elements
 *
 * @example
 * ```typescript
 * const template = {
 *   name: "Consent Form",
 *   questions: [
 *     { id: "q1", text: "Do you consent?", type: "checkbox", options: ["Yes", "No"] }
 *   ]
 * };
 * const surveyJson = convertTemplateToSurveyJS(template);
 * ```
 */
export function convertTemplateToSurveyJS(
	template: FormTemplate
): SurveyJSJson {
	if (template.surveyJson) {
		return template.surveyJson
	}

	// Convert questions array to SurveyJS elements
	const elements = (template.questions || []).map(question => {
		const questionId =
			question.id || `question-${Math.random().toString(36).substr(2, 9)}`
		const questionType = question.type || 'text'

		// Handle non-input question types
		if (questionType === 'heading') {
			return {
				type: 'html',
				name: questionId,
				html: `<h3 style="font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1e1e1e;">${
					question.text || ''
				}</h3>`
			}
		}

		if (questionType === 'info' || questionType === 'paragraph') {
			return {
				type: 'html',
				name: questionId,
				html: `<p style="color: #1e1e1e; opacity: 0.7; margin-bottom: 1rem;">${
					question.text || ''
				}</p>`
			}
		}

		// Handle checkbox questions
		if (questionType === 'checkbox' && question.options) {
			return {
				type: 'checkbox',
				name: questionId,
				title: question.text || '',
				isRequired: question.required,
				choices: question.options,
				hasOther: question.allowOther,
				otherText: 'Other:'
			}
		}

		// Handle radio questions
		if (questionType === 'radio' && question.options) {
			return {
				type: 'radiogroup',
				name: questionId,
				title: question.text || '',
				isRequired: question.required,
				choices: question.options,
				hasOther: question.allowOther,
				otherText: 'Other:'
			}
		}

		// Handle text inputs
		if (questionType === 'text') {
			const isEmail = question.text?.toLowerCase().includes('email')
			return {
				type: 'text',
				name: questionId,
				title: question.text || '',
				isRequired: question.required,
				placeholder: question.placeholder,
				inputType: isEmail ? 'email' : 'text',
				validators: isEmail ? [{type: 'email'}] : undefined
			}
		}

		// Default: paragraph/textarea
		return {
			type: 'comment',
			name: questionId,
			title: question.text || '',
			isRequired: question.required,
			placeholder: question.placeholder,
			rows: 4
		}
	})

	return {
		title: template.name,
		description: template.description,
		pages: [
			{
				elements
			}
		],
		showProgressBar: 'bottom'
	}
}

/**
 * Convert SurveyJS JSON to Firestore form template format
 *
 * This is the reverse conversion of convertTemplateToSurveyJS. It extracts questions
 * from SurveyJS pages and converts them back to the Firestore template format.
 * Used primarily for admin editing workflows where forms are edited in SurveyJS Creator
 * and need to be saved back to Firestore.
 *
 * @param surveyJson - The SurveyJS JSON object to convert
 * @param existingTemplate - Optional existing template to merge with (preserves metadata like id, type, etc.)
 * @returns Partial form template object with extracted questions and surveyJson
 *
 * @example
 * ```typescript
 * const surveyJson = {
 *   title: "My Form",
 *   pages: [{ elements: [{ type: "text", name: "q1", title: "Name?" }] }]
 * };
 * const template = convertSurveyJSToTemplate(surveyJson, { id: "template-123", type: "survey" });
 * ```
 */
export function convertSurveyJSToTemplate(
	surveyJson: SurveyJSJson,
	existingTemplate?: Partial<FormTemplate>
): Partial<FormTemplate> {
	const questions: FormQuestion[] = []

	// Extract questions from SurveyJS pages
	surveyJson.pages?.forEach(page => {
		page.elements?.forEach(element => {
			const elementType = element.type as string
			const elementName = element.name as string
			const elementTitle = element.title as string
			const isRequired = element.isRequired as boolean | undefined
			const choices = element.choices as string[] | undefined
			const hasOther = element.hasOther as boolean | undefined

			// Handle HTML elements (heading, info, paragraph)
			if (elementType === 'html') {
				const html = element.html as string
				if (html.includes('<h3')) {
					questions.push({
						id: elementName,
						text: elementTitle || html.replace(/<[^>]*>/g, ''),
						type: 'heading'
					})
				} else {
					questions.push({
						id: elementName,
						text: elementTitle || html.replace(/<[^>]*>/g, ''),
						type: 'info'
					})
				}
			}
			// Handle checkbox
			else if (elementType === 'checkbox') {
				questions.push({
					id: elementName,
					text: elementTitle,
					type: 'checkbox',
					required: isRequired,
					options: choices,
					allowOther: hasOther
				})
			}
			// Handle radio/radiogroup
			else if (elementType === 'radiogroup') {
				questions.push({
					id: elementName,
					text: elementTitle,
					type: 'radio',
					required: isRequired,
					options: choices,
					allowOther: hasOther
				})
			}
			// Handle text inputs
			else if (elementType === 'text') {
				questions.push({
					id: elementName,
					text: elementTitle,
					type: 'text',
					required: isRequired,
					placeholder: element.placeholder as string | undefined
				})
				// inputType is used for email detection but not stored in template
			}
			// Handle comment/textarea
			else if (elementType === 'comment') {
				questions.push({
					id: elementName,
					text: elementTitle,
					type: 'paragraph',
					required: isRequired,
					placeholder: element.placeholder as string | undefined
				})
			}
		})
	})

	return {
		...existingTemplate,
		name: surveyJson.title || existingTemplate?.name || 'Untitled Form',
		description: surveyJson.description || existingTemplate?.description,
		questions,
		surveyJson
	}
}
