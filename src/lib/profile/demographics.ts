/**
 * Demographics Field Registry
 *
 * Defines available demographics fields for event check-in forms.
 *
 * @module lib/profile/demographics
 */

/**
 * Supported field types for demographics.
 */
export type FieldType = 'text' | 'select' | 'multiselect' | 'group' | 'tel' | 'email'

/**
 * Base interface for demographic fields.
 */
export interface DemographicFieldBase {
	id: string
	label: string
	description?: string
	type: FieldType
	required?: boolean
	/** If true, stored in private subcollection for ALL users */
	sensitive?: boolean
	/** If true, allows custom text input in addition to predefined options */
	allowCustom?: boolean
	/** Predefined options for select/multiselect fields */
	options?: readonly string[]
}

/**
 * Group field interface for composite fields like emergency contact.
 */
export interface GroupField extends Omit<DemographicFieldBase, 'type'> {
	type: 'group'
	fields: Record<string, Omit<DemographicFieldBase, 'id'> & {required?: boolean}>
	/** Custom validation rule name */
	validation?: string
}

export type DemographicField = DemographicFieldBase | GroupField

/**
 * Demographics Field Registry
 *
 * Add new demographics here - they become available for:
 * 1. Admin event type configuration
 * 2. User profile settings
 * 3. Check-in prompts when event requires them
 * 4. Appropriate storage based on sensitivity
 */
export const DEMOGRAPHIC_FIELDS = {
	pronouns: {
		id: 'pronouns',
		label: 'Pronouns',
		description: 'How should we address you?',
		type: 'select' as const,
		options: ['he/him', 'she/her', 'they/them', 'prefer not to say'] as const,
		allowCustom: true
	},

	gender: {
		id: 'gender',
		label: 'Gender',
		description: 'How do you identify?',
		type: 'select' as const,
		options: ['male', 'female', 'non-binary', 'genderqueer', 'prefer not to say'] as const,
		allowCustom: true,
		sensitive: true
	},

	raceEthnicity: {
		id: 'raceEthnicity',
		label: 'Race/Ethnicity',
		description: 'Select all that apply',
		type: 'multiselect' as const,
		options: [
			'American Indian or Alaska Native',
			'Asian',
			'Black or African American',
			'Hispanic or Latino',
			'Native Hawaiian or Other Pacific Islander',
			'White',
			'Two or more races',
			'Prefer not to say'
		] as const,
		allowCustom: true,
		sensitive: true
	},

	emergencyContact: {
		id: 'emergencyContact',
		label: 'Emergency Contact',
		description: 'Someone we can reach in case of emergency',
		type: 'group' as const,
		fields: {
			name: {label: 'Contact Name', type: 'text' as const, required: true},
			phone: {label: 'Phone', type: 'tel' as const, required: false},
			email: {label: 'Email', type: 'email' as const, required: false}
		},
		validation: 'phoneOrEmail'
	},

	dietaryRestrictions: {
		id: 'dietaryRestrictions',
		label: 'Dietary Restrictions',
		description: 'Any food allergies or dietary needs?',
		type: 'multiselect' as const,
		options: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut allergy', 'none'] as const,
		allowCustom: true
	},

	medicalConditions: {
		id: 'medicalConditions',
		label: 'Medical Conditions',
		description: 'Anything event staff should be aware of?',
		type: 'text' as const,
		sensitive: true
	}
} as const satisfies Record<string, DemographicField>

export type DemographicFieldId = keyof typeof DEMOGRAPHIC_FIELDS

/**
 * Get a field definition by ID.
 *
 * @param id - Field ID from DEMOGRAPHIC_FIELDS
 * @returns Field definition
 */
export function getFieldById(id: DemographicFieldId): DemographicField {
	return DEMOGRAPHIC_FIELDS[id]
}

/**
 * Get all field IDs that are marked as sensitive.
 * Sensitive fields are stored in private subcollection for minors.
 *
 * @returns Array of sensitive field IDs
 */
export function getSensitiveFields(): DemographicFieldId[] {
	return (Object.entries(DEMOGRAPHIC_FIELDS) as [DemographicFieldId, DemographicField][])
		.filter(([_, field]) => 'sensitive' in field && field.sensitive)
		.map(([id]) => id)
}

/**
 * Get all field IDs.
 *
 * @returns Array of all demographic field IDs
 */
export function getAllFieldIds(): DemographicFieldId[] {
	return Object.keys(DEMOGRAPHIC_FIELDS) as DemographicFieldId[]
}

/**
 * Check if a field is a group field.
 *
 * @param field - Field definition to check
 * @returns true if field is a group field
 */
export function isGroupField(field: DemographicField): field is GroupField {
	return field.type === 'group'
}

/**
 * Get fields that are missing from a user's demographics.
 *
 * @param requiredFields - Field IDs required by event type
 * @param userDemographics - User's current demographics data
 * @returns Array of missing field IDs
 */
export function getMissingFields(
	requiredFields: DemographicFieldId[],
	userDemographics: Record<string, unknown>
): DemographicFieldId[] {
	return requiredFields.filter(fieldId => {
		// Special handling for emergency contact (group field)
		if (fieldId === 'emergencyContact') {
			const name = userDemographics.emergencyContactName
			if (!name || (typeof name === 'string' && name.trim() === '')) {
				return true
			}
			return false
		}

		const value = userDemographics[fieldId]
		if (value === undefined || value === null || value === '') {
			return true
		}
		if (Array.isArray(value) && value.length === 0) {
			return true
		}
		return false
	})
}
