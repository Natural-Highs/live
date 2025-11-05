/**
 * Type definitions for event type-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface EventTypeCreationRequest {
  readonly name: string;
  readonly defaultConsentFormTemplateId: string;
  readonly defaultDemographicsFormTemplateId: string;
  readonly defaultSurveyTemplateId?: string | null;
}

export interface EventTypeUpdateRequest {
  readonly name?: string;
  readonly defaultConsentFormTemplateId?: string;
  readonly defaultDemographicsFormTemplateId?: string;
  readonly defaultSurveyTemplateId?: string | null;
}
