import {Link} from '@tanstack/react-router'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {logoutFn} from '@/server/functions/auth'
import {useAuth} from '../context/AuthContext'
import {SessionExpirationWarning} from './session/SessionExpirationWarning'

const Navbar: React.FC = () => {
	const {user, admin, loading} = useAuth()
	// During loading, render as if logged out to prevent layout shift
	// Once loaded, correct state will render
	const effectiveUser = loading ? null : user
	const effectiveAdmin = loading ? false : admin

	return (
		<nav className='flex items-center justify-between bg-muted px-4 py-2'>
			<div className='flex-1'>
				<Link to='/'>
					<Button variant='ghost' className='text-xl'>
						Natural Highs
					</Button>
				</Link>
			</div>
			<div className='flex items-center gap-2'>
				{loading ? (
					<div className='h-9 w-16 animate-pulse rounded bg-muted-foreground/20' />
				) : effectiveUser ? (
					<>
						<SessionExpirationWarning />
						{effectiveAdmin && (
							<Link to='/admin-dashboard'>
								<Button variant='ghost'>Admin</Button>
							</Link>
						)}
						{/* Settings accessible to all authenticated users regardless of profileComplete status -
						    allows users to update profile before completing onboarding or at any time */}
						<Link to='/settings/profile'>
							<Button variant='ghost'>Settings</Button>
						</Link>
						<Link to='/dashboard'>
							<Button variant='ghost'>Dashboard</Button>
						</Link>
						<Button variant='ghost' type='button' onClick={() => logoutFn()}>
							Logout
						</Button>
					</>
				) : (
					<Link to='/authentication'>
						<Button variant='ghost'>Login</Button>
					</Link>
				)}
			</div>
		</nav>
	)
}

export default Navbar
