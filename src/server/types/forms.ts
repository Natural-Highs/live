// Stub types for migration - will be properly defined in server functions task
export interface GuestUserDocument {
	id?: string
	email?: string
	displayName?: string
	createdAt?: Date | string
	updatedAt?: Date | string
	consentSigned?: boolean
	[key: string]: unknown
}
