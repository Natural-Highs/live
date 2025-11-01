/**
 * Type definitions for guest-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface GuestCodeValidationRequest {
  readonly eventCode: string;
}

export interface GuestCodeValidationResponse {
  readonly success: boolean;
  readonly eventName?: string;
  readonly eventDate?: Date;
  readonly error?: string;
}

export interface GuestRegistrationRequest {
  readonly email?: string;
  readonly phone?: string;
  readonly eventCode: string;
  readonly name: string;
}

export interface GuestRegistrationResponse {
  readonly success: boolean;
  readonly guestId?: string;
  readonly requiresConsentForm?: boolean;
  readonly error?: string;
}
