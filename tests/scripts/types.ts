/**
 * Shared Type Definitions for Test Scripts
 *
 * Provides type-safe interfaces for all test script data structures.
 * Never uses `any` - all types are explicitly defined for maximum type safety.
 * Types are descriptive and productive, balancing specificity with practicality.
 */

export interface ApiResponseData {
  readonly [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | ApiResponseData
    | readonly ApiResponseData[];
}

export interface RequestPayload {
  readonly [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | RequestPayload
    | readonly RequestPayload[];
}

export interface TestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly actualStatusCode?: number;
  readonly expectedStatusCode?: number;
  readonly errorMessage?: string;
  readonly responseData?: ApiResponseData;
}

export interface UserCredentials {
  readonly idToken: string;
  readonly userId: string;
}

export interface RegistrationResponse {
  readonly success: boolean;
  readonly uid?: string;
  readonly error?: string;
  readonly message?: string;
}

export interface FirebaseAuthSignInResponse {
  readonly idToken: string;
  readonly localId: string;
  readonly email?: string;
  readonly refreshToken?: string;
  readonly expiresIn?: string;
}

export interface FirebaseAuthErrorResponse {
  readonly error?: {
    readonly message?: string;
    readonly code?: string;
  };
  readonly message?: string;
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
