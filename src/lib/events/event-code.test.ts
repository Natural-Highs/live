/**
 * Unit tests for event code generation
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import {generateUniqueEventCode} from './event-code'

describe('Event Code Generation', () => {
	describe('generateUniqueEventCode', () => {
		it('should generate a 4-digit string', () => {
			const code = generateUniqueEventCode()
			expect(code).toMatch(/^\d{4}$/)
		})

		it('should generate codes within valid range (1000-9999)', () => {
			const code = generateUniqueEventCode()
			const codeNum = Number.parseInt(code, 10)
			expect(codeNum).toBeGreaterThanOrEqual(1000)
			expect(codeNum).toBeLessThanOrEqual(9999)
		})

		it('should generate different codes on multiple calls (statistical test)', () => {
			const codes = new Set()
			for (let i = 0; i < 100; i++) {
				codes.add(generateUniqueEventCode())
			}
			// With 100 calls, we should get at least some unique codes
			// (though collisions are possible, probability is very low)
			expect(codes.size).toBeGreaterThan(1)
		})

		it('should always return a string', () => {
			const code = generateUniqueEventCode()
			expect(typeof code).toBe('string')
		})

		it('should generate codes that can be parsed as integers', () => {
			const code = generateUniqueEventCode()
			const parsed = Number.parseInt(code, 10)
			expect(Number.isInteger(parsed)).toBe(true)
			expect(parsed.toString()).toBe(code)
		})
	})
})
