/**
 * Type definitions for form-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface GuestUserDocument {
  readonly uid: string;
  readonly isGuest: boolean;
  readonly [key: string]: unknown;
}

export interface UserDocument {
  readonly uid: string;
  readonly email?: string;
  readonly isGuest?: boolean;
  readonly isAdmin?: boolean;
  readonly signedConsentForm?: boolean;
  readonly dateOfBirth?: FirebaseFirestore.Timestamp | string;
  readonly [key: string]: unknown;
}

export interface ConsentFormSubmissionRequest {
  readonly guestId?: string;
}

export interface ConsentFormSubmissionResponse {
  readonly success: boolean;
  readonly consentCompletedAt?: Date;
  readonly isGuest?: boolean;
  readonly error?: string;
}

export interface DemographicsFormSubmissionRequest {
  readonly responses: readonly DemographicsFormResponse[];
}

export interface DemographicsFormResponse {
  readonly [key: string]: string | number | boolean;
}

export interface FormTemplateType {
  readonly type: 'consent' | 'demographics' | 'survey';
}

export interface AgeCategory {
  readonly ageCategory: 'under18' | 'adult' | 'senior';
}
