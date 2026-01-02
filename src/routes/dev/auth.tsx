/**
 * Dev Auth Route
 *
 * Quick authentication bypass for local development.
 * Only available when emulators are running (USE_EMULATORS=true).
 * Returns 404 in production.
 */

import {createFileRoute, notFound, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {devLoginFn, isDevAuthAvailableFn} from '@/server/functions/dev-auth'

export const Route = createFileRoute('/dev/auth')({
	beforeLoad: async () => {
		const {available} = await isDevAuthAvailableFn()
		if (!available) {
			throw notFound()
		}
	},
	component: DevAuthPage
})

function DevAuthPage() {
	const navigate = useNavigate()
	const [loading, setLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleLogin = async (role: 'admin' | 'user' | 'guest') => {
		setLoading(role)
		setError(null)

		try {
			const result = await devLoginFn({data: {role}})
			if (result.success && result.redirectTo) {
				// Validate redirectTo is a safe internal path
				const allowedPaths = ['/', '/dashboard', '/admin', '/check-in']
				const isValidPath = allowedPaths.some(path => result.redirectTo === path)

				if (isValidPath) {
					navigate({to: result.redirectTo as '/'})
				} else {
					// Fallback to safe default
					navigate({to: '/'})
				}
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Login failed')
		} finally {
			setLoading(null)
		}
	}

	return (
		<div className='flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-100 p-4'>
			<div className='w-full max-w-md rounded-lg bg-white p-8 shadow-lg'>
				<div className='mb-6 text-center'>
					<h1 className='text-2xl font-bold text-gray-900' data-testid='dev-auth-heading'>
						Dev Auth
					</h1>
					<p className='mt-2 text-sm text-gray-600' data-testid='dev-auth-description'>
						Quick login for local development
					</p>
					<div
						className='mt-2 rounded bg-yellow-100 p-2 text-xs text-yellow-800'
						data-testid='dev-auth-emulator-note'
					>
						Only available with emulators
					</div>
				</div>

				{error && <div className='mb-4 rounded bg-red-100 p-3 text-sm text-red-700'>{error}</div>}

				<div className='flex flex-col gap-3'>
					<Button
						onClick={() => handleLogin('admin')}
						disabled={loading !== null}
						className='w-full bg-purple-600 hover:bg-purple-700'
						data-testid='btn-login-admin'
					>
						{loading === 'admin' ? 'Logging in...' : 'Login as Admin'}
					</Button>

					<Button
						onClick={() => handleLogin('user')}
						disabled={loading !== null}
						className='w-full bg-blue-600 hover:bg-blue-700'
						data-testid='btn-login-user'
					>
						{loading === 'user' ? 'Logging in...' : 'Login as User'}
					</Button>

					<Button
						onClick={() => handleLogin('guest')}
						disabled={loading !== null}
						variant='outline'
						className='w-full'
						data-testid='btn-continue-guest'
					>
						{loading === 'guest' ? 'Redirecting...' : 'Continue as Guest'}
					</Button>
				</div>

				<div className='mt-6 border-t pt-4'>
					<h3 className='text-sm font-medium text-gray-700' data-testid='role-details'>
						Role Details
					</h3>
					<ul className='mt-2 space-y-1 text-xs text-gray-500'>
						<li data-testid='role-admin'>
							<strong>Admin:</strong> Full access, admin dashboard
						</li>
						<li data-testid='role-user'>
							<strong>User:</strong> Standard user, user dashboard
						</li>
						<li data-testid='role-guest'>
							<strong>Guest:</strong> Guest check-in flow
						</li>
					</ul>
				</div>
			</div>
		</div>
	)
}
