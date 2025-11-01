/**
 * Type definitions for authentication-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface UserRegistrationRequest {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface UserRegistrationResponse {
  readonly success: boolean;
  readonly uid?: string;
  readonly message?: string;
  readonly error?: string;
}

export interface UserSessionLoginRequest {
  readonly idToken: string;
}

export interface UserSessionLoginResponse {
  readonly success: boolean;
  readonly user?: {
    readonly uid: string;
    readonly email?: string;
    readonly admin: boolean;
    readonly signedConsentForm: boolean;
  };
  readonly error?: string;
}

export interface UserWithClaims {
  readonly isAdmin?: boolean;
  readonly signedConsentForm?: boolean;
}

export interface UserLoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface UserLoginResponse {
  readonly success: boolean;
  readonly message?: string;
  readonly userId?: string;
  readonly error?: string;
}
