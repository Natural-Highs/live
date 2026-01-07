/**
 * Event document type for server functions
 * All fields are optional with appropriate types for serialization
 */
export interface EventDocument {
	id?: string
	name?: string
	eventCode?: string
	code?: string | null
	eventTypeId?: string
	eventDate?: Date | string
	startDate?: Date | string
	endDate?: Date | string
	location?: string
	consentFormTemplateId?: string
	demographicsFormTemplateId?: string
	surveyTemplateId?: string | null
	collectAdditionalDemographics?: boolean
	isPublic?: boolean
	isActive?: boolean
	activatedAt?: Date | string | null
	surveyAccessibleAt?: Date | string | null
	surveyAccessibleOverride?: boolean
	maxParticipants?: number
	currentParticipants?: number
	participants?: string[]
	createdAt?: Date | string
	updatedAt?: Date | string
}
