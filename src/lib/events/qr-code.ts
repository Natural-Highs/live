/**
 * Extracts a 4-digit event code from QR code content.
 * Supports multiple formats:
 * - Direct code: "1234"
 * - URL with path: "https://app.naturalhighs.org/c/1234"
 * - URL with query param: "https://example.com?code=1234"
 * - Deep link: "naturalhighs://checkin/1234"
 *
 * @param text - The raw text decoded from a QR code
 * @returns The 4-digit event code, or null if not found
 */
export function extractEventCode(text: string): string | null {
	if (!text || typeof text !== 'string') {
		return null
	}

	const trimmed = text.trim()

	// Direct 4-digit code
	if (/^\d{4}$/.test(trimmed)) {
		return trimmed
	}

	// Try URL parsing first for well-formed URLs
	try {
		const url = new URL(trimmed)

		// Check for code query parameter
		const codeParam = url.searchParams.get('code')
		if (codeParam && /^\d{4}$/.test(codeParam)) {
			return codeParam
		}

		// Check for code in pathname (e.g., /c/1234 or /checkin/1234)
		const pathMatch = url.pathname.match(/\/(\d{4})$/)
		if (pathMatch) {
			return pathMatch[1]
		}

		// If URL parsing succeeded but no code found via URL patterns,
		// still try pattern matching on the original text (handles edge cases
		// like "codes: 1111" which parses as URL with scheme "codes")
		const fallbackMatch = trimmed.match(/(?<!\d)(\d{4})(?!\d)/)
		if (fallbackMatch) {
			return fallbackMatch[1]
		}

		return null
	} catch {
		// Not a URL, try pattern matching
		// Match standalone 4-digit codes (not part of longer numbers)
		const match = trimmed.match(/(?<!\d)(\d{4})(?!\d)/)
		if (match) {
			return match[1]
		}
	}

	return null
}
