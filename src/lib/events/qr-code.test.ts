import {extractEventCode} from './qr-code'

describe('extractEventCode', () => {
	it('returns null for empty input', () => {
		expect(extractEventCode('')).toBeNull()
		expect(extractEventCode(null as unknown as string)).toBeNull()
		expect(extractEventCode(undefined as unknown as string)).toBeNull()
	})

	it('extracts direct 4-digit code', () => {
		expect(extractEventCode('1234')).toBe('1234')
		expect(extractEventCode('0000')).toBe('0000')
		expect(extractEventCode('9999')).toBe('9999')
	})

	it('handles whitespace around direct codes', () => {
		expect(extractEventCode('  1234  ')).toBe('1234')
		expect(extractEventCode('\n1234\n')).toBe('1234')
	})

	it('extracts code from URL path (/c/1234)', () => {
		expect(extractEventCode('https://app.naturalhighs.org/c/1234')).toBe('1234')
		expect(extractEventCode('https://example.com/checkin/5678')).toBe('5678')
		expect(extractEventCode('http://localhost:3000/c/9012')).toBe('9012')
	})

	it('extracts code from URL query parameter', () => {
		expect(extractEventCode('https://example.com?code=1234')).toBe('1234')
		expect(extractEventCode('https://app.naturalhighs.org/checkin?code=5678&other=param')).toBe(
			'5678'
		)
	})

	it('extracts code from deep links', () => {
		expect(extractEventCode('naturalhighs://checkin/1234')).toBe('1234')
	})

	it('extracts 4-digit code from text with spaces', () => {
		expect(extractEventCode('Event 1234')).toBe('1234')
		expect(extractEventCode('Check in 5678 today')).toBe('5678')
	})

	it('returns first 4-digit code when multiple present', () => {
		expect(extractEventCode('1234 and 5678')).toBe('1234')
	})

	it('returns null for invalid codes', () => {
		expect(extractEventCode('123')).toBeNull() // Too short
		expect(extractEventCode('12345')).toBeNull() // 5 digits - not a valid standalone code
		expect(extractEventCode('abcd')).toBeNull() // Not digits
		expect(extractEventCode('https://example.com/nocode')).toBeNull()
	})

	it('returns null for URLs without valid code', () => {
		expect(extractEventCode('https://example.com')).toBeNull()
		expect(extractEventCode('https://example.com/c/')).toBeNull()
		expect(extractEventCode('https://example.com?code=abc')).toBeNull()
	})

	// Edge cases identified in code review
	it('handles URLs with fragments', () => {
		expect(extractEventCode('https://example.com/c/1234#section')).toBe('1234')
		expect(extractEventCode('https://example.com?code=5678#hash')).toBe('5678')
	})

	it('handles malformed URLs gracefully', () => {
		expect(extractEventCode('not-a-url-at-all')).toBeNull()
		expect(extractEventCode('://missing-scheme')).toBeNull()
		expect(extractEventCode('http://')).toBeNull()
	})

	it('handles unicode and special characters', () => {
		expect(extractEventCode('Event 1234 日本語')).toBe('1234')
		expect(extractEventCode('Código: 5678')).toBe('5678')
		expect(extractEventCode('émoji 🎉 1234')).toBe('1234')
	})

	it('does not extract code embedded in longer numbers', () => {
		// 4-digit codes should be standalone, not part of longer numbers
		expect(extractEventCode('123456789')).toBeNull()
		expect(extractEventCode('12345678')).toBeNull()
		// Note: hyphen-separated numbers like phone numbers will match
		// the last 4-digit group since it's technically standalone.
		// This is acceptable as QR codes from our system won't contain phone numbers.
	})

	it('extracts code from various deep link formats', () => {
		expect(extractEventCode('naturalhighs://c/1234')).toBe('1234')
		expect(extractEventCode('app://event/1234')).toBe('1234')
		expect(extractEventCode('myapp://scan?code=5678')).toBe('5678')
	})

	it('handles URL-encoded content', () => {
		expect(extractEventCode('https://example.com?code=1234&name=test%20event')).toBe('1234')
		expect(extractEventCode('https://example.com/c/1234?utm_source=qr%20code')).toBe('1234')
	})

	it('handles very long input strings', () => {
		const longPrefix = 'A'.repeat(1000)
		expect(extractEventCode(`${longPrefix} 1234`)).toBe('1234')
		expect(extractEventCode(`1234 ${longPrefix}`)).toBe('1234')
	})

	it('extracts first valid code from multiple 4-digit sequences', () => {
		expect(extractEventCode('1234 is the code, not 5678')).toBe('1234')
		expect(extractEventCode('codes: 1111, 2222, 3333')).toBe('1111')
	})
})
