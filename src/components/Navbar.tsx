import {Link} from '@tanstack/react-router'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {logoutFn} from '@/server/functions/auth'
import {useAuth} from '../context/AuthContext'
import {SessionExpirationWarning} from './session/SessionExpirationWarning'

const Navbar: React.FC = () => {
	const {user, admin} = useAuth()

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
				{user ? (
					<>
						<SessionExpirationWarning />
						{admin && (
							<Link to='/admin-dashboard'>
								<Button variant='ghost'>Admin</Button>
							</Link>
						)}
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
