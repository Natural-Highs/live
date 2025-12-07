/**
 * Unit tests for event template resolution business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */
import {
	type EventTypeData,
	type ProvidedTemplates,
	resolveEventTemplates
} from './template-resolution'

describe('Template Resolution', () => {
	describe('resolveEventTemplates', () => {
		it('should use provided templates when available', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: 'default-consent',
				defaultDemographicsFormTemplateId: 'default-demographics',
				defaultSurveyTemplateId: 'default-survey'
			}
			const providedTemplates: ProvidedTemplates = {
				consentFormTemplateId: 'provided-consent',
				demographicsFormTemplateId: 'provided-demographics',
				surveyTemplateId: 'provided-survey'
			}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			expect(result.consentFormTemplateId).toBe('provided-consent')
			expect(result.demographicsFormTemplateId).toBe('provided-demographics')
			expect(result.surveyTemplateId).toBe('provided-survey')
		})

		it('should fall back to event type defaults when not provided', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: 'default-consent',
				defaultDemographicsFormTemplateId: 'default-demographics',
				defaultSurveyTemplateId: 'default-survey'
			}
			const providedTemplates: ProvidedTemplates = {}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			expect(result.consentFormTemplateId).toBe('default-consent')
			expect(result.demographicsFormTemplateId).toBe('default-demographics')
			expect(result.surveyTemplateId).toBe('default-survey')
		})

		it('should mix provided and default templates', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: 'default-consent',
				defaultDemographicsFormTemplateId: 'default-demographics',
				defaultSurveyTemplateId: 'default-survey'
			}
			const providedTemplates: ProvidedTemplates = {
				consentFormTemplateId: 'provided-consent'
				// demographics and survey not provided
			}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			expect(result.consentFormTemplateId).toBe('provided-consent')
			expect(result.demographicsFormTemplateId).toBe('default-demographics')
			expect(result.surveyTemplateId).toBe('default-survey')
		})

		it('should return null when no defaults and not provided', () => {
			const eventTypeData: EventTypeData = {}
			const providedTemplates: ProvidedTemplates = {}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			expect(result.consentFormTemplateId).toBeNull()
			expect(result.demographicsFormTemplateId).toBeNull()
			expect(result.surveyTemplateId).toBeNull()
		})

		it('should handle null in provided templates', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: 'default-consent'
			}
			const providedTemplates: ProvidedTemplates = {
				consentFormTemplateId: null
			}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			// null in provided should use default
			expect(result.consentFormTemplateId).toBe('default-consent')
		})

		it('should handle null in event type defaults', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: null,
				defaultDemographicsFormTemplateId: null,
				defaultSurveyTemplateId: null
			}
			const providedTemplates: ProvidedTemplates = {}

			const result = resolveEventTemplates(eventTypeData, providedTemplates)

			expect(result.consentFormTemplateId).toBeNull()
			expect(result.demographicsFormTemplateId).toBeNull()
			expect(result.surveyTemplateId).toBeNull()
		})

		it('should handle null/undefined event type data', () => {
			const providedTemplates: ProvidedTemplates = {
				consentFormTemplateId: 'provided-consent'
			}

			const result1 = resolveEventTemplates(null, providedTemplates)
			expect(result1.consentFormTemplateId).toBe('provided-consent')
			expect(result1.demographicsFormTemplateId).toBeNull()
			expect(result1.surveyTemplateId).toBeNull()

			const result2 = resolveEventTemplates(undefined, providedTemplates)
			expect(result2.consentFormTemplateId).toBe('provided-consent')
			expect(result2.demographicsFormTemplateId).toBeNull()
			expect(result2.surveyTemplateId).toBeNull()
		})

		it('should handle empty provided templates object', () => {
			const eventTypeData: EventTypeData = {
				defaultConsentFormTemplateId: 'default-consent'
			}

			const result = resolveEventTemplates(eventTypeData, {})

			expect(result.consentFormTemplateId).toBe('default-consent')
		})
	})
})
