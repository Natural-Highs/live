// Stub types for migration - will be properly defined in server functions task
export interface EventDocument {
	id?: string
	name?: string
	eventCode?: string
	startDate?: Date | string
	endDate?: Date | string
	createdAt?: Date | string
	updatedAt?: Date | string
	isPublic?: boolean
	isActive?: boolean
	maxParticipants?: number
	currentParticipants?: number
	// TanStack Start requires {} instead of unknown for index signatures
	[key: string]: {} | undefined
}
