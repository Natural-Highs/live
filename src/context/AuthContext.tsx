import {useRouterState} from '@tanstack/react-router'
import {getIdTokenResult, onAuthStateChanged, type User} from 'firebase/auth'
import type React from 'react'
import {createContext, type ReactNode, useContext, useEffect, useRef, useState} from 'react'
import {auth} from '@/lib/firebase/firebase.app'
import {
	checkGracePeriodSync,
	type GracePeriodState,
	recordValidAuth
} from '@/lib/session/grace-period'
import type {SessionAuthContext} from '@/routes/__root'
import type {AuthContextUserData} from './types/authContext'

interface AuthContextType {
	user: User | null
	loading: boolean
	consentForm: boolean
	admin: boolean
	/** Whether user is a minor (under 18). Used for privacy-aware demographics storage. */
	isMinor: boolean
	data: AuthContextUserData
	/** Grace period state for auth service outages */
	gracePeriod: GracePeriodState
}

const defaultGracePeriodState: GracePeriodState = {
	isInGracePeriod: false,
	gracePeriodEndsAt: null,
	authServiceAvailable: true,
	minutesRemaining: 0
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	consentForm: false,
	admin: false,
	isMinor: false,
	data: {},
	gracePeriod: defaultGracePeriodState
})

export const useAuth = () => useContext(AuthContext)

/**
 * Hook that provides auth state from router context (SSR-first).
 * Use this in components that only need basic auth checks.
 * Falls back to default unauthenticated state if router context unavailable.
 */
export function useRouterAuth(): SessionAuthContext {
	const routerState = useRouterState()
	const context = routerState.matches?.[0]?.context as unknown as
		| {auth?: SessionAuthContext}
		| undefined

	return (
		context?.auth ?? {
			user: null,
			isAuthenticated: false,
			hasConsent: false,
			hasProfile: false,
			isAdmin: false,
			hasPasskey: false,
			isSessionExpiring: false,
			sessionExpiresAt: null
		}
	)
}

interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
	// Get initial state from router context if available (SSR)
	const routerAuth = useRouterAuth()

	const [authState, setAuthState] = useState<AuthContextType>(() => ({
		user: null,
		// Start as not loading if we have router auth data (SSR case)
		loading: !routerAuth.isAuthenticated && routerAuth.user === null,
		consentForm: routerAuth.hasConsent,
		admin: routerAuth.isAdmin,
		isMinor: false,
		data: {},
		gracePeriod: defaultGracePeriodState
	}))
	const hasResolved = useRef(false)
	const [mounted, setMounted] = useState(false)
	const [authServiceAvailable, setAuthServiceAvailable] = useState(true)

	// Sync with router auth context changes
	useEffect(() => {
		if (routerAuth.isAuthenticated) {
			setAuthState(prev => ({
				...prev,
				loading: false,
				consentForm: routerAuth.hasConsent,
				admin: routerAuth.isAdmin
			}))
		}
	}, [routerAuth.isAuthenticated, routerAuth.hasConsent, routerAuth.isAdmin])

	// First effect: mark as mounted (client-side only)
	useEffect(() => {
		setMounted(true)
	}, [])

	// Grace period check effect - runs when auth service availability changes
	useEffect(() => {
		if (!mounted) {
			return
		}

		const gracePeriodState = checkGracePeriodSync(authServiceAvailable)
		setAuthState(prev => ({
			...prev,
			gracePeriod: gracePeriodState
		}))
	}, [mounted, authServiceAvailable])

	// Second effect: handle auth (only runs after mounted)
	useEffect(() => {
		if (!mounted) {
			return
		}

		// SSR-safe: Skip auth subscription if auth is not initialized
		if (!auth) {
			setAuthState(prev => ({...prev, loading: false}))
			return
		}

		// Timeout fallback: if auth doesn't resolve within 3s, assume no user
		const timeoutId = setTimeout(() => {
			if (!hasResolved.current) {
				setAuthState(prev => ({...prev, loading: false}))
			}
		}, 3000)

		const unsubscribe = onAuthStateChanged(
			auth,
			async user => {
				hasResolved.current = true
				clearTimeout(timeoutId)
				setAuthServiceAvailable(true)

				let claims = {
					signedConsentForm: false,
					admin: false
				}

				if (user) {
					try {
						await user.getIdToken(true)
						const idTokenResult = await getIdTokenResult(user)
						claims = idTokenResult.claims as typeof claims
						// Record successful auth for grace period tracking
						recordValidAuth()
					} catch {
						// Token refresh failed - auth service may be unavailable
						setAuthServiceAvailable(false)
					}
				}

				setAuthState(prev => ({
					...prev,
					user,
					loading: false,
					consentForm: claims?.signedConsentForm,
					admin: claims?.admin,
					data: {}
				}))
			},
			_error => {
				// Auth state change error - service may be unavailable
				hasResolved.current = true
				clearTimeout(timeoutId)
				setAuthServiceAvailable(false)
				setAuthState(prev => ({...prev, loading: false}))
			}
		)

		return () => {
			clearTimeout(timeoutId)
			unsubscribe()
		}
	}, [mounted])

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}
