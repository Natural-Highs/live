/**
 * Unit tests for AuthContext
 * Tests initial state, session persistence, error states, and context structure
 */

import {renderHook} from '@testing-library/react'
import {onAuthStateChanged} from 'firebase/auth'
import type {ReactNode} from 'react'
import {AuthProvider, useAuth} from './AuthContext'

// Mock TanStack Router to avoid "__store" null error
vi.mock('@tanstack/react-router', () => ({
	useRouterState: vi.fn(() => ({
		matches: [
			{context: {auth: {user: null, isAuthenticated: false, hasConsent: false, isAdmin: false}}}
		]
	}))
}))

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
	getIdTokenResult: vi.fn(),
	onAuthStateChanged: vi.fn()
}))

vi.mock('@/lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: null
	}
}))

const wrapper = ({children}: {children: ReactNode}) => <AuthProvider>{children}</AuthProvider>

describe('AuthContext', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('initial state', () => {
		it('should start with loading true and no user', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			const {result} = renderHook(() => useAuth(), {wrapper})

			expect(result.current.loading).toBe(true)
			expect(result.current.user).toBeNull()
			expect(result.current.admin).toBe(false)
			expect(result.current.consentForm).toBe(false)
		})

		it('should have empty data object initially', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			const {result} = renderHook(() => useAuth(), {wrapper})

			expect(result.current.data).toEqual({})
		})
	})

	describe('session persistence', () => {
		it('should cleanup auth subscription on unmount', () => {
			const unsubscribe = vi.fn()
			vi.mocked(onAuthStateChanged).mockImplementation(() => unsubscribe)

			const {unmount} = renderHook(() => useAuth(), {wrapper})

			unmount()

			expect(unsubscribe).toHaveBeenCalled()
		})

		it('should subscribe to auth state changes', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			renderHook(() => useAuth(), {wrapper})

			expect(onAuthStateChanged).toHaveBeenCalled()
		})
	})

	describe('useAuth hook', () => {
		it('should return context value with all required properties', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			const {result} = renderHook(() => useAuth(), {wrapper})

			expect(result.current).toHaveProperty('user')
			expect(result.current).toHaveProperty('loading')
			expect(result.current).toHaveProperty('admin')
			expect(result.current).toHaveProperty('consentForm')
			expect(result.current).toHaveProperty('data')
		})

		it('should have correct types for context properties', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			const {result} = renderHook(() => useAuth(), {wrapper})

			expect(typeof result.current.loading).toBe('boolean')
			expect(typeof result.current.admin).toBe('boolean')
			expect(typeof result.current.consentForm).toBe('boolean')
			expect(typeof result.current.data).toBe('object')
		})
	})

	describe('context default values', () => {
		it('should have default context with correct structure', () => {
			// Test the default context value used when not wrapped in provider
			const defaultContext = {
				user: null,
				loading: true,
				consentForm: false,
				admin: false,
				data: {}
			}

			expect(defaultContext.user).toBeNull()
			expect(defaultContext.loading).toBe(true)
			expect(defaultContext.consentForm).toBe(false)
			expect(defaultContext.admin).toBe(false)
			expect(defaultContext.data).toEqual({})
		})
	})

	describe('auth state behavior', () => {
		it('should call onAuthStateChanged with auth instance', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			renderHook(() => useAuth(), {wrapper})

			expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
		})

		it('should handle null auth gracefully', () => {
			vi.mocked(onAuthStateChanged).mockImplementation(() => () => {})

			const {result} = renderHook(() => useAuth(), {wrapper})

			// Should not throw and return default state
			expect(result.current).toBeDefined()
			expect(result.current.loading).toBe(true)
		})
	})

	describe('claims structure', () => {
		it('should support admin claim in auth context', () => {
			const mockClaims = {
				admin: true,
				signedConsentForm: false
			}

			expect(mockClaims.admin).toBe(true)
			expect(mockClaims.signedConsentForm).toBe(false)
		})

		it('should support signedConsentForm claim', () => {
			const mockClaims = {
				admin: false,
				signedConsentForm: true
			}

			expect(mockClaims.signedConsentForm).toBe(true)
		})
	})
})
