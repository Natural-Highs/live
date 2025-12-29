/**
 * Event template resolution business logic
 * Resolves template IDs from event type defaults when not explicitly provided
 */

export interface EventTypeData {
	defaultConsentFormTemplateId?: string | null
	defaultDemographicsFormTemplateId?: string | null
	defaultSurveyTemplateId?: string | null
}

export interface ProvidedTemplates {
	consentFormTemplateId?: string | null
	demographicsFormTemplateId?: string | null
	surveyTemplateId?: string | null
}

export interface ResolvedTemplates {
	consentFormTemplateId: string | null
	demographicsFormTemplateId: string | null
	surveyTemplateId: string | null
}

/**
 * Resolve event template IDs from event type defaults
 * Uses provided templates if available, otherwise falls back to event type defaults
 *
 * @param eventTypeData - Event type data containing default template IDs
 * @param providedTemplates - Optional explicitly provided template IDs
 * @returns Resolved template IDs (provided templates take precedence over defaults)
 */
export function resolveEventTemplates(
	eventTypeData: EventTypeData | null | undefined,
	providedTemplates: ProvidedTemplates = {}
): ResolvedTemplates {
	const {consentFormTemplateId, demographicsFormTemplateId, surveyTemplateId} =
		providedTemplates

	return {
		consentFormTemplateId:
			consentFormTemplateId ??
			eventTypeData?.defaultConsentFormTemplateId ??
			null,
		demographicsFormTemplateId:
			demographicsFormTemplateId ??
			eventTypeData?.defaultDemographicsFormTemplateId ??
			null,
		surveyTemplateId:
			surveyTemplateId ?? eventTypeData?.defaultSurveyTemplateId ?? null
	}
}
