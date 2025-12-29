import {createFileRoute, Outlet, redirect} from '@tanstack/react-router'
import Navbar from '@/components/Navbar'

/**
 * Admin layout route.
 *
 * All routes under `_authed/_admin/` require admin privileges.
 * This layout:
 * - Inherits authentication from parent `_authed` layout
 * - Checks admin claim and redirects non-admins to /dashboard
 * - Provides admin-specific layout with navbar
 */
export const Route = createFileRoute('/_authed/_admin')({
	beforeLoad: async ({context}) => {
		const {isAdmin} = context.auth

		// Redirect non-admins to dashboard
		if (!isAdmin) {
			throw redirect({to: '/dashboard'})
		}
	},
	component: AdminLayout
})

function AdminLayout() {
	return (
		<div className='min-h-screen bg-background'>
			<Navbar />
			<main>
				<Outlet />
			</main>
		</div>
	)
}
