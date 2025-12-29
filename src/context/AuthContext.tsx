import {useRouterState} from '@tanstack/react-router'
import {getIdTokenResult, onAuthStateChanged, type User} from 'firebase/auth'
import type React from 'react'
import {createContext, type ReactNode, useContext, useEffect, useRef, useState} from 'react'
import type {SessionAuthContext} from '@/routes/__root'
import {auth} from '$lib/firebase/firebase.app'
import type {AuthContextUserData} from './types/authContext'

interface AuthContextType {
	user: User | null
	loading: boolean
	consentForm: boolean
	admin: boolean
	data: AuthContextUserData
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	consentForm: false,
	admin: false,
	data: {}
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
			isAdmin: false,
			hasPasskey: false
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
		data: {}
	}))
	const hasResolved = useRef(false)
	const [mounted, setMounted] = useState(false)

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

	// Second effect: handle auth (only runs after mounted)
	useEffect(() => {
		if (!mounted) return

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

		const unsubscribe = onAuthStateChanged(auth, async user => {
			hasResolved.current = true
			clearTimeout(timeoutId)

			let claims = {
				signedConsentForm: false,
				admin: false
			}

			if (user) {
				await user.getIdToken(true)
				const idTokenResult = await getIdTokenResult(user)
				claims = idTokenResult.claims as typeof claims
			}

			setAuthState({
				user,
				loading: false,
				consentForm: claims?.signedConsentForm,
				admin: claims?.admin,
				data: {}
			})
		})

		return () => {
			clearTimeout(timeoutId)
			unsubscribe()
		}
	}, [mounted])

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}
