/**
 * Utility functions for data validation
 */

/**
 * Validate that a value is a non-array object
 * Used for validating form responses and other object data
 *
 * @param value - Value to validate
 * @returns True if value is a non-array object, false otherwise
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate that passwords match
 *
 * @param password - Password value
 * @param confirmPassword - Confirmation password value
 * @returns True if passwords match, false otherwise
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Validate that required fields are present and non-empty
 *
 * @param fields - Object containing fields to validate
 * @param requiredFields - Array of field names that are required
 * @returns True if all required fields are present and non-empty, false otherwise
 */
/**
 * Validate that required fields are present and non-empty
 *
 * @param fields - Object containing fields to validate
 * @param requiredFields - Array of field names that are required
 * @returns True if all required fields are present and non-empty, false otherwise
 */
export function hasRequiredFields(
  fields: Record<string, unknown> | { [key: string]: unknown },
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => {
    const value = fields[field];
    return value !== undefined && value !== null && value !== '';
  });
}
