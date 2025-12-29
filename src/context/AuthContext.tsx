import {getIdTokenResult, onAuthStateChanged, type User} from 'firebase/auth'
import type React from 'react'
import {createContext, type ReactNode, useContext, useEffect, useRef, useState} from 'react'
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

interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
	const [authState, setAuthState] = useState<AuthContextType>({
		user: null,
		loading: true,
		consentForm: false,
		admin: false,
		data: {}
	})
	const hasResolved = useRef(false)

	useEffect(() => {
		// SSR-safe: Skip auth subscription if auth is not initialized
		if (!auth) {
			setAuthState(prev => ({...prev, loading: false}))
			return
		}

		// Timeout fallback: if auth doesn't resolve within 5s, assume no user
		// This prevents infinite loading in CI/test environments where
		// Firebase might not connect properly
		const timeoutId = setTimeout(() => {
			if (!hasResolved.current) {
				setAuthState(prev => ({...prev, loading: false}))
			}
		}, 5000)

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
	}, [])

	return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}
