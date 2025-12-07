import {createFileRoute, Outlet} from '@tanstack/react-router'
import {useAuth} from '../context/AuthContext'

export const Route = createFileRoute('/_admin')({
	component: AdminLayout
})

function AdminLayout() {
	const {user, loading, admin} = useAuth()

	// Client-side guard
	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-lg'>Loading...</div>
			</div>
		)
	}

	if (!user) {
		// This shouldn't happen because of beforeLoad, but good to have as fallback
		window.location.href = '/authentication'
		return null
	}

	if (!admin) {
		// Non-admin users get redirected to dashboard
		window.location.href = '/'
		return null
	}

	return <Outlet />
}
