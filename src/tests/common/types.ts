/**
 * Shared Test Types
 *
 * Common type definitions used by both E2E and integration test fixtures.
 * This module eliminates the layer violation where integration imports from E2E.
 */

/**
 * Test user document data structure.
 * Matches the fields expected by getFullProfileFn.
 */
export interface TestUserDocument {
	uid: string
	email: string
	displayName: string
	dateOfBirth?: string
	isMinor?: boolean
	profileComplete?: boolean
	profileVersion?: number
	signedConsentForm?: boolean
	consentSignedAt?: Date
	createdAt?: Date
	updatedAt?: Date
	// Demographics for adults (stored on main doc)
	pronouns?: string | null
	gender?: string | null
	raceEthnicity?: string[] | null
	emergencyContactName?: string | null
	emergencyContactPhone?: string | null
	emergencyContactEmail?: string | null
	dietaryRestrictions?: string[] | null
	medicalConditions?: string | null
}

/**
 * Minor demographics data structure.
 * Stored in users/{uid}/private/demographics subcollection.
 */
export interface MinorDemographicsData {
	pronouns?: string | null
	gender?: string | null
	raceEthnicity?: string[] | null
	emergencyContactName?: string | null
	emergencyContactPhone?: string | null
	emergencyContactEmail?: string | null
	dietaryRestrictions?: string[] | null
	medicalConditions?: string | null
	updatedAt?: Date
}

/**
 * Test event document data structure.
 * Matches the fields expected by event server functions.
 */
export interface TestEventDocument {
	id: string
	name: string
	eventCode: string
	eventTypeId?: string
	eventDate?: Date
	startDate?: Date
	endDate?: Date
	location?: string
	isActive?: boolean
	activatedAt?: Date
	collectAdditionalDemographics?: boolean
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Test guest document data structure.
 * Matches the fields expected by guest server functions.
 */
export interface TestGuestDocument {
	id?: string
	firstName: string
	lastName: string
	email?: string | null
	phone?: string | null
	eventId: string
	consentSignedAt?: Date
	consentSignature?: string
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Test guest event (check-in) document data structure.
 * Links guest to event with registration timestamp.
 */
export interface TestGuestEventDocument {
	id?: string
	guestId: string
	eventId: string
	registeredAt?: Date
	createdAt?: Date
}
