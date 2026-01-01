// Firestore Timestamp-like object interface
interface FirestoreTimestamp {
	toDate(): Date
}

// Stub types for migration - will be properly defined in server functions task
export interface EventDocument {
	id?: string
	name?: string
	eventCode?: string
	startDate?: Date | string | FirestoreTimestamp
	endDate?: Date | string | FirestoreTimestamp
	createdAt?: Date | string | FirestoreTimestamp
	updatedAt?: Date | string | FirestoreTimestamp
	isPublic?: boolean
	isActive?: boolean
	maxParticipants?: number
	currentParticipants?: number
	// biome-ignore lint/complexity/noBannedTypes: TanStack Start requires {} for index signatures in serializable types
	[key: string]: {} | undefined
}
