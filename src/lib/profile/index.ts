/**
 * Profile Module Exports
 *
 * @module lib/profile
 */

export {
	DEMOGRAPHIC_FIELDS,
	type DemographicField,
	type DemographicFieldBase,
	type DemographicFieldId,
	type FieldType,
	type GroupField,
	getAllFieldIds,
	getFieldById,
	getMissingFields,
	getSensitiveFields,
	isGroupField
} from './demographics'
export {
	calculateAge,
	calculateIsMinor,
	isValidDateOfBirth,
	MINOR_AGE_THRESHOLD
} from './minor-detection'
