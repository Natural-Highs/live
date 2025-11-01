/**
 * Type definitions for Firestore update data structures
 * Replaces generic Record types with descriptive, type-safe interfaces
 */

export interface EventTypeUpdateData {
  updatedAt: Date;
  updatedBy: string | undefined;
  name?: string;
  defaultConsentFormTemplateId?: string;
  defaultDemographicsFormTemplateId?: string;
  defaultSurveyTemplateId?: string | null;
}

export interface FormTemplateUpdateData {
  updatedAt: Date;
  updatedBy: string | undefined;
  name?: string;
  questions?: unknown;
  version?: number;
}

export interface UserProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  profileCompleted: boolean;
  profileUpdatedAt: Date;
}
