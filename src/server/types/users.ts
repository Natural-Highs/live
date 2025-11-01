/**
 * Type definitions for user-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface UserDocumentData {
  readonly uid: string;
  readonly email?: string;
  readonly username?: string;
  readonly isAdmin?: boolean;
  readonly isGuest?: boolean;
  readonly signedConsentForm?: boolean;
  readonly consentFormCompletedAt?: FirebaseFirestore.Timestamp | Date;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly dateOfBirth?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly emergencyContactRelationship?: string;
  readonly profileCompleted?: boolean;
  readonly profileUpdatedAt?: FirebaseFirestore.Timestamp | Date;
  readonly demographicsFormCompleted?: boolean;
  readonly demographicsFormCompletedAt?: FirebaseFirestore.Timestamp | Date;
  readonly demographicsResponses?: readonly unknown[];
  readonly createdAt?: FirebaseFirestore.Timestamp | Date;
  readonly [key: string]: unknown;
}

export interface UserDocument extends UserDocumentData {
  readonly id: string;
}

export interface UserWithCustomClaims extends UserDocumentData {
  readonly isAdmin: boolean;
  readonly signedConsentForm: boolean;
}

export interface EventCodeSubmissionRequest {
  readonly eventCode: string;
}

export interface EventCodeSubmissionResponse {
  readonly success: boolean;
  readonly message?: string;
  readonly eventId?: string;
  readonly eventName?: string;
  readonly error?: string;
}

export interface UserProfileUpdateRequest {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly dateOfBirth?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactPhone?: string;
  readonly emergencyContactRelationship?: string;
}
