import {Navigate, useLocation} from '@tanstack/react-router'
import type React from 'react'
import {useAuth} from '../context/AuthContext'

interface ProtectedRouteProps {
	children: React.ReactNode
	requireConsentForm?: boolean
	requireAdmin?: boolean
}

/**
 * ProtectedRoute component for React Router
 * Replicates the logic from hooks.server.ts
 *
 * Protection rules:
 * - Protected routes: ["/dashboard", "/", "/admin", "/consent"]
 * - If not authenticated and accessing protected route → redirect to /authentication
 * - If authenticated but no consent form and on protected route (except /consent) → redirect to /consent
 * - If authenticated with consent form and on /consent → redirect to /dashboard
 * - If authenticated with consent form and on /authentication → redirect to /dashboard
 * - If requireAdmin and not admin → redirect to /dashboard
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
	children,
	requireConsentForm = false,
	requireAdmin = false
}) => {
	const {user, loading, consentForm, admin} = useAuth()
	const location = useLocation()

	/*
  const SKIP_AUTH = true;
  if (SKIP_AUTH) {
    return <>{children}</>;
  }
  */

	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-lg'>Loading...</div>
			</div>
		)
	}

	const protectedRoutes = ['/dashboard', '/', '/admin', '/consent']

	if (!user) {
		return <Navigate replace={true} to='/authentication' />
	}

	if (consentForm) {
		if (location.pathname === '/consent') {
			return <Navigate replace={true} to='/dashboard' />
		}

		if (location.pathname === '/authentication') {
			return <Navigate replace={true} to='/dashboard' />
		}

		if (requireAdmin && !admin) {
			return <Navigate replace={true} to='/dashboard' />
		}

		return <>{children}</>
	}

	if (location.pathname === '/consent') {
		return <>{children}</>
	}

	if (protectedRoutes.includes(location.pathname) || requireConsentForm) {
		return <Navigate replace={true} to='/consent' />
	}

	if (requireAdmin && !admin) {
		return <Navigate replace={true} to='/dashboard' />
	}

	return <>{children}</>
}

export default ProtectedRoute
