/**
 * Tests for demographics field registry
 */

import {
	DEMOGRAPHIC_FIELDS,
	type DemographicFieldId,
	getAllFieldIds,
	getFieldById,
	getMissingFields,
	getSensitiveFields,
	isGroupField
} from './demographics'

describe('demographics', () => {
	describe('DEMOGRAPHIC_FIELDS', () => {
		it('should have pronouns field', () => {
			expect(DEMOGRAPHIC_FIELDS.pronouns).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.pronouns.type).toBe('select')
			expect(DEMOGRAPHIC_FIELDS.pronouns.allowCustom).toBe(true)
		})

		it('should have gender field marked as sensitive', () => {
			expect(DEMOGRAPHIC_FIELDS.gender).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.gender.sensitive).toBe(true)
		})

		it('should have raceEthnicity field as multiselect', () => {
			expect(DEMOGRAPHIC_FIELDS.raceEthnicity).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.raceEthnicity.type).toBe('multiselect')
			expect(DEMOGRAPHIC_FIELDS.raceEthnicity.sensitive).toBe(true)
		})

		it('should have emergencyContact field as group', () => {
			expect(DEMOGRAPHIC_FIELDS.emergencyContact).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.emergencyContact.type).toBe('group')
		})

		it('should have dietaryRestrictions field', () => {
			expect(DEMOGRAPHIC_FIELDS.dietaryRestrictions).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.dietaryRestrictions.type).toBe('multiselect')
		})

		it('should have medicalConditions field marked as sensitive', () => {
			expect(DEMOGRAPHIC_FIELDS.medicalConditions).toBeDefined()
			expect(DEMOGRAPHIC_FIELDS.medicalConditions.sensitive).toBe(true)
		})
	})

	describe('getFieldById', () => {
		it('should return correct field definition', () => {
			const field = getFieldById('pronouns')
			expect(field.id).toBe('pronouns')
			expect(field.label).toBe('Pronouns')
		})

		it('should return group field with nested fields', () => {
			const field = getFieldById('emergencyContact')
			expect(field.type).toBe('group')
			if (field.type === 'group') {
				expect(field.fields.name).toBeDefined()
				expect(field.fields.phone).toBeDefined()
				expect(field.fields.email).toBeDefined()
			}
		})
	})

	describe('getSensitiveFields', () => {
		it('should return all sensitive field IDs', () => {
			const sensitiveFields = getSensitiveFields()

			expect(sensitiveFields).toContain('gender')
			expect(sensitiveFields).toContain('raceEthnicity')
			expect(sensitiveFields).toContain('medicalConditions')
			expect(sensitiveFields).not.toContain('pronouns')
			expect(sensitiveFields).not.toContain('dietaryRestrictions')
		})

		it('should return 3 sensitive fields', () => {
			const sensitiveFields = getSensitiveFields()
			expect(sensitiveFields).toHaveLength(3)
		})
	})

	describe('getAllFieldIds', () => {
		it('should return all field IDs', () => {
			const allFields = getAllFieldIds()

			expect(allFields).toContain('pronouns')
			expect(allFields).toContain('gender')
			expect(allFields).toContain('raceEthnicity')
			expect(allFields).toContain('emergencyContact')
			expect(allFields).toContain('dietaryRestrictions')
			expect(allFields).toContain('medicalConditions')
		})

		it('should return 6 fields total', () => {
			const allFields = getAllFieldIds()
			expect(allFields).toHaveLength(6)
		})
	})

	describe('isGroupField', () => {
		it('should return true for group fields', () => {
			const field = getFieldById('emergencyContact')
			expect(isGroupField(field)).toBe(true)
		})

		it('should return false for non-group fields', () => {
			const field = getFieldById('pronouns')
			expect(isGroupField(field)).toBe(false)
		})
	})

	describe('getMissingFields', () => {
		it('should return all fields when user has no data', () => {
			const requiredFields: DemographicFieldId[] = ['pronouns', 'gender']
			const userDemographics = {}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('pronouns')
			expect(missing).toContain('gender')
			expect(missing).toHaveLength(2)
		})

		it('should return empty array when all required fields are present', () => {
			const requiredFields: DemographicFieldId[] = ['pronouns', 'gender']
			const userDemographics = {
				pronouns: 'they/them',
				gender: 'non-binary'
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toHaveLength(0)
		})

		it('should treat empty strings as missing', () => {
			const requiredFields: DemographicFieldId[] = ['pronouns']
			const userDemographics = {
				pronouns: ''
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('pronouns')
		})

		it('should treat null as missing', () => {
			const requiredFields: DemographicFieldId[] = ['gender']
			const userDemographics = {
				gender: null
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('gender')
		})

		it('should treat empty arrays as missing', () => {
			const requiredFields: DemographicFieldId[] = ['raceEthnicity']
			const userDemographics = {
				raceEthnicity: []
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('raceEthnicity')
		})

		it('should not report non-empty arrays as missing', () => {
			const requiredFields: DemographicFieldId[] = ['raceEthnicity']
			const userDemographics = {
				raceEthnicity: ['Asian', 'White']
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toHaveLength(0)
		})

		it('should check emergencyContactName for emergency contact field', () => {
			const requiredFields: DemographicFieldId[] = ['emergencyContact']
			const userDemographics = {
				emergencyContactName: 'John Doe',
				emergencyContactPhone: '555-1234'
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toHaveLength(0)
		})

		it('should report emergency contact as missing when name is empty', () => {
			const requiredFields: DemographicFieldId[] = ['emergencyContact']
			const userDemographics = {
				emergencyContactName: '',
				emergencyContactPhone: '555-1234'
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('emergencyContact')
		})

		it('should report emergency contact as missing when name is whitespace only', () => {
			const requiredFields: DemographicFieldId[] = ['emergencyContact']
			const userDemographics = {
				emergencyContactName: '   ',
				emergencyContactPhone: '555-1234'
			}

			const missing = getMissingFields(requiredFields, userDemographics)

			expect(missing).toContain('emergencyContact')
		})
	})
})
