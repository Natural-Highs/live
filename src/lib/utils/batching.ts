/**
 * Utility functions for batching operations, particularly for Firestore queries
 */

/**
 * Split an array into batches of a specified size
 * @param items - Array of items to batch
 * @param batchSize - Size of each batch
 * @returns Array of batches
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
	if (items.length === 0) {
		return []
	}

	const batches: T[][] = []
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize))
	}
	return batches
}

/**
 * Firestore 'in' operator has a limit of 10 items per query
 */
export const FIRESTORE_IN_OPERATOR_LIMIT = 10
