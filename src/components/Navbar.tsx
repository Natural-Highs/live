import {Link} from '@tanstack/react-router'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {useAuth} from '../context/AuthContext'

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
						{admin && (
							<Link to='/admin-dashboard'>
								<Button variant='ghost'>Admin</Button>
							</Link>
						)}
						<Link to='/dashboard'>
							<Button variant='ghost'>Dashboard</Button>
						</Link>
						<Button variant='ghost' type='button'>
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
