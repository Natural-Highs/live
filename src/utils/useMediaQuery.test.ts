import {act, renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useMediaQuery} from './useMediaQuery'

const MIN_WIDTH = 600

describe('useMediaQuery', () => {
	let listeners: Array<() => void> = []
	let currentMatches = false

	const createMatchMediaMock = (initialMatches: boolean) => {
		currentMatches = initialMatches
		listeners = []
		return vi.fn().mockImplementation((query: string) => ({
			get matches() {
				return currentMatches
			},
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: (_event: string, cb: () => void) => {
				listeners.push(cb)
			},
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	}

	beforeEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: createMatchMediaMock(false)
		})
	})

	it('returns false when media query does not match', () => {
		const {result} = renderHook(() => useMediaQuery(`(min-width: ${MIN_WIDTH}px)`))
		expect(result.current).toBeFalsy()
	})

	it('returns true when media query matches', () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: createMatchMediaMock(true)
		})

		const {result} = renderHook(() => useMediaQuery(`(min-width: ${MIN_WIDTH}px)`))
		expect(result.current).toBeTruthy()
	})

	it('updates when media query changes', () => {
		const {result} = renderHook(() => useMediaQuery(`(min-width: ${MIN_WIDTH}px)`))
		expect(result.current).toBeFalsy()

		// Update the matches value and trigger listeners
		act(() => {
			currentMatches = true
			for (const listener of listeners) {
				listener()
			}
		})

		expect(result.current).toBeTruthy()
	})
})
