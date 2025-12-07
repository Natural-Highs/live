import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'
import {useAuth} from '../context/AuthContext'

export const Route = createFileRoute('/_admin')({
	component: AdminLayout
})

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
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
