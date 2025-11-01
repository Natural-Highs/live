/**
 * Type definitions for event-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface EventCreationRequest {
  readonly name: string;
  readonly eventTypeId: string;
  readonly eventDate: string;
  readonly consentFormTemplateId?: string;
  readonly demographicsFormTemplateId?: string;
  readonly surveyTemplateId?: string | null;
}

export interface EventTypeData {
  readonly name?: string;
  readonly defaultConsentFormTemplateId?: string;
  readonly defaultDemographicsFormTemplateId?: string;
  readonly defaultSurveyTemplateId?: string | null;
}

export interface EventDocumentData {
  readonly name: string;
  readonly eventTypeId: string;
  readonly eventDate: FirebaseFirestore.Timestamp | Date;
  readonly consentFormTemplateId: string;
  readonly demographicsFormTemplateId: string;
  readonly surveyTemplateId: string | null;
  readonly isActive: boolean;
  readonly code: string | null;
  readonly activatedAt: FirebaseFirestore.Timestamp | Date | null;
  readonly surveyAccessibleAt: FirebaseFirestore.Timestamp | Date | null;
  readonly surveyAccessibleOverride: boolean;
  readonly createdAt: FirebaseFirestore.Timestamp | Date;
  readonly createdBy: string | undefined;
}

export interface EventDocument extends EventDocumentData {
  readonly id: string;
}
